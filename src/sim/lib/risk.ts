import type { D } from "../types";
import { toDec } from "../constants";

/**
 * Calculate an SL size that would burn the challenge by breaching the max drawdown.
 * Adds a tiny buffer (+100) to ensure it crosses, with a fallback to 50% of current balance.
 */
export function calculateBurnSL(
  currentBalance: D,
  startBalance: D,
  maxLossRatio: D,
): D {
  const maxDrawdownThreshold = startBalance.times(toDec(1).minus(maxLossRatio));
  const burnSL = currentBalance.minus(maxDrawdownThreshold).plus(100);
  return burnSL.gt(0) ? burnSL : currentBalance.times(0.5);
}

