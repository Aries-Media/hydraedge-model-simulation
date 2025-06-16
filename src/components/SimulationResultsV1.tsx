
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
import { SimulationResultV1 } from "@/utils/simulationV1";
import { useLanguage } from "@/contexts/LanguageContext";

interface SimulationResultsV1Props {
  results: SimulationResultV1[];
  onClearResults: () => void;
}

export function SimulationResultsV1({
  results,
  onClearResults,
}: SimulationResultsV1Props) {
  const { t } = useLanguage();
  
  if (results.length === 0) return null;

  // Calculate averages for all numeric columns
  const averages = {
    netProfit: results.reduce((acc, curr) => acc + curr.netProfit, 0) / results.length,
    challengesBought: results.reduce((acc, curr) => acc + curr.challengesBought, 0) / results.length,
    costOfChallenges: results.reduce((acc, curr) => acc + curr.costOfChallenges, 0) / results.length,
    propWithdraw: results.reduce((acc, curr) => acc + curr.propWithdraw, 0) / results.length,
    challengeRefunds: results.reduce((acc, curr) => acc + curr.challengeRefunds, 0) / results.length,
    brokerWithdraw: results.reduce((acc, curr) => acc + curr.brokerWithdraw, 0) / results.length,
    tradesInReal: results.reduce((acc, curr) => acc + curr.tradesInReal, 0) / results.length,
    payouts: results.reduce((acc, curr) => acc + curr.payouts, 0) / results.length,
    payoutPercentage: results.reduce((acc, curr) => acc + curr.payoutPercentage, 0) / results.length,
    avgProfitPerCustomer: results.reduce((acc, curr) => acc + curr.avgProfitPerCustomer, 0) / results.length,
    totalPropFirmProfit: results.reduce((acc, curr) => acc + curr.totalPropFirmProfit, 0) / results.length,
    avgProfitPerTrade: results.reduce((acc, curr) => acc + curr.avgProfitPerTrade, 0) / results.length,
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>V1 Simulation Results</CardTitle>
          <CardDescription>
            Results from the original simulation model
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
                <TableHead className="text-right min-w-[120px]">Cost of Challenges</TableHead>
                <TableHead className="text-right min-w-[100px]">Prop Withdraw</TableHead>
                <TableHead className="text-right min-w-[120px]">Challenge Refunds</TableHead>
                <TableHead className="text-right min-w-[120px]">Broker Withdraw</TableHead>
                <TableHead className="text-right min-w-[100px]">Trades in Real</TableHead>
                <TableHead className="text-right min-w-[100px]">Payouts</TableHead>
                <TableHead className="text-right min-w-[120px]">Payout Percentage</TableHead>
                <TableHead className="text-right min-w-[140px]">Avg Profit per Customer</TableHead>
                <TableHead className="text-right min-w-[140px]">Total Prop Firm Profit</TableHead>
                <TableHead className="text-right min-w-[120px]">Avg Profit per Trade</TableHead>
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
                    {result.costOfChallenges.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.propWithdraw.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.challengeRefunds.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.brokerWithdraw.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.tradesInReal}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.payouts}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.payoutPercentage.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {result.avgProfitPerCustomer.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.totalPropFirmProfit.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.avgProfitPerTrade.toFixed(2)}
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
                  {averages.costOfChallenges.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.propWithdraw.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.challengeRefunds.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.brokerWithdraw.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.tradesInReal.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.payouts.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.payoutPercentage.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">
                  {averages.avgProfitPerCustomer.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.totalPropFirmProfit.toFixed(0)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.avgProfitPerTrade.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
