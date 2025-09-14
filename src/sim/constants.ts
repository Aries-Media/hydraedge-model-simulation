import Decimal from "decimal.js";
import type { D } from "./types";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export const toDec = (x: number | D): D => (x instanceof Decimal ? x : new Decimal(x));

// Default values - preserved from original
export const REAL_PHASE_PROFIT_RATIO = toDec(1.02); // 2% above start in real phase

export const LOT_THRESHOLD_1 = toDec(1.06);
export const LOT_THRESHOLD_2 = toDec(1.12);

export const RATIO_MARGIN_INJECT = toDec(1.12);
export const BROKER_MARGIN_FACTOR = toDec(0.45);

export const MAX_CHALLENGE_SIZE = toDec(200_000);

export const scaleFactor = (initialBalance: D) => initialBalance.div(MAX_CHALLENGE_SIZE);
