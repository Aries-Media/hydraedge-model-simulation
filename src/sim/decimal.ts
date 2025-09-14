import Decimal from "decimal.js";

export const fmtPct = (d: Decimal.Value, dp = 2) =>
  new Decimal(d)
    .toDecimalPlaces(dp)            // control precision for display
    .toString()
    .replace(/\.00?$/, "");

export { toDec } from "./constants";
