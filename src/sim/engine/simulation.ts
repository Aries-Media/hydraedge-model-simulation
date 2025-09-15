import type { SimulationParams, SimulationResult, BalanceDistribution } from "../types";
import { toDec, scaleFactor, MAX_CHALLENGE_SIZE, BROKER_MARGIN_FACTOR } from "../constants";
import { generateClientBalances } from "../lib/distribution";
import { evaluationStep, realPhase, type EvalState, type EvalConfig } from "./phases";
import {
  beginChallengeLog,
  finalizeExhausted,
} from "../logging";

import type { SimulationTradeHistory } from "@/types/tradeHistory";

function pushClosedChallenge(
  shouldTrack: boolean,
  history: SimulationTradeHistory | undefined,
  state: EvalState
) {
  if (!shouldTrack || !history) return;
  const ch = state.currentChallenge;
  if (ch) {
    history.challenges.push(ch);
    // reset for the next challenge; the loop will re-begin with beginChallengeLog
    state.currentChallenge = undefined;
  }
}

export function runSimulation({
  challenge,
  clientsNumber,
  tradesPerClient,
  commissionPerTrade = 10,
  balanceDistribution,
  burnWonChallenges = true,
  tradeOutcomeStrategy = "logarithmic_distance",
  strategy,
}: SimulationParams): SimulationResult {



  if (!balanceDistribution) throw Error("Distribution undefined cannot run simulation");
  let clientBalances = generateClientBalances(clientsNumber, balanceDistribution);
  let effectiveDistribution = balanceDistribution;

  const shouldTrackHistory = clientsNumber === 1;
  let tradeHistory: SimulationTradeHistory | undefined = shouldTrackHistory
    ? { challenges: [], totalTrades: 0, clientInitialBalance: clientBalances[0] }
    : undefined;

  // totals
  let totalChallengesBought = 0;
  let totalChallengesWon = 0;
  let totalChallengesLost = 0;
  let totalPayoutsCost = toDec(0);
  let totalRefundsCost = toDec(0);
  let totalReimburseBrokerLossCost = toDec(0);
  let totalExtractedBrokerProfit = toDec(0);
  let totalPropProfit = toDec(0);
  let totalAmountSpent = toDec(0);
  let totalLots = toDec(0);
  let totalCommissionCost = toDec(0);
  let totalNetProfit = toDec(0);

  for (let clientIndex = 0; clientIndex < clientsNumber; clientIndex++) {
    const initialBalance = toDec(clientBalances[clientIndex]);

    const lvl = challenge.levels(initialBalance);
    const levels = lvl.getEvaluationLevels();
    const realLevels = lvl.getRealLevels();
    if (!levels || !realLevels) throw Error("Levels undefined cannot run simulation");

    const { challengeCost, tradeLots, brokerSeed } = challenge.economics(initialBalance);
    const { maxLossRatio, dailyLossRatio, targetProfitRatio } = challenge.risk();

    // scaled constants per client
    const COMMISSION_PER_TRADE = toDec(commissionPerTrade);
    // FIXME: should not be fixed
    const PAYOUT = toDec(initialBalance).times(0.02);

    // per-client accumulators
    let propProfit = toDec(0);
    let customerProfit = toDec(0);
    let extractedBrokerProfit = toDec(0);
    let commissionCost = toDec(0);
    let challengesBought = 0;
    let challengesWon = 0;
    let challengesLost = 0;
    let payoutsCost = toDec(0);
    let refundsCost = toDec(0);
    let reimburseBrokerLossCost = toDec(0);
    let clientTotalAmountSpent = toDec(0);
    let clientTotalLots = toDec(0);

    // init challenge loop
    let tradesLeft = tradesPerClient;
    let propBalance = initialBalance;
    let brokerBalance = brokerSeed;
    let challengeOngoing = false;
    let currentChallenge = undefined as EvalState["currentChallenge"] | undefined;

    let totalTradeNumber = 0;
    let previousTradeOutcome: "SL" | "TP" | null = null;
    let sequentialTPs = 0;

    while (tradesLeft > 0) {
      if (!challengeOngoing) {
        challengesBought++;
        challengeOngoing = true;
        clientTotalAmountSpent = clientTotalAmountSpent.plus(challengeCost);
        propProfit = propProfit.plus(challengeCost);

        propBalance = initialBalance;
        brokerBalance = brokerSeed;
        previousTradeOutcome = null;
        sequentialTPs = 0;

        currentChallenge = beginChallengeLog(shouldTrackHistory, {
          challengeNumber: challengesBought,
          start: initialBalance,
          brokerSeed: brokerSeed,
        });
      }

      // eval state snapshot
      const state: EvalState = {
        tradesLeft,
        totalTradeNumber,
        realTrades: 0,

        propBalance,
        brokerBalance,

        commissionCost,
        clientTotalLots,

        challengeOngoing: true,
        marginMoved: false,
        previousTradeOutcome,
        sequentialTPs,

        propProfit,
        customerProfit,
        refundsCost,
        payoutsCost,
        reimburseBrokerLossCost,
        extractedBrokerProfit,

        currentChallenge,
      };

      const cfg: EvalConfig = {
        challenge,
        start: initialBalance,
        commissionPerTrade: COMMISSION_PER_TRADE,
        tradeLots,
        brokerSeed,
        payout: PAYOUT,
        maxDrawdownRatio: toDec(maxLossRatio),
        singleTradeStopRatio: toDec(dailyLossRatio),
        profitTargetRatio: toDec(targetProfitRatio),
        burnWonChallenges,
        tradeOutcomeStrategy,
        strategy,
        levels,
        realLevels,
        shouldTrackHistory: shouldTrackHistory,
      };

      // one evaluation step
      const res = evaluationStep(state, cfg);

      // pluck back state
      ({
        tradesLeft,
        totalTradeNumber,
        propBalance,
        brokerBalance,
        commissionCost,
        clientTotalLots,
        previousTradeOutcome,
        sequentialTPs,
        propProfit,
        customerProfit,
        refundsCost,
        payoutsCost,
        reimburseBrokerLossCost,
        extractedBrokerProfit,
        currentChallenge,
        challengeOngoing,
      } = res.state);


      if (res.kind === "lost") {
        challengesLost++;
        pushClosedChallenge(shouldTrackHistory, tradeHistory, res.state);
        continue;
      }

      if (res.kind === "won") {
        // If burnWonChallenges, the evaluationStep already finalized outcome and we’re done.
        if (burnWonChallenges) {
          // Handle "new4" exception: do not count as bought if 4+ TPs streak
          if (strategy === "new4" && sequentialTPs >= 4) {
            // challengesBought--; // undo
            clientTotalAmountSpent = clientTotalAmountSpent.minus(challengeCost);
            propProfit = propProfit.minus(challengeCost);
          }
          challengesWon++;
          pushClosedChallenge(shouldTrackHistory, tradeHistory, res.state);
          continue;
        }

        // Real phase
        previousTradeOutcome = null;
        sequentialTPs = 0;
        realPhase(res.state, { ...cfg, realLevels });
        ({
          tradesLeft,
          totalTradeNumber,
          propBalance,
          brokerBalance,
          commissionCost,
          clientTotalLots,
          previousTradeOutcome,
          sequentialTPs,
          propProfit,
          customerProfit,
          refundsCost,
          payoutsCost,
          reimburseBrokerLossCost,
          extractedBrokerProfit,
          currentChallenge,
          challengeOngoing,
        } = res.state);

        if (!challengeOngoing) {
          challengesLost++;
          pushClosedChallenge(shouldTrackHistory, tradeHistory, res.state);
        }
        continue;
      }

      // continue case
    }

    // if challenge still open at the end, finalize as exhausted
    if (currentChallenge) {
      finalizeExhausted(currentChallenge, {
        finalBalance: propBalance,
        finalBrokerBalance: brokerBalance,
      });
      // push the exhausted one
      if (shouldTrackHistory && tradeHistory) {
        tradeHistory.challenges.push(currentChallenge);
      }
    }

    if (shouldTrackHistory && tradeHistory) {
      tradeHistory.totalTrades = totalTradeNumber;
    }


    // aggregate per-client
    const clientNetProfit = customerProfit.minus(clientTotalAmountSpent);
    totalNetProfit = totalNetProfit.plus(clientNetProfit);
    totalChallengesBought += challengesBought;
    totalChallengesWon += challengesWon;
    totalChallengesLost += challengesLost;
    totalPayoutsCost = totalPayoutsCost.plus(payoutsCost);
    totalRefundsCost = totalRefundsCost.plus(refundsCost);
    totalReimburseBrokerLossCost = totalReimburseBrokerLossCost.plus(reimburseBrokerLossCost);
    totalExtractedBrokerProfit = totalExtractedBrokerProfit.plus(extractedBrokerProfit);
    totalPropProfit = totalPropProfit.plus(propProfit);
    totalAmountSpent = totalAmountSpent.plus(clientTotalAmountSpent);
    totalLots = totalLots.plus(clientTotalLots);
    totalCommissionCost = totalCommissionCost.plus(commissionCost);
  }

  // final aggregation (keep legacy fields and averages identical)
  const avgNetProfit = totalNetProfit.div(clientsNumber);
  const avgPropProfit = totalPropProfit.div(clientsNumber);
  const avgChallengesBought = totalChallengesBought / clientsNumber;
  const avgChallengesWon = totalChallengesWon / clientsNumber;
  const avgChallengesLost = totalChallengesLost / clientsNumber;
  const avgPayoutsCost = totalPayoutsCost.div(clientsNumber);
  const avgRefundsCost = totalRefundsCost.div(clientsNumber);
  const avgReimburseBrokerLossCost = totalReimburseBrokerLossCost.div(clientsNumber);
  const avgExtractedBrokerProfit = totalExtractedBrokerProfit.div(clientsNumber);
  const avgTotalAmountSpent = totalAmountSpent.div(clientsNumber);
  const avgTotalLots = totalLots.div(clientsNumber);

  const totalPayouts = totalPayoutsCost.div(4000).toNumber(); // retained assumption
  const avgPayoutBase =
    totalChallengesBought > 0
      ? totalPayoutsCost.div(totalChallengesBought).toNumber()
      : 4000;
  const adjustedTotalPayouts = totalPayoutsCost.div(avgPayoutBase).toNumber();
  const totalRealTrades = totalChallengesBought; // compatibility approximation
  const payoutPercentage =
    totalRealTrades > 0 ? (adjustedTotalPayouts / totalRealTrades) * 100 : 0;

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    clientsNumber,
    tradeHistory,

    netProfit: avgNetProfit.toNumber(),

    challengesBought: avgChallengesBought,
    challengesWon: avgChallengesWon,
    challengesLost: avgChallengesLost,

    payoutsCost: avgPayoutsCost.toNumber(),
    refundsCost: avgRefundsCost.toNumber(),
    reimburseBrokerLossCost: avgReimburseBrokerLossCost.toNumber(),

    extractedBrokerProfit: avgExtractedBrokerProfit.toNumber(),
    propProfit: avgPropProfit.toNumber(),
    totalPropProfit: totalPropProfit.toNumber(),

    totalAmountSpent: avgTotalAmountSpent.toNumber(),
    totalLots: avgTotalLots.toNumber(),

    burnWonChallenges,
    tradeOutcomeStrategy,

    balanceDistributionUsed: effectiveDistribution,

    // legacy compatibility
    costOfChallenges: avgTotalAmountSpent.toNumber(),
    propWithdraw: avgPayoutsCost.toNumber(),
    challengeRefunds: avgRefundsCost.toNumber(),
    brokerWithdraw: avgExtractedBrokerProfit.toNumber(),
    tradesInReal: totalRealTrades,
    payouts: adjustedTotalPayouts,
    payoutPercentage,
    avgProfitPerCustomer: avgNetProfit.toNumber(),
    totalPropFirmProfit: totalPropProfit.toNumber(),
    avgProfitPerTrade: avgNetProfit.div(tradesPerClient).toNumber(),
  };
}

