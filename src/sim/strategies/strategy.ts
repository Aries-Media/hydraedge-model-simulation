import D from "decimal.js";
import { toDec } from "../constants";

/**
 * Calculate strategy coefficient
 */
export function strategyCoeff(bal: D, start: D, strategy?: string): D {
  if (strategy === "new4") {
    // Super Plus: 4 points
    const maxSL = start.div(10);
    const d = maxSL.minus(bal);
    if (d.lte(0)) return toDec(0.3);

    const adjRatio = d.div(maxSL).times(6);
    return toDec(0.3).plus(adjRatio);
  } else {
    // Fast Regular: original method
    const range = start.div(7).minus(start.div(10));
    const pointInRange = bal.minus(start.div(10));
    const percent = pointInRange.div(range);

    if (percent.gte(1)) return toDec(3);
    if (percent.lte(0)) return toDec(0.3);

    return toDec(0.3).plus(percent.times(2.7));
  }
}