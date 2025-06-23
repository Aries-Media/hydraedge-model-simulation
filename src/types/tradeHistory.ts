
export interface TradeLog {
  tradeNumber: number;
  phase: 'evaluation' | 'real';
  balanceBefore: number;
  balanceAfter: number;
  sl: number;
  tp: number;
  outcome: 'SL' | 'TP';
  brokerPL: number;
  brokerBalanceBefore: number;
  brokerBalanceAfter: number;
  commission: number;
  lots: number;
  singleStopHit?: boolean;
  marginMoved?: boolean;
}

export interface ChallengeLog {
  challengeNumber: number;
  startBalance: number;
  brokerStartBalance: number;
  outcome: 'won' | 'lost' | 'ongoing';
  endReason?: 'profit_target' | 'max_drawdown' | 'single_stop' | 'trades_exhausted';
  finalBalance?: number;
  finalBrokerBalance?: number;
  trades: TradeLog[];
  payout?: number;
  refund?: number;
  brokerReimbursement?: number;
  extractedBrokerProfit?: number;
}

export interface SimulationTradeHistory {
  challenges: ChallengeLog[];
  totalTrades: number;
  clientInitialBalance: number;
}
