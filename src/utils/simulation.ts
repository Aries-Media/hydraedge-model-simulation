export interface SimulationParams {
  clientsNumber: number;
  tradesPerClient: number;
  challengeCost: number;
}

export interface SimulationResult {
  id: string;
  timestamp: string;
  netProfit: number;
  challengesBought: number;
  costOfChallenges: number;
  propWithdraw: number;
  challengeRefunds: number;
  brokerWithdraw: number;
  tradesInReal: number;
  payouts: number;
  payoutPercentage: number;
  avgProfitPerCustomer: number;
  totalPropFirmProfit: number;
  avgProfitPerTrade: number;
}

export const runSimulation = (params: SimulationParams): SimulationResult => {
  const { clientsNumber, tradesPerClient, challengeCost } = params;
  let trades: { Outcome: string }[] = [];
  let tradeReal = 0;
  let payouts = 0;
  let brokerGains = 0;
  let propPayouts = 0;
  let refunds = 0;
  let score = 0;
  let slCounter = 0;
  let tpCounter = 0;
  let refunded = false;
  let challengesBought = 0;
  let challengeLost = 0;

  // Populate dataset
  for (let i = 0; i < tradesPerClient * clientsNumber; i++) {
    trades.push({ Outcome: Math.round(Math.random()) ? "SL" : "TP" });
  }

  trades.forEach((trade) => {
    if (slCounter === 0) {
      if (trade.Outcome === "TP") {
        score += 1725;
        brokerGains += 1725;
        challengesBought++;
        challengeLost++;
      } else {
        slCounter += 1;
        score -= 1500;
        brokerGains -= 1500;
      }
    } else if (slCounter >= 1 && slCounter < 4) {
      if (trade.Outcome === "TP") {
        score += 1500;
        brokerGains += 1500;
        slCounter -= 1;
      } else {
        slCounter += 1;
        score -= 1500;
        brokerGains -= 1500;
      }
    } else {
      tradeReal += 1;
      if (trade.Outcome === "TP") {
        tpCounter += 1;
        score += 2850;
        brokerGains += 2850;

        if (tpCounter === 2) {
          refunded = false;
          slCounter = 0;
          tpCounter = 0;
          challengesBought++;
          challengeLost++;
        }
      } else {
        if (tpCounter === 0) {
          payouts += 1;
          score += 750;
          if (!refunded) {
            refunded = true;
            score += challengeCost;
            refunds += challengeCost;
          }
          propPayouts += 1600;
          brokerGains -= 850;
        } else {
          tpCounter -= 1;
          score -= 2850;
          brokerGains -= 2850;
        }
      }
    }
  });

  const finalScore = score - challengeCost * challengesBought - 10 * trades.length;
  const propFirmProfit = challengeCost * challengesBought - propPayouts - refunds;

  return {
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
    netProfit: finalScore,
    challengesBought,
    costOfChallenges: challengeCost * challengesBought,
    propWithdraw: propPayouts,
    challengeRefunds: refunds,
    brokerWithdraw: brokerGains,
    tradesInReal: tradeReal,
    payouts,
    payoutPercentage: (payouts / tradeReal) * 100,
    avgProfitPerCustomer: propFirmProfit / clientsNumber,
    totalPropFirmProfit: propFirmProfit,
    avgProfitPerTrade: finalScore / trades.length,
  };
};