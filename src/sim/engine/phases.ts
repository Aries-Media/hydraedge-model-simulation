import type { D, LevelRule, SimulationParams } from "../types";
import {
  BROKER_MARGIN_FACTOR,
  REAL_PHASE_PROFIT_RATIO,
  RATIO_MARGIN_INJECT,
  toDec
} from "../constants";
import { Challenge } from "../contracts";
import { makePicker } from "../lib/levels";
import { calculateBurnSL } from "../lib/risk";
import { pickOutcome, type TradeOutcomeStrategy } from "../strategies/outcome";
import {
  logTrade,
  finalizeLost,
  finalizeWon,
} from "../logging";
import type { ChallengeLog } from "@/types/tradeHistory";

export type EvaluationStepResult =
  | { kind: "continue"; state: EvalState }
  | { kind: "lost"; state: EvalState; reason: "single_stop" | "max_drawdown" }
  | { kind: "won"; state: EvalState };

export interface EvalConfig {
  challenge: Challenge;
  start: D;
  commissionPerTrade: D;
  tradeLots: D;
  brokerSeed: D;
  payout: D;
  maxDrawdownRatio: D;
  singleTradeStopRatio: D; // daily loss
  profitTargetRatio: D;
  burnWonChallenges: boolean;
  tradeOutcomeStrategy: TradeOutcomeStrategy;
  strategy?: string; // custom strategy preset like "new4"
  levels: LevelRule[];
  realLevels: LevelRule[];
  shouldTrackHistory: boolean;
}

export interface EvalState {
  // Running counters
  tradesLeft: number;
  totalTradeNumber: number;
  realTrades: number;

  // Balances
  propBalance: D;
  brokerBalance: D;

  // Costs & metrics
  commissionCost: D;
  clientTotalLots: D;

  // Flags
  challengeOngoing: boolean;
  marginMoved: boolean;
  previousTradeOutcome: "SL" | "TP" | null;
  sequentialTPs: number;

  // Aggregates for customer & prop
  propProfit: D;
  customerProfit: D;
  refundsCost: D;
  payoutsCost: D;
  reimburseBrokerLossCost: D;
  extractedBrokerProfit: D;

  // Logging
  currentChallenge?: ChallengeLog;
}

export function evaluationStep(state: EvalState, cfg: EvalConfig): EvaluationStepResult {
  const {
    challenge,
    start: START,
    commissionPerTrade: COMMISSION,
    tradeLots: TRADE_LOTS,
    brokerSeed: BROKER_SEED,
    payout: PAYOUT,
    maxDrawdownRatio: MAX_DRAWDOWN_RATIO,
    singleTradeStopRatio: SINGLE_TRADE_STOP_RATIO,
    profitTargetRatio: PROFIT_TARGET_RATIO,
    burnWonChallenges,
    tradeOutcomeStrategy,
    levels,
  } = cfg;

  // generate trade
  state.tradesLeft--;
  state.totalTradeNumber++;

  const pickLevels = makePicker(levels);
  let { sl, tp } = pickLevels(state.propBalance);

  // burn-after-sl: escalate SL on immediate next trade
  if (tradeOutcomeStrategy === "burn_after_sl" && state.previousTradeOutcome === "SL") {
    sl = calculateBurnSL(state.propBalance, START, MAX_DRAWDOWN_RATIO);
  }

  const coeff = challenge.brokerCoeff(state.propBalance, START) 
  const outcome = pickOutcome(sl, tp, tradeOutcomeStrategy);

  let brokerPL = toDec(0);
  let singleStopHit = false;

  const balanceBefore = state.propBalance;
  const brokerBalanceBefore = state.brokerBalance;

  if (outcome === "SL") {
    state.propBalance = state.propBalance.minus(sl);
    brokerPL = sl.times(coeff);
    if (sl.gt(START.times(SINGLE_TRADE_STOP_RATIO))) singleStopHit = true;
  } else {
    state.propBalance = state.propBalance.plus(tp);
    brokerPL = tp.times(coeff).neg();
  }

  state.brokerBalance = state.brokerBalance.plus(brokerPL).minus(COMMISSION);
  state.commissionCost = state.commissionCost.plus(COMMISSION);
  state.clientTotalLots = state.clientTotalLots.plus(TRADE_LOTS).times(coeff);

  // TP streak logic for "new4"
  if (outcome === "TP") state.sequentialTPs++;
  else state.sequentialTPs = 0;
  state.previousTradeOutcome = outcome;

  // margin injection
  const marginMovedThisTrade =
    !state.marginMoved && state.propBalance.gte(START.times(RATIO_MARGIN_INJECT));
  if (marginMovedThisTrade) {
    const BROKER_BONUS = cfg.brokerSeed.times(BROKER_MARGIN_FACTOR);
    state.brokerBalance = state.brokerBalance.plus(BROKER_BONUS);
    state.marginMoved = true;
  }

  // log trade
  logTrade({
    challenge: state.currentChallenge,
    tradeNumber: state.totalTradeNumber,
    phase: "evaluation",
    balanceBefore,
    balanceAfter: state.propBalance,
    sl,
    tp,
    outcome,
    brokerPL,
    brokerBalanceBefore,
    brokerBalanceAfter: state.brokerBalance,
    commission: COMMISSION,
    lots: TRADE_LOTS,
    singleStopHit,
    marginMoved: marginMovedThisTrade,
  });

  // lifetime checks
  const drawdownHit = state.propBalance.lt(
    START.times(toDec(1).minus(MAX_DRAWDOWN_RATIO)),
  );
  const profitTargetHit = state.propBalance.gte(
    START.times(toDec(1).plus(PROFIT_TARGET_RATIO)),
  );

  if (singleStopHit || drawdownHit) {
    // challenge lost
    if (state.brokerBalance.gt(BROKER_SEED)) {
      const extract = state.brokerBalance.minus(BROKER_SEED);
      state.brokerBalance = state.brokerBalance.minus(extract);
      state.customerProfit = state.customerProfit.plus(extract);
      state.extractedBrokerProfit = state.extractedBrokerProfit.plus(extract);
    }
    finalizeLost(state.currentChallenge, {
      endReason: singleStopHit ? "single_stop" : "max_drawdown",
      finalBalance: state.propBalance,
      finalBrokerBalance: state.brokerBalance,
      brokerSeed: BROKER_SEED,
    });
    state.challengeOngoing = false;
    return { kind: "lost", state, reason: singleStopHit ? "single_stop" : "max_drawdown" };
  }

  if (profitTargetHit) {
    // challenge won
    if (burnWonChallenges) {
      let brokerLossReimb = toDec(0);

      if (cfg.strategy === "new4") {
        // special-case: 4+ sequential TPs => do not count as paid challenge in the caller
        const reimbursement = BROKER_SEED;
        // FIXME: customer profit should probably not be increased when reimbursement is received
        // state.customerProfit = state.customerProfit.plus(reimbursement);
        state.propProfit = state.propProfit.minus(reimbursement);
        state.refundsCost = state.refundsCost.plus(reimbursement);

        finalizeWon(state.currentChallenge, {
          payout: toDec(0),
          refund: reimbursement,
          brokerReimbursement: toDec(0),
          finalBalance: state.propBalance,
          finalBrokerBalance: state.brokerBalance,
        });

      } else {
        brokerLossReimb = state.brokerBalance.lt(BROKER_SEED)
          ? BROKER_SEED.minus(state.brokerBalance)
          : toDec(0);

        const reimbursement = cfg.commissionPerTrade
          ? cfg.commissionPerTrade.times(0).plus(cfg.brokerSeed) // no-op to keep Decimal type uniform
          : toDec(0);

        const refundPlus = cfg.brokerSeed; // will be overridden by caller with CHALLENGE_COST
        const total = refundPlus.plus(brokerLossReimb).plus(PAYOUT);

        state.customerProfit = state.customerProfit.plus(total);
        state.propProfit = state.propProfit.minus(total);

        state.refundsCost = state.refundsCost.plus(refundPlus);
        state.reimburseBrokerLossCost = state.reimburseBrokerLossCost.plus(brokerLossReimb);
        // payouts are 0 in burn mode per original
        finalizeWon(state.currentChallenge, {
          payout: PAYOUT,
          refund: refundPlus,
          brokerReimbursement: brokerLossReimb,
          finalBalance: state.propBalance,
          finalBrokerBalance: state.brokerBalance,
        });
      }

      state.challengeOngoing = false;
      return { kind: "won", state };
    }

    // otherwise hand off to real phase in orchestrator
    return { kind: "won", state };
  }

  return { kind: "continue", state };
}

/**
 * Real phase loop. Runs until trades exhausted or single stop hit.
 * Handles periodic payout cycles at +2% then reset to START.
 */
export function realPhase(state: EvalState, cfg: Omit<EvalConfig, "levels"> & { realLevels: LevelRule[] }) {
  const {
    start: START,
    commissionPerTrade: COMMISSION,
    tradeLots: TRADE_LOTS,
    brokerSeed: BROKER_SEED,
    scaleFactor,
    singleTradeStopRatio: SINGLE_TRADE_STOP_RATIO,
    tradeOutcomeStrategy,
    realLevels,
  } = cfg;

  const pickReal = makePicker(realLevels);

  while (state.tradesLeft > 0) {
    state.tradesLeft--;
    state.totalTradeNumber++;
    state.realTrades++;

    state.commissionCost = state.commissionCost.plus(COMMISSION);
    state.brokerBalance = state.brokerBalance.minus(COMMISSION);

    let { sl: slR, tp: tpR } = pickReal(state.propBalance, scaleFactor);

    if (tradeOutcomeStrategy === "burn_after_sl" && state.previousTradeOutcome === "SL") {
      slR = calculateBurnSL(state.propBalance, START, toDec(SINGLE_TRADE_STOP_RATIO));
    }

    const outcomeR = pickOutcome(slR, tpR, tradeOutcomeStrategy);

    const balanceBeforeReal = state.propBalance;
    const brokerBalanceBeforeReal = state.brokerBalance;

    let brokerPL = toDec(0);
    let singleStopHit = false;

    if (outcomeR === "SL") {
      state.propBalance = state.propBalance.minus(slR);
      brokerPL = slR.times(0.6);
      if (slR.gt(START.times(SINGLE_TRADE_STOP_RATIO))) singleStopHit = true;
    } else {
      state.propBalance = state.propBalance.plus(tpR);
      brokerPL = tpR.times(0.6).neg();
    }

    state.brokerBalance = state.brokerBalance.plus(brokerPL);
    state.clientTotalLots = state.clientTotalLots.plus(TRADE_LOTS.div(2));

    if (outcomeR === "TP") state.sequentialTPs++;
    else state.sequentialTPs = 0;
    state.previousTradeOutcome = outcomeR;

    logTrade({
      challenge: state.currentChallenge,
      tradeNumber: state.totalTradeNumber,
      phase: "real",
      balanceBefore: balanceBeforeReal,
      balanceAfter: state.propBalance,
      sl: slR,
      tp: tpR,
      outcome: outcomeR,
      brokerPL,
      brokerBalanceBefore: brokerBalanceBeforeReal,
      brokerBalanceAfter: state.brokerBalance,
      commission: COMMISSION,
      lots: TRADE_LOTS.div(2),
      singleStopHit,
    });

    if (singleStopHit) {
      if (state.brokerBalance.gt(BROKER_SEED)) {
        const extract = state.brokerBalance.minus(BROKER_SEED);
        state.brokerBalance = state.brokerBalance.minus(extract);
        state.customerProfit = state.customerProfit.plus(extract);
        state.extractedBrokerProfit = state.extractedBrokerProfit.plus(extract);
      }
      finalizeLost(state.currentChallenge, {
        endReason: "single_stop",
        finalBalance: state.propBalance,
        finalBrokerBalance: state.brokerBalance,
        brokerSeed: BROKER_SEED,
      });
      state.challengeOngoing = false;
      break;
    }

    // periodic payout cycle
    if (state.propBalance.gte(START.times(REAL_PHASE_PROFIT_RATIO))) {
      state.customerProfit = state.customerProfit.plus(cfg.payout);
      state.propProfit = state.propProfit.minus(cfg.payout);
      state.payoutsCost = state.payoutsCost.plus(cfg.payout);
      state.propBalance = START;
    }
  }
}

