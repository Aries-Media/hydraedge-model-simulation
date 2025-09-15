import { toDec, MAX_CHALLENGE_SIZE } from "../constants";
import type { SimulationParams, SimulationResult } from "../types";
import { getChallenge, getStrategy } from "../registry";
import { runSimulation as runLegacy } from "./simulation"; // your existing orchestrator (params mode)

/** New: strongly-typed entry using domain objects */
export function runWithChallenge(opts: {
  challengeId: string;                 // "fast_regular" | "super_plus" | custom
  strategyId?: string;                    // "default" | "new4" | custom
  outcomeStrategy?: import("../contracts").TradeOutcomeStrategy;
  clientsNumber: number;
  tradesPerClient: number;
  commissionPerTrade?: number;
  initialBalance?: number;
  balanceDistribution?: Array<{ balance: number; percentage: number }>;
  burnWonChallenges?: boolean;
}): SimulationResult {
  const {
    challengeId,
    strategyId,
    outcomeStrategy = "geometric_distance",
    clientsNumber,
    tradesPerClient,
    commissionPerTrade = 10,
    initialBalance = MAX_CHALLENGE_SIZE,
    balanceDistribution,
    burnWonChallenges = true,
  } = opts;

  const challenge = getChallenge(challengeId);
  const strategy = getStrategy(strategyId);

  // Let the challenge dictate risk, levels, payout, economics
  // const ib = toDec(initialBalance);
  // const risk = challenge.risk(ib);
  // const econ = ch.economics(ib);
  // const lvl = ch.levels(ib);
  // const payout = ch.payoutPolicy(ib);

  // Adapt into the legacy params so we reuse your tested engine
  const params: SimulationParams = {
    clientsNumber,
    tradesPerClient,
    commissionPerTrade,
    challenge,
    initialBalance: toDec(initialBalance),
    balanceDistribution,
    burnWonChallenges,
    tradeOutcomeStrategy: outcomeStrategy,
    // Pass strategy preset name so the engine uses it; it already handles "new4"
    strategy: strategy.id,
  };

  // Note: to fully migrate, you can thread payout policy hooks into phases.
  // For now, your existing “burn” logic matches FastRegular, and SuperPlus
  // is already equivalent to “new4” behavior via special branch.

  return runLegacy(params);
}

