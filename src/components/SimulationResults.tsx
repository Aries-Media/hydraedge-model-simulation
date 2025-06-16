
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { SimulationResult } from "@/utils/simulation";
import { useLanguage } from "@/contexts/LanguageContext";

interface SimulationResultsProps {
  results: SimulationResult[];
  onClearResults: () => void;
}

export function SimulationResults({
  results,
  onClearResults,
}: SimulationResultsProps) {
  const { t } = useLanguage();
  
  if (results.length === 0) return null;

  // Calculate averages for all numeric columns
  const averages = {
    netProfit: results.reduce((acc, curr) => acc + curr.netProfit, 0) / results.length,
    challengesBought: results.reduce((acc, curr) => acc + curr.challengesBought, 0) / results.length,
    challengesWon: results.reduce((acc, curr) => acc + curr.challengesWon, 0) / results.length,
    challengesLost: results.reduce((acc, curr) => acc + curr.challengesLost, 0) / results.length,
    payoutsCost: results.reduce((acc, curr) => acc + curr.payoutsCost, 0) / results.length,
    refundsCost: results.reduce((acc, curr) => acc + curr.refundsCost, 0) / results.length,
    reimburseBrokerLossCost: results.reduce((acc, curr) => acc + curr.reimburseBrokerLossCost, 0) / results.length,
    extractedBrokerProfit: results.reduce((acc, curr) => acc + curr.extractedBrokerProfit, 0) / results.length,
    totalLots: results.reduce((acc, curr) => acc + curr.totalLots, 0) / results.length,
    propProfit: results.reduce((acc, curr) => acc + curr.propProfit, 0) / results.length,
    totalAmountSpent: results.reduce((acc, curr) => acc + curr.totalAmountSpent, 0) / results.length,
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("simulationResults")}</CardTitle>
          <CardDescription>
            {t("simulationResultsDescription")}
          </CardDescription>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={onClearResults}
          className="ml-4"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t("clearResults")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Timestamp</TableHead>
                <TableHead className="text-right min-w-[100px]">Net Profit</TableHead>
                <TableHead className="text-right min-w-[120px]">Challenges Bought</TableHead>
                <TableHead className="text-right min-w-[120px]">Challenges Won</TableHead>
                <TableHead className="text-right min-w-[120px]">Challenges Lost</TableHead>
                <TableHead className="text-right min-w-[100px]">Payouts Cost</TableHead>
                <TableHead className="text-right min-w-[100px]">Refunds Cost</TableHead>
                <TableHead className="text-right min-w-[140px]">Reimburse Broker Loss Cost</TableHead>
                <TableHead className="text-right min-w-[140px]">Extracted Broker Profit</TableHead>
                <TableHead className="text-right min-w-[100px]">Total Lots</TableHead>
                <TableHead className="text-right min-w-[100px]">Prop Profit</TableHead>
                <TableHead className="text-right min-w-[120px]">Total Amount Spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="min-w-[140px]">
                    {new Date(result.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.netProfit.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.challengesBought}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.challengesWon}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.challengesLost}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.payoutsCost.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.refundsCost.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.reimburseBrokerLossCost.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.extractedBrokerProfit.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.totalLots.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.propProfit.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.totalAmountSpent.toFixed(0)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium bg-muted/50">
                <TableCell>Average</TableCell>
                <TableCell className="text-right">
                  {averages.netProfit.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.challengesBought.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.challengesWon.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.challengesLost.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.payoutsCost.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.refundsCost.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.reimburseBrokerLossCost.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.extractedBrokerProfit.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.totalLots.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.propProfit.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.totalAmountSpent.toFixed(0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
