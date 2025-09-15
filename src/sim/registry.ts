import { toDec, MAX_CHALLENGE_SIZE } from "./constants";
import type { Challenge, Strategy } from "./contracts";
import { FastRegular } from "./challenges/fastRegular";
import { SuperPlus } from "./challenges/superPlus";
import { DefaultStrategy, New4Strategy } from "./strategies/strategyPresets";
import type { LevelRule } from "./types";

const challenges: Record<string, Challenge> = {
  fast_regular: FastRegular,
  super_plus: SuperPlus,
};

const strategies: Record<string, Strategy> = {
  default: DefaultStrategy,
  new4: New4Strategy,
};

export function getChallenge(id: string): Challenge {
  const c = challenges[id];
  if (!c) throw new Error(`Unknown challenge '${id}'`);
  return c;
}

export function getStrategy(id?: string): Strategy {
  if (!id) return DefaultStrategy;
  const s = strategies[id];
  if (!s) throw new Error(`Unknown strategy '${id}'`);
  return s;
}

// allow external registration without touching core
export const registerChallenge = (c: Challenge) => (challenges[c.id] = c);
export const registerStrategy = (s: Strategy) => (strategies[s.id] = s);


export function snapshotChallenge(
  challengeId: string,
  initialBalance = MAX_CHALLENGE_SIZE
) {
  const ch: Challenge = getChallenge(challengeId);
  const ib = toDec(initialBalance);

  const risk = ch.risk();
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
