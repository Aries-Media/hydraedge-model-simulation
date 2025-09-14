// src/sim/challenges/fastRegular.ts
import { toDec } from "../constants";
import type { Challenge, RiskProfile, LevelProvider, PayoutPolicy } from "../contracts";
import type { D, LevelRule } from "../types";

const evalLevels = (ib: D): LevelRule[] => ([
  { maxBalance: toDec(200000), sl: toDec(8200), tp: toDec(5000) },
  { maxBalance: toDec(223000), sl: toDec(6000), tp: toDec(5000) },
  { maxBalance: toDec(228000), sl: toDec(6000), tp: undefined },
]);
const realLevels = (ib: D): LevelRule[] => ([
  { maxBalance: toDec(200000), sl: toDec(7000), tp: toDec(2000) },
  { maxBalance: toDec(223000), sl: toDec(7000), tp: toDec(2000) },
]);

export const FastRegular: Challenge = {
  id: "fast_regular",
  meta: { recommendedStrategyId: "default", label: "Fast Regular" },
  risk(initialBalance: D): RiskProfile {
    return {
      maxLossRatio: toDec(0.07),
      dailyLossRatio: toDec(0.04),
      targetProfitRatio: toDec(0.14),
    };
  },
  economics(initialBalance: D) {
    /** keep your scaling: 900 fee on 200k scaled linearly, seed 6k scaled */
    const scale = initialBalance.div(200000);
    return {
      challengeCost: toDec(900).times(scale),
      tradeLots: toDec(8).times(scale),
      brokerSeed: toDec(6000).times(scale),
    };
  },
  levels(initialBalance: D): LevelProvider {
    return {
      getEvaluationLevels: () => evalLevels(initialBalance),
      getRealLevels: () => realLevels(initialBalance),
    };
  },
  payoutPolicy(initialBalance: D): PayoutPolicy {
    const pct = toDec(0.02);
    return {
      profitCyclePayoutPct: () => pct,
      onBurnedWin({ brokerSeed, challengeCost, brokerBalance }) {
        // mirror your existing burn logic: refund cost + broker reimb + payout==0
        const brokerReimb = brokerBalance.lt(brokerSeed)
          ? brokerSeed.minus(brokerBalance)
          : toDec(0);
        const refund = challengeCost;
        const payout = toDec(0);
        return { refund, payout, brokerReimb };
      },
    };
  },
};

