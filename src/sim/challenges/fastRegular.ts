import { toDec, scaleFactor } from "../constants";
import type { Challenge, RiskProfile, LevelProvider, PayoutPolicy } from "../contracts";
import { D, LevelRule } from "../types";
import { scaleLevels } from "../lib/levels";

const evalLevels = (ib: D, scale: D): LevelRule[] => scaleLevels([
  { maxBalance: 200000, sl: 8200, tp: 5000 },
  { maxBalance: 223000, sl: 6000, tp: 5000 },
  { maxBalance: 228000, sl: 6000, tp: 0 },
], scale);

const realLevels = (ib: D, scale: D): LevelRule[] => scaleLevels([
  { maxBalance: 200000, sl: 7000, tp: 2000 },
  { maxBalance: 223000, sl: 7000, tp: 2000 },
], scale);

export const FastRegular: Challenge = {
  id: "fast_regular",
  meta: { recommendedStrategyId: "default", label: "Fast Regular" },
  risk(): RiskProfile {
    return {
      maxLossRatio: toDec(0.07),
      dailyLossRatio: toDec(0.04),
      targetProfitRatio: toDec(0.14),
    };
  },
  economics(initialBalance: D) {
    /** keep your scaling: 900 fee on 200k scaled linearly, seed 6k scaled */
    const scale = scaleFactor(initialBalance);
    return {
      challengeCost: toDec(900).times(scale),
      tradeLots: toDec(8).times(scale),
      brokerSeed: toDec(6000).times(scale).greaterThan(toDec(2000)) ? toDec(6000).times(scale) : toDec(2000),
    };
  },
  levels(initialBalance: D): LevelProvider {
    const scale = scaleFactor(initialBalance);
    return {
      getEvaluationLevels: () => evalLevels(initialBalance, scale),
      getRealLevels: () => realLevels(initialBalance, scale),
    };
  },
  brokerCoeff(bal: D, initialBalance: D): D {
    const range = initialBalance.div(7).minus(initialBalance.div(10));
    const pointInRange = bal.minus(initialBalance.div(10));
    const percent = pointInRange.div(range);

    if (percent.gte(1)) return toDec(3);
    if (percent.lte(0)) return toDec(0.3);

    return toDec(0.3).plus(percent.times(2.7));
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

