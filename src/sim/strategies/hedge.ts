import { toDec, LOT_THRESHOLD_1, LOT_THRESHOLD_2 } from "../constants";
import type { D } from "../types";

/**
 * Hedging lot-coefficient for the current balance (scaled variants).
 * Preserves the "new4" preset and the default threshold rules exactly.
 *
 * @param bal   current prop balance
 * @param start start balance
 * @param strategy optional string flag; supports "new4"
 * @returns coefficient in Decimal
 */
export function hedgeCoeff(bal: D, start: D, strategy?: string): D {
  if (strategy === "new4") {
    if (bal.lt(start.times(1.04))) return toDec(0.15);
    if (bal.lt(start.times(1.07))) return toDec(0.25);
    if (bal.lt(start.times(1.11))) return toDec(0.40);
    return toDec(0.65);
  }

  const ratio = bal.div(start);
  if (ratio.lt(LOT_THRESHOLD_1)) return toDec(0.15);
  if (ratio.lt(LOT_THRESHOLD_2)) return toDec(0.3);
  return toDec(0.6);
}

