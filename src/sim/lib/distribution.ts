import type { BalanceDistribution } from "../types";

/**
 * Generate per-client initial balances based on a percentage distribution.
 * Percentages must sum to 100 (±0.01 tolerance).
 */
export function generateClientBalances(
  clientsNumber: number,
  distribution: BalanceDistribution[],
): number[] {
  const totalPercentage = distribution.reduce(
    (sum, item) => sum + item.percentage,
    0,
  );
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(
      `Balance distribution percentages must sum to 100%, got ${totalPercentage}%`,
    );
  }

  const balances: number[] = [];
  let remainingClients = clientsNumber;

  for (let i = 0; i < distribution.length; i++) {
    const item = distribution[i];
    const clientsForThisTier =
      i === distribution.length - 1
        ? remainingClients
        : Math.round((item.percentage / 100) * clientsNumber);

    for (let j = 0; j < clientsForThisTier; j++) balances.push(item.balance);
    remainingClients -= clientsForThisTier;
  }

  // Shuffle to randomize assignment order (Fisher–Yates)
  for (let i = balances.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balances[i], balances[j]] = [balances[j], balances[i]];
  }

  return balances;
}

