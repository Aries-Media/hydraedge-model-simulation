import { toDec, scaleFactor } from "../constants";
import type { Challenge, RiskProfile, LevelProvider, PayoutPolicy } from "../contracts";
import { D, LevelRule } from "../types";
import { scaleLevels } from "../lib/levels";

const evalLevels = (_ib: D, bal: D, scale: D): LevelRule[] => scaleLevels([
  { maxBalance: 200000, sl: 8200, tp: 5000 },
  { maxBalance: 223000, sl: 6000, tp: 5000 },
  { maxBalance: 228000, sl: 6000, tp: Number(toDec(228000).minus(bal)) },
], scale);

const realLevels = (_ib: D, _bal: D, scale: D): LevelRule[] => scaleLevels([
  { maxBalance: 200000, sl: 7000, tp: 2000 },
  { maxBalance: 223000, sl: 7000, tp: 2000 },
], scale);

export const FastRegular: Challenge = {
  id: "fast_regular",
  meta: { recommendedStrategyId: "default", label: "Plus" },
  risk(): RiskProfile {
    return {
      maxLossRatio: toDec(0.07),
      dailyLossRatio: toDec(0.04),
      targetProfitRatio: toDec(0.14),
    };
  },
  economics(initialBalance: D) {
    const scale = scaleFactor(initialBalance);
    return {
      challengeCost: toDec(900).times(scale).greaterThan(toDec(300)) ?  toDec(900).times(scale) : toDec(300),
      tradeLots: toDec(4).times(scale),
      brokerSeed: toDec(6000).times(scale).greaterThan(toDec(2000)) ? toDec(6000).times(scale) : toDec(2000),
    };
  },
  levels(initialBalance: D): LevelProvider {
    const scale = scaleFactor(initialBalance);
    return {
      getEvaluationLevels: (bal: D) => evalLevels(initialBalance, bal, scale),
      getRealLevels: (bal: D) => realLevels(initialBalance, bal, scale),
    };
  },
  brokerCoeff(bal: D, initialBalance: D, real = false): D {
    let coeff = null;
    if (real) {
      coeff = initialBalance.eq(toDec(50000)) ? "0.7" : "0.56";
    } else {
      coeff = initialBalance.eq(toDec(200000)) ? "0.2" : initialBalance.eq(toDec(100000)) ? "0.215" : "0.26"
    }
    return toDec(coeff)
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

