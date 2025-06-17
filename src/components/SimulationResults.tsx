
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
                <TableHead className="text-center min-w-[100px]">Clients</TableHead>
                <TableHead className="text-right min-w-[100px]">Net Profit</TableHead>
                <TableHead className="text-right min-w-[120px]">Challenges Bought</TableHead>
                <TableHead className="text-right min-w-[120px]">Challenges Won</TableHead>
                <TableHead className="text-right min-w-[120px]">Challenges Lost</TableHead>
                <TableHead className="text-right min-w-[100px]">Prop Profit</TableHead>
                <TableHead className="text-right min-w-[100px]">Payouts Cost</TableHead>
                <TableHead className="text-right min-w-[100px]">Refunds Cost</TableHead>
                <TableHead className="text-right min-w-[140px]">Reimburse Broker Loss Cost</TableHead>
                <TableHead className="text-right min-w-[140px]">Extracted Broker Profit</TableHead>
                <TableHead className="text-right min-w-[100px]">Total Lots</TableHead>
                <TableHead className="text-right min-w-[120px]">Total Amount Spent</TableHead>
                <TableHead className="text-center min-w-[120px]">Burn Won Challenges</TableHead>
                <TableHead className="text-center min-w-[120px]">Trade Output Random</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="min-w-[140px]">
                    {new Date(result.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.clientsNumber || 'N/A'}
                  </TableCell>
                  <TableCell className={`text-right ${result.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${result.netProfit.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.challengesBought.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.challengesWon.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.challengesLost.toFixed(1)}
                  </TableCell>
                  <TableCell className={`text-right ${result.propProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${result.propProfit.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${result.payoutsCost.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${result.refundsCost.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${result.reimburseBrokerLossCost.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${result.extractedBrokerProfit.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.totalLots.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${result.totalAmountSpent.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.burnWonChallenges ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.tradeOutputRandom ? "Yes" : "No"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
