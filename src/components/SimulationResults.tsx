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

interface SimulationResultsProps {
  results: SimulationResult[];
  onClearResults: () => void;
}

export function SimulationResults({
  results,
  onClearResults,
}: SimulationResultsProps) {
  if (results.length === 0) return null;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Simulation Results</CardTitle>
          <CardDescription>
            Historical results from all simulation runs
          </CardDescription>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={onClearResults}
          className="ml-4"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Results
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Net Profit (€)</TableHead>
                <TableHead className="text-right">Challenges</TableHead>
                <TableHead className="text-right">Challenge Cost (€)</TableHead>
                <TableHead className="text-right">Prop Withdraw (€)</TableHead>
                <TableHead className="text-right">Broker Withdraw (€)</TableHead>
                <TableHead className="text-right">Trades in Real</TableHead>
                <TableHead className="text-right">Payouts</TableHead>
                <TableHead className="text-right">Payout %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    {new Date(result.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.netProfit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.challengesBought}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.costOfChallenges.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.propWithdraw.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.brokerWithdraw.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {result.tradesInReal}
                  </TableCell>
                  <TableCell className="text-right">{result.payouts}</TableCell>
                  <TableCell className="text-right">
                    {result.payoutPercentage.toFixed(2)}%
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