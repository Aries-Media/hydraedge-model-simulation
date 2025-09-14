// src/sim/registry.ts
import { toDec } from "./constants";
import type { Challenge, HedgeStrategy } from "./contracts";
import { FastRegular } from "./challenges/fastRegular";
import { SuperPlus } from "./challenges/superPlus";
import { DefaultHedge, New4Hedge } from "./strategies/hedgePresets";
import type { LevelRule } from "./types";

const challenges: Record<string, Challenge> = {
  fast_regular: FastRegular,
  super_plus: SuperPlus,
};

const hedges: Record<string, HedgeStrategy> = {
  default: DefaultHedge,
  new4: New4Hedge,
};

export function getChallenge(id: string): Challenge {
  const c = challenges[id];
  if (!c) throw new Error(`Unknown challenge '${id}'`);
  return c;
}

export function getHedge(id?: string): HedgeStrategy {
  if (!id) return DefaultHedge;
  const h = hedges[id];
  if (!h) throw new Error(`Unknown hedge strategy '${id}'`);
  return h;
}

// allow external registration without touching core
export const registerChallenge = (c: Challenge) => (challenges[c.id] = c);
export const registerHedge = (h: HedgeStrategy) => (hedges[h.id] = h);


export function snapshotChallenge(
  challengeId: string,
  initialBalance = 200_000
) {
  const ch: Challenge = getChallenge(challengeId);
  const ib = toDec(initialBalance);

  const risk = ch.risk(ib);
  const lvl = ch.levels(ib);
  const econ = ch.economics(ib);

  return {
    id: ch.id,
    meta: ch.meta ?? {},
    riskPercent: {
      maxLoss: risk.maxLossRatio.times(100),      // 7
      dailyLoss: risk.dailyLossRatio.times(100),  // 5
      targetProfit: risk.targetProfitRatio.times(100), // 15
    },
    levels: {
      evaluation: lvl.getEvaluationLevels(ib) as LevelRule[],
      real: lvl.getRealLevels(ib) as LevelRule[],
    },
    economics: {
      challengeCost: econ.challengeCost,
      tradeLots: econ.tradeLots,
      brokerSeed: econ.brokerSeed,
    },
  };
}

