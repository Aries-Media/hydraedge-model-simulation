import type { ChallengeLog, TradeLog } from "@/types/tradeHistory";
import type { D } from "../types";

/** Create a challenge log if history is enabled. */
export function beginChallengeLog(
  enabled: boolean,
  args: {
    challengeNumber: number;
    start: D;
    brokerSeed: D;
  },
): ChallengeLog | undefined {
  if (!enabled) return undefined;
  return {
    challengeNumber: args.challengeNumber,
    startBalance: args.start.toNumber(),
    brokerStartBalance: args.brokerSeed.toNumber(),
    outcome: "ongoing",
    trades: [],
  };
}

type BaseTradeArgs = {
  challenge?: ChallengeLog;
  tradeNumber: number;
  phase: "evaluation" | "real";
  balanceBefore: D;
  balanceAfter: D;
  sl: D;
  tp: D;
  outcome: "SL" | "TP";
  brokerPL: D;
  brokerBalanceBefore: D;
  brokerBalanceAfter: D;
  commission: D;
  lots: D;
  singleStopHit?: boolean;
  marginMoved?: boolean; // only relevant in evaluation
};

/** Push one trade log entry if challenge log exists. */
export function logTrade(args: BaseTradeArgs) {
  if (!args.challenge) return;
  const entry: TradeLog = {
    tradeNumber: args.tradeNumber,
    phase: args.phase,
    balanceBefore: args.balanceBefore.toNumber(),
    balanceAfter: args.balanceAfter.toNumber(),
    sl: args.sl.toNumber(),
    tp: args.tp.toNumber(),
    outcome: args.outcome,
    brokerPL: args.brokerPL.toNumber(),
    brokerBalanceBefore: args.brokerBalanceBefore.toNumber(),
    brokerBalanceAfter: args.brokerBalanceAfter.toNumber(),
    commission: args.commission.toNumber(),
    lots: args.lots.toNumber(),
    singleStopHit: !!args.singleStopHit,
    ...(args.marginMoved !== undefined ? { marginMoved: args.marginMoved } : {}),
  };
  args.challenge.trades.push(entry);
}

export function finalizeLost(
  challenge: ChallengeLog | undefined,
  args: {
    endReason: "single_stop" | "max_drawdown";
    finalBalance: D;
    finalBrokerBalance: D;
    brokerSeed: D;
  },
) {
  if (!challenge) return;
  challenge.outcome = "lost";
  challenge.endReason = args.endReason;
  challenge.finalBalance = args.finalBalance.toNumber();
  challenge.finalBrokerBalance = args.finalBrokerBalance.toNumber();
  challenge.extractedBrokerProfit =
    args.finalBrokerBalance.gt(args.brokerSeed)
      ? args.finalBrokerBalance.minus(args.brokerSeed).toNumber()
      : 0;
}

export function finalizeWon(
  challenge: ChallengeLog | undefined,
  args: {
    payout: D;
    refund: D;
    brokerReimbursement: D;
    finalBalance: D;
    finalBrokerBalance: D;
  },
) {
  if (!challenge) return;
  challenge.outcome = "won";
  challenge.endReason = "profit_target";
  challenge.finalBalance = args.finalBalance.toNumber();
  challenge.finalBrokerBalance = args.finalBrokerBalance.toNumber();
  challenge.payout = args.payout.toNumber();
  challenge.refund = args.refund.toNumber();
  challenge.brokerReimbursement = args.brokerReimbursement.toNumber();
}

export function finalizeExhausted(
  challenge: ChallengeLog | undefined,
  args: { finalBalance: D; finalBrokerBalance: D },
) {
  if (!challenge) return;
  challenge.endReason = "trades_exhausted";
  challenge.finalBalance = args.finalBalance.toNumber();
  challenge.finalBrokerBalance = args.finalBrokerBalance.toNumber();
}

