
import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
// convenience alias
type D = Decimal;

export interface LevelRule {
  /** upper inclusive bound for which this rule applies */
  maxBalance: D;                             // inclusive upper bound
  /** stop‑loss distance in account currency (number) or function of balance */
  sl: D | ((balance: D) => D);               // stop-loss distance
  /**
   * take‑profit distance. When omitted the engine will derive it at run‑time
   * as (maxBalance – currentBalance), i.e. "close the gap to the tier ceiling".
   */
  tp?: D | ((balance: D) => D);
}

export interface BalanceDistribution {
  balance: number;
  percentage: number;
}

export interface SimulationParams {
  /** number of customers that will attempt a prop‑firm challenge */
  clientsNumber: number;
  /** trades executed per customer across all purchased challenges */
  tradesPerClient: number;

  /** broker commission paid by the company per trade (mirror leg) */
  commissionPerTrade?: D | number;
  /** starting balance of each new challenge (50 k / 100 k / 200 k …) */
  initialBalance?: D | number;
  /** distribution of initial balances across clients */
  balanceDistribution?: BalanceDistribution[];
  /** broker account seed per challenge – if omitted, scaled automatically */
  brokerStartBalance?: D | number;

  /** use custom level map (otherwise scaled defaults are used) */
  levels?: LevelRule[];                      // custom tier map (Decimal)
  /** the challenge is burned and the whole reimbursement emitted */
  burnWonChallenges?: boolean;
  /** the trade outcome is picked up randomly 50-50 between SL and TP */
  tradeOutputRandom?: boolean;
}

export interface SimulationResult {
  id: string;
  timestamp: string;
  clientsNumber?: number; // Add this to track how many clients were in this simulation

  /* core profit‑and‑loss numbers (company perspective) */
  netProfit: number;                 // final company cash after all trades / refunds / commissions

  /* challenge bookkeeping */
  challengesBought: number;
  challengesWon: number;
  challengesLost: number;

  /* money flowing out when a challenge is WON */
  payoutsCost: number;              // scaled payout per successful challenge
  refundsCost: number;              // challenge fee refund per successful challenge
  reimburseBrokerLossCost: number;  // reimburse customer for company's broker losses

  /* money flowing IN when a challenge is LOST */
  extractedBrokerProfit: number;     // portion of broker balance > seed withdrawn at loss
  propProfit: number;

  /* convenience aggregates */
  totalAmountSpent: number;         // payoutsCost + refundsCost + reimburseBrokerLossCost + commissionCost
  totalLots: number;                // total lots traded during simulation

  /* simulation settings */
  burnWonChallenges: boolean;       // whether won challenges are burned
  tradeOutputRandom: boolean;       // whether trade outcomes are random

  /* balance distribution tracking */
  balanceDistributionUsed?: BalanceDistribution[]; // distribution that was used

  // Legacy fields for compatibility
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

/* ────────── Constants ────────── */

const MAX_DRAWDOWN_RATIO      = new Decimal(0.07);
const SINGLE_TRADE_STOP_RATIO = new Decimal(0.04);
const PROFIT_TARGET_RATIO     = new Decimal(0.14);
const REAL_PHASE_PROFIT_RATIO = new Decimal(1.025); // 2.5 % above start in real phase (205 k / 200 k)

const LOT_THRESHOLD_1 = new Decimal(1.06);
const LOT_THRESHOLD_2 = new Decimal(1.12);

const RATIO_MARGIN_INJECT = new Decimal(1.12);
const BROKER_MARGIN_FACTOR     = new Decimal(0.45);

const toDec = (x: number | D): D => x instanceof Decimal ? x : new Decimal(x);

function lift(val: D | number | ((b: D) => D | number), bal: D): D {
  if (typeof val === 'function') return toDec(val(bal));
  return toDec(val);
}

/* ────────── Helpers ────────── */

/** Default 200 k level map expressed as relative ratios (will be rescaled).
 *  Max‑balance bounds are given as multipliers from the starting balance.
 */
function buildDefaultLevels(start: D): LevelRule[] {
  const sf = start.div(200_000);
  return [
    { maxBalance: start,                sl: toDec(8_200).times(sf), tp: toDec(6_000).times(sf) },
    { maxBalance: start.times(1.03),    sl: toDec(7_000).times(sf), tp: toDec(6_000).times(sf) },
    { maxBalance: start.times(1.06),    sl: (b:D)=>b.times(0.04).plus(toDec(200).times(sf)), tp: toDec(6_000).times(sf) },
    { maxBalance: start.times(1.09),    sl: toDec(7_000).times(sf), tp: toDec(6_000).times(sf) },
    { maxBalance: start.times(1.12).plus(1), sl: (b:D)=>b.times(0.04).plus(toDec(200).times(sf)) },
  ];
}

/** Real‑phase levels (after eval success, when burnWonChallenges = false). */
function buildDefaultRealLevels(start: D): LevelRule[] {
  const sf = start.div(200_000);
  return [
    { maxBalance: start.times(0.98), sl: toDec(8_200).times(sf), tp: toDec(2_000).times(sf) },
    { maxBalance: start,             sl: toDec(8_200).times(sf), tp: toDec(4_000).times(sf) },
    { maxBalance: start.times(1.02).plus(1), sl: toDec(7_000).times(sf) },
  ];
}

/*
 * Create a level‑picker function that, for a given balance, returns SL/TP.
 * If the level rule leaves TP undefined the engine derives it as the distance
 * between current balance and the tier’s maxBalance – enabling fully
 * parametric tiers without hard‑coding TP values.
 */
const makePicker = (levels: LevelRule[]) => {
  const last = levels[levels.length - 1];
  return (bal: D) => {
    for (const lvl of levels) if (bal.lt(lvl.maxBalance)) {
      const sl = lift(lvl.sl, bal);
      const tp = lvl.tp === undefined
        ? toDec(lvl.maxBalance).minus(bal)      // dynamic TP = gap to ceiling
        : lift(lvl.tp, bal);
      return { sl, tp };
    }
    /* fall back to last rule */
    const sl = lift(last.sl, bal);
    const tp = last.tp === undefined ? toDec(last.maxBalance).minus(bal) : lift(last.tp, bal);
    return { sl, tp };
  };
};

/** Hedging lot‑coefficient for the current balance (scaled variants). */
const hedgeCoeff = (bal: D, start: D): D => {
  const ratio = bal.div(start);
  if (ratio.lt(LOT_THRESHOLD_1)) return new Decimal(0.15);
  if (ratio.lt(LOT_THRESHOLD_2)) return new Decimal(0.30);
  return new Decimal(0.60);
};

/** Returns "SL" or "TP" with probability driven by SL / TP distances. */
const pickOutcome = (sl: D, tp: D, random = false): 'SL' | 'TP' => {
  if (random) return Math.round(Math.random()) ? "SL" : "TP";
  
  const pSL = tp.div(sl.plus(tp)).toNumber();
  return Math.random() < pSL ? 'SL' : 'TP';
};

/* Helper function to generate client balance assignments based on distribution */
function generateClientBalances(clientsNumber: number, distribution: BalanceDistribution[]): number[] {
  // Validate distribution
  const totalPercentage = distribution.reduce((sum, item) => sum + item.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Balance distribution percentages must sum to 100%, got ${totalPercentage}%`);
  }

  const balances: number[] = [];
  let remainingClients = clientsNumber;

  // Assign clients to each balance tier
  for (let i = 0; i < distribution.length; i++) {
    const item = distribution[i];
    const clientsForThisTier = i === distribution.length - 1 
      ? remainingClients // Last tier gets all remaining clients
      : Math.round((item.percentage / 100) * clientsNumber);
    
    for (let j = 0; j < clientsForThisTier; j++) {
      balances.push(item.balance);
    }
    remainingClients -= clientsForThisTier;
  }

  // Shuffle the array to randomize client assignments
  for (let i = balances.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [balances[i], balances[j]] = [balances[j], balances[i]];
  }

  return balances;
}

/* ────────── Core Simulation ────────── */

export function runSimulation({
  clientsNumber,
  tradesPerClient,
  commissionPerTrade  = 10,
  initialBalance      = 200_000,
  balanceDistribution,
  brokerStartBalance: brokerSeed,
  levels,
  burnWonChallenges   = true,
  tradeOutputRandom = false,
}: SimulationParams): SimulationResult {
  
  // Handle balance distribution
  let clientBalances: number[];
  let effectiveDistribution: BalanceDistribution[] | undefined;
  
  if (balanceDistribution && balanceDistribution.length > 0) {
    clientBalances = generateClientBalances(clientsNumber, balanceDistribution);
    effectiveDistribution = balanceDistribution;
  } else {
    // Use single balance for all clients
    const singleBalance = typeof initialBalance === 'number' ? initialBalance : initialBalance.toNumber();
    clientBalances = Array(clientsNumber).fill(singleBalance);
  }
  console.log("Clients Balance Distribution", clientBalances, effectiveDistribution);

  // Aggregate results across all clients - properly declare all variables
  let totalChallengesBought = 0;
  let totalChallengesWon = 0;
  let totalChallengesLost = 0;
  let totalPayoutsCost = new Decimal(0);
  let totalRefundsCost = new Decimal(0);
  let totalReimburseBrokerLossCost = new Decimal(0);
  let totalExtractedBrokerProfit = new Decimal(0);
  let totalPropProfit = new Decimal(0);
  let totalAmountSpent = new Decimal(0);
  let totalLots = new Decimal(0);
  let totalCommissionCost = new Decimal(0);
  let totalNetProfit = new Decimal(0); // Declare this variable properly

  // Run simulation for each client with their assigned balance
  for (let clientIndex = 0; clientIndex < clientsNumber; clientIndex++) {
    const clientInitialBalance = clientBalances[clientIndex];
    const scaleFactor = toDec(clientInitialBalance).div(200_000);
    
    // Scale challenge cost based on the client's initial balance
    const CHALLENGE_COST = toDec(900).times(scaleFactor);
    const TRADE_LOTS = toDec(8).times(scaleFactor);
    const START = toDec(clientInitialBalance);
    const BROKER_SEED = toDec(brokerSeed ?? 6_000 * scaleFactor.toNumber());
    const COMMISSION_PER_TRADE = toDec(commissionPerTrade);
    const BROKER_BONUS = BROKER_SEED.times(BROKER_MARGIN_FACTOR);
    const PAYOUT = toDec(4_000).times(scaleFactor);

    const pickLevels = makePicker(levels ?? buildDefaultLevels(START));
    const pickRealLevels = makePicker(buildDefaultRealLevels(START));

    // Client-specific bookkeeping
    let propProfit = new Decimal(0);
    let customerProfit = new Decimal(0);
    let extractedBrokerProfit = new Decimal(0);
    let commissionCost = new Decimal(0);
    let challengesBought = 0;
    let challengesWon = 0;
    let challengesLost = 0;
    let payoutsCost = new Decimal(0);
    let refundsCost = new Decimal(0);
    let reimburseBrokerLossCost = new Decimal(0);
    let clientTotalAmountSpent = new Decimal(0);
    let clientTotalLots = new Decimal(0);

    let tradesLeft = tradesPerClient;
    let propBalance = new Decimal(0);
    let brokerBalance = new Decimal(0);
    let marginMoved = false;
    let challengeOngoing = false;
    let realTrades = 0;

    while (tradesLeft > 0) {
      if (!challengeOngoing) {
        /* —— new challenge purchase —— */
        challengesBought++;
        challengeOngoing = true;
        clientTotalAmountSpent = clientTotalAmountSpent.plus(CHALLENGE_COST);
        propProfit = propProfit.plus(CHALLENGE_COST); // incoming fee

        propBalance   = START;
        brokerBalance = BROKER_SEED;
        marginMoved   = false;
      }

      /* 1️⃣  generate trade (evaluation phase) */
      tradesLeft--;

      const { sl, tp } = pickLevels(propBalance);
      const coeff      = hedgeCoeff(propBalance, START);
      const outcome    = pickOutcome(sl, tp, tradeOutputRandom);

      console.log("Trade", tradesPerClient - tradesLeft, "|", "balance:", propBalance, "- SL:", sl, "TP:", tp)
      console.log("Result:", outcome)
      
      let brokerPL           = new Decimal(0); // signed P&L for this trade
      let singleStopHit      = false;

      if (outcome === "SL") {
        propBalance = propBalance.minus(sl);
        brokerPL    = sl.times(coeff);

        if (sl.gt(START.times(SINGLE_TRADE_STOP_RATIO))) singleStopHit = true;

      } else {                         // TP
        propBalance = propBalance.plus(tp);
        brokerPL    = tp.times(coeff).neg();
      }

      brokerBalance = brokerBalance.plus(brokerPL);
      brokerBalance  = brokerBalance.minus(COMMISSION_PER_TRADE);
      commissionCost = commissionCost.plus(COMMISSION_PER_TRADE);
      clientTotalLots = clientTotalLots.plus(TRADE_LOTS);

      if (!marginMoved && propBalance.gte(START.times(RATIO_MARGIN_INJECT))) {
        brokerBalance = brokerBalance.plus(BROKER_BONUS);
        marginMoved   = true;
      }

      /* 2️⃣  evaluate lifetime conditions */

      const drawdownHit  = propBalance.lt(START.times(new Decimal(1).minus(MAX_DRAWDOWN_RATIO)));
      const profitTargetHit = propBalance.gte(START.times(new Decimal(1).plus(PROFIT_TARGET_RATIO)));

      if (singleStopHit || drawdownHit) {
        /* —— Challenge LOST —— */
        challengesLost++;
        challengeOngoing = false;

        // withdraw profits above seed from broker
        if (brokerBalance.gt(BROKER_SEED)) {
          const extract = brokerBalance.minus(BROKER_SEED);
          brokerBalance          = brokerBalance.minus(extract);
          customerProfit         = customerProfit.plus(extract);
          extractedBrokerProfit  = extractedBrokerProfit.plus(extract);
        }
        continue; // jump to next iteration -> possibly new challenge
      }

      if (profitTargetHit) {
        /* —— Challenge WON —— */
        challengesWon++;

        if (burnWonChallenges) {
          challengeOngoing = false;
          const brokerLossReimb = brokerBalance.lt(BROKER_SEED) ? BROKER_SEED.minus(brokerBalance) : new Decimal(0);
          const reimbursement = CHALLENGE_COST.plus(brokerLossReimb).plus(PAYOUT);

          customerProfit = customerProfit.plus(reimbursement);
          propProfit     = propProfit.minus(reimbursement);

          refundsCost             = refundsCost.plus(CHALLENGE_COST);
          payoutsCost             = payoutsCost.plus(PAYOUT);
          reimburseBrokerLossCost = reimburseBrokerLossCost.plus(brokerLossReimb);
          continue;
        }

        /* ——— REAL PHASE ——— */
        propBalance = START; // reset to start
        while (tradesLeft > 0) {
          tradesLeft--;
          realTrades++;
          commissionCost = commissionCost.plus(COMMISSION_PER_TRADE);
          brokerBalance  = brokerBalance.minus(COMMISSION_PER_TRADE);

          const { sl: slR, tp: tpR } = pickRealLevels(propBalance);
          const outcomeR = pickOutcome(slR, tpR, tradeOutputRandom);

          if (outcomeR === "SL") {
            propBalance = propBalance.minus(slR);
            brokerPL    = slR.times(0.6);
            if (slR.gt(START.times(SINGLE_TRADE_STOP_RATIO))) singleStopHit = true;
          } else {
            propBalance = propBalance.plus(tpR);
            brokerPL    = tpR.times(0.6).neg();
          }
          brokerBalance = brokerBalance.plus(brokerPL);
          clientTotalLots = clientTotalLots.plus(TRADE_LOTS.div(2));

          if (singleStopHit) {
            challengesLost++;
            challengeOngoing = false;
            if (brokerBalance.gt(BROKER_SEED)) {
              const extract = brokerBalance.minus(BROKER_SEED);
              brokerBalance          = brokerBalance.minus(extract);
              customerProfit         = customerProfit.plus(extract);
              extractedBrokerProfit  = extractedBrokerProfit.plus(extract);
            }
            break;
          }

          /* profit cycle in real phase → pay scaled payout */
          if (propBalance.gte(START.times(REAL_PHASE_PROFIT_RATIO))) {
            customerProfit = customerProfit.plus(PAYOUT);
            propProfit     = propProfit.minus(PAYOUT);
            payoutsCost    = payoutsCost.plus(PAYOUT);
            propBalance    = START;
          }
        }
      }
    }

    // Aggregate client results to totals
    const clientNetProfit = customerProfit.minus(clientTotalAmountSpent);
    totalNetProfit = totalNetProfit.plus(clientNetProfit);
    totalChallengesBought += challengesBought;
    totalChallengesWon += challengesWon;
    totalChallengesLost += challengesLost;
    totalPayoutsCost = totalPayoutsCost.plus(payoutsCost);
    totalRefundsCost = totalRefundsCost.plus(refundsCost);
    totalReimburseBrokerLossCost = totalReimburseBrokerLossCost.plus(reimburseBrokerLossCost);
    totalExtractedBrokerProfit = totalExtractedBrokerProfit.plus(extractedBrokerProfit);
    totalPropProfit = totalPropProfit.plus(propProfit);
    totalAmountSpent = totalAmountSpent.plus(clientTotalAmountSpent);
    totalLots = totalLots.plus(clientTotalLots);
    totalCommissionCost = totalCommissionCost.plus(commissionCost);
  }

  /* ——— Final aggregation ——— */
  // Calculate averages per client for this simulation run
  const avgNetProfit = totalNetProfit.div(clientsNumber);
  const avgChallengesBought = totalChallengesBought / clientsNumber;
  const avgChallengesWon = totalChallengesWon / clientsNumber;
  const avgChallengesLost = totalChallengesLost / clientsNumber;
  const avgPayoutsCost = totalPayoutsCost.div(clientsNumber);
  const avgRefundsCost = totalRefundsCost.div(clientsNumber);
  const avgReimburseBrokerLossCost = totalReimburseBrokerLossCost.div(clientsNumber);
  const avgExtractedBrokerProfit = totalExtractedBrokerProfit.div(clientsNumber);
  const avgTotalAmountSpent = totalAmountSpent.div(clientsNumber);
  const avgTotalLots = totalLots.div(clientsNumber);

  const totalPayouts = totalPayoutsCost.div(4000).toNumber(); // Assuming base payout of 4000
  const avgPayoutBase = totalChallengesBought > 0 ? totalPayoutsCost.div(totalChallengesBought).toNumber() : 4000;
  const adjustedTotalPayouts = totalPayoutsCost.div(avgPayoutBase).toNumber();
  const totalRealTrades = totalChallengesBought; // Approximation for compatibility
  const payoutPercentage = totalRealTrades > 0 ? (adjustedTotalPayouts / totalRealTrades) * 100 : 0;

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    clientsNumber, // Include the number of clients in this simulation

    // Return averages per client for this simulation run
    netProfit: avgNetProfit.toNumber(),

    challengesBought: avgChallengesBought,
    challengesWon: avgChallengesWon,
    challengesLost: avgChallengesLost,

    payoutsCost: avgPayoutsCost.toNumber(),
    refundsCost: avgRefundsCost.toNumber(),
    reimburseBrokerLossCost: avgReimburseBrokerLossCost.toNumber(),

    extractedBrokerProfit: avgExtractedBrokerProfit.toNumber(),
    propProfit: totalPropProfit.toNumber(),

    totalAmountSpent: avgTotalAmountSpent.toNumber(),
    totalLots: avgTotalLots.toNumber(),

    burnWonChallenges,
    tradeOutputRandom,
    balanceDistributionUsed: effectiveDistribution,

    // Legacy compatibility fields - scaled appropriately
    costOfChallenges: avgTotalAmountSpent.toNumber(), // Average challenge costs per client
    propWithdraw: avgPayoutsCost.toNumber(),
    challengeRefunds: avgRefundsCost.toNumber(),
    brokerWithdraw: avgExtractedBrokerProfit.toNumber(),
    tradesInReal: totalRealTrades,
    payouts: adjustedTotalPayouts,
    payoutPercentage,
    avgProfitPerCustomer: avgNetProfit.toNumber(),
    totalPropFirmProfit: totalPropProfit.toNumber(),
    avgProfitPerTrade: avgNetProfit.div(tradesPerClient).toNumber(),
  };
}

/* Convenience wrapper that runs a single simulation regardless of client count. */
export function runSimulationAndDisplay(params: SimulationParams): SimulationResult {
  // Always run a single simulation that aggregates all clients
  const result = runSimulation(params);
  return result;
}
