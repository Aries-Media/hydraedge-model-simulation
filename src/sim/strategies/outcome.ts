import type { D } from "../types";

export type TradeOutcome = "SL" | "TP";
export type TradeOutcomeStrategy =
  | "fifty_fifty"
  | "geometric_distance"
  | "logarithmic_distance"
  | "average"
  | "burn_after_sl";

/**
 * Decide whether a trade hits SL or TP based on the selected strategy.
 * Mirrors original behavior byte-for-byte.
 */
export function pickOutcome(
  sl: D,
  tp: D,
  strategy: TradeOutcomeStrategy = "geometric_distance",
): TradeOutcome {
  switch (strategy) {
    case "fifty_fifty":
      return Math.round(Math.random()) ? "SL" : "TP";

    case "geometric_distance": {
      const pSL = tp.div(sl.plus(tp)).toNumber();
      return Math.random() < pSL ? "SL" : "TP";
    }

    case "logarithmic_distance": {
      const slLog = Math.log(sl.toNumber() + 1);
      const tpLog = Math.log(tp.toNumber() + 1);
      const pSL = tpLog / (slLog + tpLog);
      return Math.random() < pSL ? "SL" : "TP";
    }

    case "average": {
      const pSL_50 = 0.5;
      const pSL_geo = tp.div(sl.plus(tp)).toNumber();
      const pSL_avg = (pSL_50 + pSL_geo) / 2;
      return Math.random() < pSL_avg ? "SL" : "TP";
    }

    case "burn_after_sl": {
      // Uses same probability as geometric; the engine handles the SL size escalation.
      const pSL = tp.div(sl.plus(tp)).toNumber();
      return Math.random() < pSL ? "SL" : "TP";
    }

    default:
      return Math.round(Math.random()) ? "SL" : "TP";
  }
}

