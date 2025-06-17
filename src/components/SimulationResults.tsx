
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

  // Group results by simulation run (assuming results from same run have similar timestamps)
  const groupedResults = results.reduce((acc, result) => {
    const timestamp = new Date(result.timestamp).toISOString().slice(0, 16); // Group by minute
    if (!acc[timestamp]) {
      acc[timestamp] = [];
    }
    acc[timestamp].push(result);
    return acc;
  }, {} as Record<string, SimulationResult[]>);

  // Create display data - either individual results or averages
  const displayData = Object.entries(groupedResults).map(([timestamp, groupResults]) => {
    if (groupResults.length === 1) {
      // Single client - show individual result
      return {
        ...groupResults[0],
        clientCount: 1,
        isAverage: false
      };
    } else {
      // Multiple clients - show average
      const averages = {
        id: `avg-${timestamp}`,
        timestamp: groupResults[0].timestamp,
        netProfit: groupResults.reduce((acc, curr) => acc + curr.netProfit, 0) / groupResults.length,
        challengesBought: groupResults.reduce((acc, curr) => acc + curr.challengesBought, 0) / groupResults.length,
        challengesWon: groupResults.reduce((acc, curr) => acc + curr.challengesWon, 0) / groupResults.length,
        challengesLost: groupResults.reduce((acc, curr) => acc + curr.challengesLost, 0) / groupResults.length,
        propProfit: groupResults.reduce((acc, curr) => acc + curr.propProfit, 0) / groupResults.length,
        payoutsCost: groupResults.reduce((acc, curr) => acc + curr.payoutsCost, 0) / groupResults.length,
        refundsCost: groupResults.reduce((acc, curr) => acc + curr.refundsCost, 0) / groupResults.length,
        reimburseBrokerLossCost: groupResults.reduce((acc, curr) => acc + curr.reimburseBrokerLossCost, 0) / groupResults.length,
        extractedBrokerProfit: groupResults.reduce((acc, curr) => acc + curr.extractedBrokerProfit, 0) / groupResults.length,
        totalLots: groupResults.reduce((acc, curr) => acc + curr.totalLots, 0) / groupResults.length,
        totalAmountSpent: groupResults.reduce((acc, curr) => acc + curr.totalAmountSpent, 0) / groupResults.length,
        burnWonChallenges: groupResults[0].burnWonChallenges, // Same for all in group
        tradeOutputRandom: groupResults[0].tradeOutputRandom, // Same for all in group
        clientCount: groupResults.length,
        isAverage: true
      };
      return averages;
    }
  });

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
                <TableHead className="min-w-[100px]">Clients</TableHead>
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
              {displayData.map((result) => (
                <TableRow key={result.id} className={result.isAverage ? "bg-muted/30" : ""}>
                  <TableCell className="min-w-[140px]">
                    {new Date(result.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {result.clientCount} {result.isAverage ? '(avg)' : ''}
                  </TableCell>
                  <TableCell className={`text-right ${result.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${result.netProfit.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.isAverage ? result.challengesBought.toFixed(2) : result.challengesBought}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.isAverage ? result.challengesWon.toFixed(2) : result.challengesWon}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.isAverage ? result.challengesLost.toFixed(2) : result.challengesLost}
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
