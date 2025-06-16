
export interface SimulationParamsV1 {
  clientsNumber: number;
  tradesPerClient: number;
  challengeCost: number;
  tpGainChallenge: number;
  slLossChallenge: number;
  tpGainReal: number;
  slLossReal: number;
  propPayout: number;
}

export interface SimulationResultV1 {
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

export const runSimulationV1 = (params: SimulationParamsV1): SimulationResultV1 => {
  const { 
    clientsNumber, 
    tradesPerClient, 
    challengeCost,
    tpGainChallenge,
    slLossChallenge,
    tpGainReal,
    slLossReal,
    propPayout
  } = params;
  
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
        score += tpGainChallenge;
        brokerGains += tpGainChallenge;
        challengesBought++;
        challengeLost++;
      } else {
        slCounter += 1;
        score -= slLossChallenge;
        brokerGains -= slLossChallenge;
      }
    } else if (slCounter >= 1 && slCounter < 5) {
      if (trade.Outcome === "TP") {
        score += tpGainChallenge;
        brokerGains += tpGainChallenge;
        slCounter -= 1;
      } else {
        slCounter += 1;
        score -= slLossChallenge;
        brokerGains -= slLossChallenge;
      }
    } else {
      tradeReal += 1;
      if (trade.Outcome === "TP") {
        tpCounter += 1;
        score += tpGainReal;
        brokerGains += tpGainReal;

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
          score += slLossReal;
          if (!refunded) {
            refunded = true;
            score += challengeCost;
            refunds += challengeCost;
          }
          propPayouts += propPayout;
          brokerGains -= slLossReal;
        } else {
          tpCounter -= 1;
          score -= tpGainReal;
          brokerGains -= tpGainReal;
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
