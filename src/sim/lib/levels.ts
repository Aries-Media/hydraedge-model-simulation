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

  return (bal: D, scaleFactor: D) => {
    for (const lvl of levels) {
      if (bal.lte(lvl.maxBalance.times(scaleFactor))) {
        const sl = lvl.sl.times(scaleFactor);
        const tp =
          lvl.tp === undefined
            ? lvl.maxBalance.times(scaleFactor).minus(bal).plus(50)
            : lvl.tp.times(scaleFactor);
        return { sl, tp };
      }
    }

    // Fallback to last rule
    const sl = last.sl.times(scaleFactor);
    const tp =
      last.tp === undefined
        ? last.maxBalance.times(scaleFactor).minus(bal)
        : last.tp.times(scaleFactor);
    return { sl, tp };
  };
};

