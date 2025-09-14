// src/sim/contracts.ts
import type { D, LevelRule } from "./types";

export interface RiskProfile {
  readonly maxLossRatio: D;        // e.g. 0.07
  readonly dailyLossRatio: D;      // e.g. 0.04
  readonly targetProfitRatio: D;   // e.g. 0.14
}

export interface LevelProvider {
  /** Evaluation phase tiers */
  getEvaluationLevels(initialBalance: D): LevelRule[];
  /** Real phase tiers (may be empty) */
  getRealLevels(initialBalance: D): LevelRule[];
}

export interface PayoutPolicy {
  /** % of initial balance paid per profit cycle in real phase */
  profitCyclePayoutPct(initialBalance: D): D; // e.g. 0.02
  /** Prize/refund logic when challenge is Won in evaluation and burned */
  onBurnedWin(params: {
    brokerSeed: D;
    challengeCost: D;
    brokerBalance: D;
  }): { refund: D; payout: D; brokerReimb: D };
}

export interface ChallengeMeta {
  recommendedStrategyId?: string; // e.g. "new4"
  label?: string;
  description?: string;
}

export interface Challenge {
  id: string;
  meta?: ChallengeMeta;
  risk(initialBalance: D): RiskProfile;
  economics(initialBalance: D): {
    challengeCost: D; tradeLots: D; brokerSeed: D;
  };
  levels(initialBalance: D): LevelProvider;
  payoutPolicy(initialBalance: D): PayoutPolicy;
}

export interface Strategy {
  id: string;
  evaluate: (params?: any) => {
    tradeOutcomeOffset: D;
    slMultiplier: D;
    tpMultiplier: D;
  };
}

export type TradeOutcomeStrategy =
  | "fifty_fifty"
  | "geometric_distance"
  | "logarithmic_distance"
  | "average"
  | "burn_after_sl";

