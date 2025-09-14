import { toDec, LOT_THRESHOLD_1, LOT_THRESHOLD_2 } from "../constants";
import type { HedgeStrategy } from "../contracts";
import type { D } from "../types";

export const DefaultHedge: HedgeStrategy = {
  id: "default",
  coeff(bal: D, start: D) {
    const ratio = bal.div(start);
    if (ratio.lt(LOT_THRESHOLD_1)) return toDec(0.15);
    if (ratio.lt(LOT_THRESHOLD_2)) return toDec(0.3);
    return toDec(0.6);
  },
};

export const New4Hedge: HedgeStrategy = {
  id: "new4",
  coeff(bal, start) {
    if (bal.lt(start.times(1.04))) return toDec(0.15);
    if (bal.lt(start.times(1.07))) return toDec(0.25);
    if (bal.lt(start.times(1.11))) return toDec(0.40);
    return toDec(0.65);
  },
  onEvaluationWin({ sequentialTPs }) {
    return { ignorePayment: sequentialTPs >= 4 };
  },
};

