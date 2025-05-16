
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

interface CustomerResultsProps {
  results: SimulationResult[];
  onClearResults: () => void;
}

export function CustomerResults({
  results,
  onClearResults,
}: CustomerResultsProps) {
  const { t } = useLanguage();
  
  if (results.length === 0) return null;

  // Calculate averages for numeric columns
  const averages = {
    netProfit: results.reduce((acc, curr) => acc + curr.netProfit, 0) / results.length,
    challengesBought: results.reduce((acc, curr) => acc + curr.challengesBought, 0) / results.length,
    costOfChallenges: results.reduce((acc, curr) => acc + curr.costOfChallenges, 0) / results.length,
    challengeRefunds: results.reduce((acc, curr) => acc + curr.challengeRefunds, 0) / results.length,
    tradesInReal: results.reduce((acc, curr) => acc + curr.tradesInReal, 0) / results.length,
    payouts: results.reduce((acc, curr) => acc + curr.payouts, 0) / results.length,
    payoutPercentage: results.reduce((acc, curr) => acc + curr.payoutPercentage, 0) / results.length,
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("customerSimulationResults")}</CardTitle>
          <CardDescription>
            {t("customerSimulationResultsDescription")}
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("timestamp")}</TableHead>
                <TableHead className="text-right">{t("netProfitEuro")}</TableHead>
                <TableHead className="text-right">{t("challengesBought")}</TableHead>
                <TableHead className="text-right">{t("challengeCostEuro")}</TableHead>
                <TableHead className="text-right">{t("challengeRefundsEuro")}</TableHead>
                <TableHead className="text-right">{t("tradesInRealColumn")}</TableHead>
                <TableHead className="text-right">{t("payoutsColumn")}</TableHead>
                <TableHead className="text-right">{t("payoutPercentageColumn")}</TableHead>
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
                    {result.challengeRefunds.toFixed(2)}
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
              <TableRow className="font-medium bg-muted/50">
                <TableCell>{t("average")}</TableCell>
                <TableCell className="text-right">
                  {averages.netProfit.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.challengesBought.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.costOfChallenges.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.challengeRefunds.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.tradesInReal.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.payouts.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {averages.payoutPercentage.toFixed(2)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
