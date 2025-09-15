import { toDec, scaleFactor } from "../constants";
import type { Challenge, RiskProfile, LevelProvider, PayoutPolicy } from "../contracts";
import { D, LevelRule } from "../types";
import { scaleLevels } from "../lib/levels";

const levelsNew4 = (initialBalance: D, scale: D): LevelRule[] => scaleLevels([
  { maxBalance: 200000, sl: 10400, tp: 8000 },
  { maxBalance: 208000, sl: 10600, tp: 7500 },
  { maxBalance: 215800, sl: 10800, tp: 7500 },
  { maxBalance: 223600, sl: 11200, tp: 7000 },
  { maxBalance: 230000, sl: 11600, tp: 0 },
], scale);

export const SuperPlus: Challenge = {
  id: "super_plus",
  meta: { recommendedStrategyId: "new4", label: "Super Plus" },
  risk(): RiskProfile {
    return {
      maxLossRatio: toDec(0.07),
      dailyLossRatio: toDec(0.05),
      targetProfitRatio: toDec(0.15),
    };
  },
  economics(initialBalance: D) {
    const scale = scaleFactor(initialBalance);
    return {
      challengeCost: toDec(900).times(scale),
      tradeLots: toDec(6).times(scale),
      brokerSeed: toDec(10000).times(scale).greaterThan(toDec(3000)) ? toDec(10000).times(scale) : toDec(3000),
    };
  },
  levels(initialBalance: D): LevelProvider {
    const scale = scaleFactor(initialBalance);
    return {
      getEvaluationLevels: () => levelsNew4(initialBalance, scale),
      getRealLevels: () => [], // your preset had empty real levels
    };
  },
  brokerCoeff(bal: D, initialBalance: D): D {
    const coeffs = [0.15, 0.25, 0.4, 0.6].map(c => toDec(c));
    const levels = this.levels(initialBalance).getEvaluationLevels();
    const index = levels.findIndex(level => bal.lte(level.maxBalance));
    const coeff = coeffs[index >= 0 ? index : coeffs.length - 1];
    return coeff;
  },
  payoutPolicy(initialBalance: D): PayoutPolicy {
    return {
      profitCyclePayoutPct: () => null,
      onBurnedWin({ brokerSeed }) {
        // your special reimbursement for "new4": seed + half seed, no payout, refund included in "refundsCost"
        return { refund: brokerSeed, payout: toDec(0), brokerReimb: toDec(0) };
      },
    };
  },
};

