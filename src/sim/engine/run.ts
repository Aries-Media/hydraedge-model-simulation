import type { SimulationParams, SimulationResult } from "../types";
import { getChallenge, getStrategy } from "../registry";
import { runSimulation } from "./simulation";
import { TradeOutcomeStrategy } from "../contracts";

export function runWithChallenge(opts: {
  challengeId: string;                 // "fast_regular" | "super_plus" | custom
  strategyId?: string;                    // "default" | "new4" | custom
  outcomeStrategy?: TradeOutcomeStrategy;
  clientsNumber: number;
  tradesPerClient: number;
  commissionPerTrade?: number;
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
    balanceDistribution,
    burnWonChallenges = true,
  } = opts;

  const challenge = getChallenge(challengeId);
  const strategy = getStrategy(strategyId);

  // Adapt into the legacy params so we reuse your tested engine
  const params: SimulationParams = {
    challenge,
    clientsNumber,
    tradesPerClient,
    commissionPerTrade,
    balanceDistribution,
    burnWonChallenges,
    tradeOutcomeStrategy: outcomeStrategy,
    strategy: strategy.id,
  };

  return runSimulation(params);
}

