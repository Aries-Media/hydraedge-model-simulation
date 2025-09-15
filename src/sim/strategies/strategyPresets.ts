import type { Strategy } from "../contracts";
import { toDec } from "../constants";

export const DefaultStrategy: Strategy = {
  id: "default",
  evaluate: () => ({
    tradeOutcomeOffset: toDec(0),
    slMultiplier: toDec(1),
    tpMultiplier: toDec(1),
  }),
};

export const New4Strategy: Strategy = {
  id: "new4",
  evaluate: () => ({
    tradeOutcomeOffset: toDec(0),
    slMultiplier: toDec(1),
    tpMultiplier: toDec(1),
  }),
};
