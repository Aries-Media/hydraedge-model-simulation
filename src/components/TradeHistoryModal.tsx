
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimulationTradeHistory } from "@/types/tradeHistory";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TradeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeHistory: SimulationTradeHistory;
  simulationId: string;
}

export function TradeHistoryModal({ 
  isOpen, 
  onClose, 
  tradeHistory, 
  simulationId 
}: TradeHistoryModalProps) {
  const formatCurrency = (value: number) => `$${value.toFixed(0)}`;
  const formatNumber = (value: number) => value.toFixed(2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Trade History - Simulation {simulationId.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[80vh] pr-4">
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Initial Balance:</span> {formatCurrency(tradeHistory.clientInitialBalance)}
                  </div>
                  <div>
                    <span className="font-medium">Total Challenges:</span> {tradeHistory.challenges.length}
                  </div>
                  <div>
                    <span className="font-medium">Total Trades:</span> {tradeHistory.totalTrades}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Challenges */}
            {tradeHistory.challenges.map((challenge, challengeIndex) => (
              <Card key={challengeIndex}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Challenge #{challenge.challengeNumber}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          challenge.outcome === 'won' ? 'default' : 
                          challenge.outcome === 'lost' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {challenge.outcome.toUpperCase()}
                      </Badge>
                      {challenge.endReason && (
                        <Badge variant="outline">
                          {challenge.endReason.replace('_', ' ').toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Challenge Summary */}
                  <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-medium">Start Balance:</span> {formatCurrency(challenge.startBalance)}
                    </div>
                    <div>
                      <span className="font-medium">Final Balance:</span> {challenge.finalBalance ? formatCurrency(challenge.finalBalance) : 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Broker Start:</span> {formatCurrency(challenge.brokerStartBalance)}
                    </div>
                    <div>
                      <span className="font-medium">Trades:</span> {challenge.trades.length}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  {(challenge.payout || challenge.refund || challenge.brokerReimbursement || challenge.extractedBrokerProfit) && (
                    <div className="grid grid-cols-4 gap-4 mb-4 text-sm bg-muted/50 p-3 rounded">
                      {challenge.payout && (
                        <div>
                          <span className="font-medium">Payout:</span> {formatCurrency(challenge.payout)}
                        </div>
                      )}
                      {challenge.refund && (
                        <div>
                          <span className="font-medium">Refund:</span> {formatCurrency(challenge.refund)}
                        </div>
                      )}
                      {challenge.brokerReimbursement && (
                        <div>
                          <span className="font-medium">Broker Reimb:</span> {formatCurrency(challenge.brokerReimbursement)}
                        </div>
                      )}
                      {challenge.extractedBrokerProfit && (
                        <div>
                          <span className="font-medium">Extracted Profit:</span> {formatCurrency(challenge.extractedBrokerProfit)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trades Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Trade</TableHead>
                          <TableHead className="w-20">Phase</TableHead>
                          <TableHead className="text-right">Balance Before</TableHead>
                          <TableHead className="text-right">SL</TableHead>
                          <TableHead className="text-right">TP</TableHead>
                          <TableHead className="text-center">Outcome</TableHead>
                          <TableHead className="text-right">Balance After</TableHead>
                          <TableHead className="text-right">Broker P&L</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                          <TableHead className="text-right">Lots</TableHead>
                          <TableHead className="text-center">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {challenge.trades.map((trade, tradeIndex) => (
                          <TableRow key={tradeIndex}>
                            <TableCell className="font-medium">#{trade.tradeNumber}</TableCell>
                            <TableCell>
                              <Badge variant={trade.phase === 'evaluation' ? 'secondary' : 'outline'}>
                                {trade.phase === 'evaluation' ? 'EVAL' : 'REAL'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(trade.balanceBefore)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(trade.sl)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(trade.tp)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={trade.outcome === 'TP' ? 'default' : 'destructive'}>
                                {trade.outcome}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right ${trade.balanceAfter > trade.balanceBefore ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(trade.balanceAfter)}
                            </TableCell>
                            <TableCell className={`text-right ${trade.brokerPL > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {trade.brokerPL > 0 ? '+' : ''}{formatCurrency(trade.brokerPL)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              -{formatCurrency(trade.commission)}
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(trade.lots)}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex gap-1 justify-center">
                                {trade.singleStopHit && (
                                  <Badge variant="destructive" className="text-xs">STOP</Badge>
                                )}
                                {trade.marginMoved && (
                                  <Badge variant="outline" className="text-xs">MARGIN</Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
