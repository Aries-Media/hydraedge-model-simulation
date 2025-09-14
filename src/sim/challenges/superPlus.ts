// src/sim/challenges/superPlus.ts  (your "new4"/Super Plus flavor)
import { toDec } from "../constants";
import type { Challenge, RiskProfile, LevelProvider, PayoutPolicy } from "../contracts";
import type { D, LevelRule } from "../types";

const levelsNew4 = (ib: D): LevelRule[] => ([
  { maxBalance: toDec(200000), sl: toDec(10200), tp: toDec(8000) },
  { maxBalance: toDec(208000), sl: toDec(10400), tp: toDec(7800) },
  { maxBalance: toDec(215800), sl: toDec(10800), tp: toDec(7800) },
  { maxBalance: toDec(223600), sl: toDec(11200), tp: toDec(7800) },
  { maxBalance: toDec(230000), sl: toDec(11200), tp: undefined },
]);

export const SuperPlus: Challenge = {
  id: "super_plus",
  meta: { recommendedHedgeId: "new4", label: "Super Plus" },
  risk(initialBalance: D): RiskProfile {
    return {
      maxLossRatio: toDec(0.07),
      dailyLossRatio: toDec(0.05),
      targetProfitRatio: toDec(0.15),
    };
  },
  economics(initialBalance: D) {
    const scale = initialBalance.div(200000);
    return {
      challengeCost: toDec(900).times(scale),
      tradeLots: toDec(8).times(scale),
      brokerSeed: toDec(6000).times(scale),
    };
  },
  levels(initialBalance: D): LevelProvider {
    return {
      getEvaluationLevels: () => levelsNew4(initialBalance),
      getRealLevels: () => [], // your preset had empty real levels
    };
  },
  payoutPolicy(initialBalance: D): PayoutPolicy {
    const pct = toDec(0.02);
    return {
      profitCyclePayoutPct: () => pct,
      onBurnedWin({ brokerSeed }) {
        // your special reimbursement for "new4": seed + half seed, no payout, refund included in "refundsCost"
        const refund = brokerSeed.plus(brokerSeed.div(2));
        return { refund, payout: toDec(0), brokerReimb: toDec(0) };
      },
    };
  },
};

