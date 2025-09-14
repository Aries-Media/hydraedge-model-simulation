
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Eye, Settings2 } from "lucide-react";
import { SimulationResult } from "@/sim";
import { TradeHistoryModal } from "@/components/TradeHistoryModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";

interface SimulationResultsProps {
  results: SimulationResult[];
  onClearResults: () => void;
}

export function SimulationResults({
  results,
  onClearResults
}: SimulationResultsProps) {
  const { t } = useLanguage();
  const [selectedTradeHistory, setSelectedTradeHistory] = useState<{
    tradeHistory: any;
    simulationId: string;
  } | null>(null);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    timestamp: false,
    clients: true,
    customerProfit: true,
    challengesBought: true,
    challengesLost: true,
    challengesWon: true,
    totalPropProfit: true,
    avgPropProfit: true,
    payoutsCost: true,
    refundsCost: true,
    reimburseBrokerLoss: true,
    extractedBrokerProfit: true,
    totalLots: true,
    totalAmountSpent: true,
    burnWonChallenges: true,
    tradeOutputRandom: true,
    actions: true
  });

  const columns = [
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'clients', label: '# Clients' },
    { key: 'customerProfit', label: 'Customer Profit' },
    { key: 'challengesBought', label: 'Challenges Bought' },
    { key: 'challengesLost', label: 'Challenges Lost' },
    { key: 'challengesWon', label: 'Challenges Won' },
    { key: 'totalPropProfit', label: 'Total Prop Profit' },
    { key: 'avgPropProfit', label: 'Avg Prop Profit' },
    { key: 'payoutsCost', label: 'Payouts Cost' },
    { key: 'refundsCost', label: 'Refunds Cost' },
    { key: 'reimburseBrokerLoss', label: 'Reimburse Broker Loss Cost' },
    { key: 'extractedBrokerProfit', label: 'Extracted Broker Profit' },
    { key: 'totalLots', label: 'Total Lots' },
    { key: 'totalAmountSpent', label: 'Total Amount Spent' },
    { key: 'burnWonChallenges', label: 'Burn Won Challenges' },
    { key: 'tradeOutputRandom', label: 'Trade Output Random' },
    { key: 'actions', label: 'Actions' }
  ];

  const toggleColumn = (columnKey: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey as keyof typeof prev]
    }));
  };

  if (results.length === 0) return null;

  const handleRowClick = (result: SimulationResult) => {
    if (result.tradeHistory && result.clientsNumber === 1) {
      setSelectedTradeHistory({
        tradeHistory: result.tradeHistory,
        simulationId: result.id
      });
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("simulationResults")}</CardTitle>
            <CardDescription>
              {t("simulationResultsDescription")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Toggle columns</h4>
                  <div className="space-y-2">
                    {columns.map(column => (
                      <div key={column.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={column.key}
                          checked={columnVisibility[column.key as keyof typeof columnVisibility]}
                          onCheckedChange={() => toggleColumn(column.key)}
                        />
                        <label
                          htmlFor={column.key}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {column.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="destructive" size="sm" onClick={onClearResults}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t("clearResults")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnVisibility.timestamp && <TableHead className="min-w-[140px]">Timestamp</TableHead>}
                  {columnVisibility.clients && <TableHead className="text-center min-w-[100px]"># Clients</TableHead>}
                  {columnVisibility.customerProfit && <TableHead className="text-right min-w-[100px]">Customer Net Profit</TableHead>}
                  {columnVisibility.challengesBought && <TableHead className="text-right min-w-[120px]">Challenges Bought</TableHead>}
                  {columnVisibility.challengesLost && <TableHead className="text-right min-w-[120px]">Challenges Lost</TableHead>}
                  {columnVisibility.challengesWon && <TableHead className="text-right min-w-[120px]">Challenges Won</TableHead>}
                  {columnVisibility.totalPropProfit && <TableHead className="text-right min-w-[120px]">Total Prop Profit</TableHead>}
                  {columnVisibility.avgPropProfit && <TableHead className="text-right min-w-[120px]">Avg Prop Profit</TableHead>}
                  {columnVisibility.payoutsCost && <TableHead className="text-right min-w-[100px]">Payouts Cost</TableHead>}
                  {columnVisibility.refundsCost && <TableHead className="text-right min-w-[100px]">Refunds Cost</TableHead>}
                  {columnVisibility.reimburseBrokerLoss && <TableHead className="text-right min-w-[140px]">Reimburse Broker Loss Cost</TableHead>}
                  {columnVisibility.extractedBrokerProfit && <TableHead className="text-right min-w-[140px]">Extracted Broker Profit</TableHead>}
                  {columnVisibility.totalLots && <TableHead className="text-right min-w-[100px]">Total Lots</TableHead>}
                  {columnVisibility.totalAmountSpent && <TableHead className="text-right min-w-[120px]">Total Amount Spent</TableHead>}
                  {columnVisibility.burnWonChallenges && <TableHead className="text-center min-w-[120px]">Burn Won Challenges</TableHead>}
                  {columnVisibility.tradeOutputRandom && <TableHead className="text-center min-w-[120px]">Trade Output Random</TableHead>}
                  {columnVisibility.actions && <TableHead className="text-center min-w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(result => {
                  const hasTradeHistory = result.tradeHistory && result.clientsNumber === 1;
                  return (
                    <TableRow 
                      key={result.id}
                      className={hasTradeHistory ? "cursor-pointer hover:bg-muted/50" : ""}
                      onClick={() => handleRowClick(result)}
                    >
                      {columnVisibility.timestamp && (
                        <TableCell className="min-w-[140px]">
                          {new Date(result.timestamp).toLocaleString()}
                        </TableCell>
                      )}
                      {columnVisibility.clients && (
                        <TableCell className="text-center">
                          {result.clientsNumber || 'N/A'}
                        </TableCell>
                      )}
                      {columnVisibility.customerProfit && (
                        <TableCell className={`text-right ${result.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${result.netProfit.toFixed(0)}
                        </TableCell>
                      )}
                      {columnVisibility.challengesBought && (
                        <TableCell className="text-right">
                          {result.challengesBought.toFixed(1)}
                        </TableCell>
                      )}
                      {columnVisibility.challengesLost && (
                        <TableCell className="text-right">
                          {result.challengesLost.toFixed(1)}
                        </TableCell>
                      )}
                      {columnVisibility.challengesWon && (
                        <TableCell className="text-right">
                          {result.challengesWon.toFixed(1)}
                        </TableCell>
                      )}
                      {columnVisibility.totalPropProfit && (
                        <TableCell className={`text-right ${result.totalPropProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${result.totalPropProfit.toFixed(0)}
                        </TableCell>
                      )}
                      {columnVisibility.avgPropProfit && (
                        <TableCell className={`text-right ${result.propProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${result.propProfit.toFixed(0)}
                        </TableCell>
                      )}
                      {columnVisibility.payoutsCost && (
                        <TableCell className="text-right text-warning">
                          ${result.payoutsCost.toFixed(0)}
                        </TableCell>
                      )}
                      {columnVisibility.refundsCost && (
                        <TableCell className="text-right text-warning">
                          ${result.refundsCost.toFixed(0)}
                        </TableCell>
                      )}
                      {columnVisibility.reimburseBrokerLoss && (
                        <TableCell className="text-right text-warning">
                          ${result.reimburseBrokerLossCost.toFixed(0)}
                        </TableCell>
                      )}
                      {columnVisibility.extractedBrokerProfit && (
                        <TableCell className="text-right text-success">
                          ${result.extractedBrokerProfit.toFixed(0)}
                        </TableCell>
                      )}
                      {columnVisibility.totalLots && (
                        <TableCell className="text-right">
                          {result.totalLots.toFixed(0)}
                        </TableCell>
                      )}
                      {columnVisibility.totalAmountSpent && (
                        <TableCell className="text-right">
                          ${result.totalAmountSpent.toFixed(0)}
                        </TableCell>
                      )}
                      {columnVisibility.burnWonChallenges && (
                        <TableCell className="text-center">
                          {result.burnWonChallenges ? "Yes" : "No"}
                        </TableCell>
                      )}
                      {columnVisibility.tradeOutputRandom && (
                        <TableCell className="text-center">
                          {result.tradeOutcomeStrategy || 'geometric_distance'}
                        </TableCell>
                      )}
                      {columnVisibility.actions && (
                        <TableCell className="text-center">
                          {hasTradeHistory && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(result);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedTradeHistory && (
        <TradeHistoryModal
          isOpen={true}
          onClose={() => setSelectedTradeHistory(null)}
          tradeHistory={selectedTradeHistory.tradeHistory}
          simulationId={selectedTradeHistory.simulationId}
        />
      )}
    </>
  );
}
