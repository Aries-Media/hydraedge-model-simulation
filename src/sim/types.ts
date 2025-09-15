import Decimal from "decimal.js";
import { Challenge } from "./contracts";

export type D = Decimal;

export interface LevelRule {
  /** upper inclusive bound for which this rule applies */
  maxBalance: D; // inclusive upper bound
  /** stop-loss distance in account currency (number) or function of balance */
  sl: D;
  /**
   * take-profit distance. When omitted the engine will derive it at run-time
   * as (maxBalance – currentBalance) (+50 in current impl).
   */
  tp: D | undefined;
}


export interface BalanceDistribution {
  balance: number;
  percentage: number;
}

export interface SimulationParams {
  challenge: Challenge;
  clientsNumber: number;
  tradesPerClient: number;
  commissionPerTrade?: D | number;
  balanceDistribution?: BalanceDistribution[];
  burnWonChallenges?: boolean;
  tradeOutcomeStrategy?:
    | "fifty_fifty"
    | "geometric_distance"
    | "logarithmic_distance"
    | "average"
    | "burn_after_sl";
  strategy?: string;
}

export interface SimulationResult {
  id: string;
  timestamp: string;
  clientsNumber?: number;
  tradeHistory?: import("@/types/tradeHistory").SimulationTradeHistory;

  netProfit: number;

  challengesBought: number;
  challengesWon: number;
  challengesLost: number;

  payoutsCost: number;
  refundsCost: number;
  reimburseBrokerLossCost: number;

  extractedBrokerProfit: number;
  propProfit: number;
  totalPropProfit: number;

  totalAmountSpent: number;
  totalLots: number;

  burnWonChallenges: boolean;
  tradeOutcomeStrategy:
    | "fifty_fifty"
    | "geometric_distance"
    | "logarithmic_distance"
    | "average"
    | "burn_after_sl";

  balanceDistributionUsed?: BalanceDistribution[];

  // legacy compatibility
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

