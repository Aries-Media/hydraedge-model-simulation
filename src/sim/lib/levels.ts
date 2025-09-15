import Decimal from "decimal.js";
import type { LevelRule, D } from "../types";
import { toDec } from "../constants";

/**
 * Create a level-picker that, for a given balance and scaleFactor,
 * returns SL/TP for the appropriate tier.
 * If TP is undefined in the tier rule, derive it as:
 *   gap to tier ceiling + 50 (preserving original quirk).
 */
export const makePicker = (levels: LevelRule[]) => {
  const last = levels[levels.length - 1];

  return (bal: D) => {
    for (const lvl of levels) {
      if (bal.lte(lvl.maxBalance)) {
        const sl = lvl.sl;
        const tp =
          lvl.tp === undefined
            ? lvl.maxBalance.minus(bal).plus(50)
            : lvl.tp;
        return { sl, tp };
      }
    }

    // Fallback to last rule
    const sl = last.sl;
    const tp =
      last.tp === undefined
        ? last.maxBalance.minus(bal)
        : last.tp;
    return { sl, tp };
  };
};

export const scaleLevels = (levels: { maxBalance: number; sl: number; tp: number }[], scale: Decimal) => {
  return levels.map(l => ({
    maxBalance: toDec(l.maxBalance).times(scale),
    sl: toDec(l.sl).times(scale),
    tp: toDec(l.tp).times(scale)
  }))
};
