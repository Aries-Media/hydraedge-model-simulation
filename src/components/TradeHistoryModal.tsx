import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as React from "react";
import type { SimulationTradeHistory } from "@/types/tradeHistory";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface TradeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeHistory: SimulationTradeHistory | undefined | null;
  simulationId: string;
}

type Outcome = "won" | "lost" | "ongoing";
type EndReason = "single_stop" | "max_drawdown" | "profit_target" | "trades_exhausted" | undefined;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const lotsFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtMoney = (n?: number | null) => (typeof n === "number" ? money.format(n) : "—");
const fmtLots = (n?: number | null) => (typeof n === "number" ? lotsFmt.format(n) : "—");

export function TradeHistoryModal({
  isOpen,
  onClose,
  tradeHistory,
  simulationId,
}: TradeHistoryModalProps) {
  // Defensive: normalize and sort by challenge number, then by trade number
  const challenges = React.useMemo(() => {
    const arr = tradeHistory?.challenges ?? [];
    return [...arr].sort((a, b) => (a.challengeNumber ?? 0) - (b.challengeNumber ?? 0)).map(ch => ({
      ...ch,
      trades: [...(ch.trades ?? [])].sort((a, b) => (a.tradeNumber ?? 0) - (b.tradeNumber ?? 0)),
    }));
  }, [tradeHistory]);

  // Derive totals from actual data, not the precomputed fields
  const totals = React.useMemo(() => {
    const totalTrades = challenges.reduce((acc, ch) => acc + (ch.trades?.length ?? 0), 0);
    const firstStart = challenges[0]?.startBalance ?? tradeHistory?.clientInitialBalance ?? 0;
    return {
      initialBalance: firstStart,
      totalChallenges: challenges.length,
      totalTrades,
    };
  }, [challenges, tradeHistory]);

  // Filter tabs
  const [tab, setTab] = React.useState<Outcome | "all">("all");
  const filtered = React.useMemo(() => {
    if (tab === "all") return challenges;
    return challenges.filter(ch => ch.outcome === tab);
  }, [challenges, tab]);

  // Expand/collapse state per challenge
  const [openMap, setOpenMap] = React.useState<Record<number, boolean>>({});
  const toggle = (n: number) => setOpenMap(m => ({ ...m, [n]: !m[n] }));

  // Handle empty history
  const empty = !tradeHistory || challenges.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Trade History — Simulation {simulationId.slice(0, 8)}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[80vh] pr-4">
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="font-medium">Initial Balance:</span> {fmtMoney(totals.initialBalance)}</div>
                  <div><span className="font-medium">Total Challenges:</span> {totals.totalChallenges}</div>
                  <div><span className="font-medium">Total Trades:</span> {totals.totalTrades}</div>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Tabs value={tab} onValueChange={v => setTab(v as any)} className="w-full">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                <TabsTrigger value="won">Won</TabsTrigger>
                <TabsTrigger value="lost">Lost</TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="space-y-4 mt-4">
                {/* Challenges */}
                {empty ? (
                  <Card>
                    <CardContent className="py-6 text-sm text-muted-foreground">
                      No trade history recorded for this run.
                    </CardContent>
                  </Card>
                ) : (
                  filtered.map(challenge => {
                    const n = challenge.challengeNumber ?? 0;
                    const open = openMap[n] ?? true;
                    const end: EndReason = challenge.endReason as any;

                    return (
                      <Card key={n}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => toggle(n)} aria-label="Toggle">
                                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                              <CardTitle className="text-lg">Challenge #{n}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  challenge.outcome === "won"
                                    ? "default"
                                    : challenge.outcome === "lost"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {(challenge.outcome ?? "ongoing").toUpperCase()}
                              </Badge>
                              {end && <Badge variant="outline">{String(end).replace(/_/g, " ").toUpperCase()}</Badge>}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent>
                          {/* Challenge Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 text-sm">
                            <div><span className="font-medium">Start Balance:</span> {fmtMoney(challenge.startBalance)}</div>
                            <div>
                              <span className="font-medium">Final Balance:</span>{" "}
                              {typeof challenge.finalBalance === "number" ? fmtMoney(challenge.finalBalance) : "N/A"}
                            </div>
                            <div><span className="font-medium">Broker Start:</span> {fmtMoney(challenge.brokerStartBalance)}</div>
                            <div><span className="font-medium">Broker Final:</span> {fmtMoney(challenge.finalBrokerBalance)}</div>
                            <div><span className="font-medium">Trades:</span> {challenge.trades?.length ?? 0}</div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-sm bg-muted/50 p-3 rounded">
                              {challenge.extractedBrokerProfit ? (
                                <div><span className="font-medium">Extracted Profit:</span> {fmtMoney(challenge.extractedBrokerProfit)}</div>
                              ) : null}
                              {challenge.payout ? (
                                <div><span className="font-medium">Payout:</span> {fmtMoney(challenge.payout)}</div>
                              ) : null}
                              {challenge.refund ? (
                                <div><span className="font-medium">Refund:</span> {fmtMoney(challenge.refund)}</div>
                              ) : null}
                              {challenge.brokerReimbursement ? (
                                <div><span className="font-medium">Broker Reimb:</span> {fmtMoney(challenge.brokerReimbursement)}</div>
                              ) : null}
                            </div>

                          {/* Trades Table */}
                          {open && (
                            <div className="rounded-md border">
                              <Table>
                                <TableHeader className="sticky top-0 bg-background">
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
                                  {(challenge.trades ?? []).map(trade => {
                                    const gain = (trade.balanceAfter ?? 0) > (trade.balanceBefore ?? 0);
                                    const brokerGain = (trade.brokerPL ?? 0) > 0;
                                    return (
                                      <TableRow key={trade.tradeNumber}>
                                        <TableCell className="font-medium">#{trade.tradeNumber}</TableCell>
                                        <TableCell>
                                          <Badge variant={trade.phase === "evaluation" ? "secondary" : "destructive"} className={trade.phase === "real" ? "bg-destructive text-destructive-foreground" : ""}>
                                            {trade.phase === "evaluation" ? "DEMO" : "REAL"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{fmtMoney(trade.balanceBefore)}</TableCell>
                                        <TableCell className="text-right">{fmtMoney(trade.sl)}</TableCell>
                                        <TableCell className="text-right">{fmtMoney(trade.tp)}</TableCell>
                                        <TableCell className="text-center">
                                          <Badge variant={trade.outcome === "TP" ? "default" : "destructive"}>
                                            {trade.outcome}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className={`text-right ${gain ? "text-green-600" : "text-red-600"}`}>
                                          {fmtMoney(trade.balanceAfter)}
                                        </TableCell>
                                        <TableCell className={`text-right ${brokerGain ? "text-green-600" : "text-red-600"}`}>
                                          {brokerGain ? "+" : ""}{fmtMoney(trade.brokerPL)}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                          {trade.commission ? "-" + fmtMoney(trade.commission) : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">{fmtLots(trade.lots)}</TableCell>
                                        <TableCell className="text-center">
                                          <div className="flex gap-1 justify-center">
                                            {trade.singleStopHit && <Badge variant="destructive" className="text-xs">STOP</Badge>}
                                            {trade.marginMoved && <Badge variant="outline" className="text-xs">MARGIN</Badge>}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

