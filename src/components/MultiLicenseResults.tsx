
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
import { SimulationResult } from "@/sim";
import { useLanguage } from "@/contexts/LanguageContext";

interface MultiLicenseResultsProps {
  result: SimulationResult | null;
}

export function MultiLicenseResults({ result }: MultiLicenseResultsProps) {
  const { t } = useLanguage();

  if (!result) return null;

  // Generate results for 1-5 licenses with variance
  const licenseResults = Array.from({ length: 5 }, (_, i) => {
    // Add a variance factor between -10% and +10%
    const getVariance = () => (Math.random() * 0.2) - 0.1; // -0.1 to 0.1 (±10%)
    
    const multiplier = i + 1;
    return {
      licenses: multiplier,
      netProfit: result.netProfit * multiplier * (1 + getVariance()),
      challengesBought: Math.round(result.challengesBought * multiplier * (1 + getVariance())),
      costOfChallenges: result.costOfChallenges * multiplier * (1 + getVariance()),
      challengeRefunds: result.challengeRefunds * multiplier * (1 + getVariance()),
      tradesInReal: Math.round(result.tradesInReal * multiplier * (1 + getVariance())),
      payouts: Math.round(result.payouts * multiplier * (1 + getVariance())),
      payoutPercentage: result.payoutPercentage * (1 + getVariance()/2), // Less variance on percentage
    };
  });

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>{t("licensesScalingTitle")}</CardTitle>
        <CardDescription>{t("licensesScalingDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("metrics")}</TableHead>
                {licenseResults.map((item) => (
                  <TableHead key={item.licenses} className="text-center">
                    {item.licenses} {t("licenses")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{t("netProfit")}</TableCell>
                {licenseResults.map((item) => (
                  <TableCell key={`profit-${item.licenses}`} className="text-right">
                    €{item.netProfit.toFixed(2)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">{t("challenges")}</TableCell>
                {licenseResults.map((item) => (
                  <TableCell key={`challenges-${item.licenses}`} className="text-right">
                    {item.challengesBought}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">{t("challengeCost")}</TableCell>
                {licenseResults.map((item) => (
                  <TableCell key={`cost-${item.licenses}`} className="text-right">
                    €{item.costOfChallenges.toFixed(2)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">{t("challengeRefunds")}</TableCell>
                {licenseResults.map((item) => (
                  <TableCell key={`refunds-${item.licenses}`} className="text-right">
                    €{item.challengeRefunds.toFixed(2)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">{t("tradesInReal")}</TableCell>
                {licenseResults.map((item) => (
                  <TableCell key={`trades-${item.licenses}`} className="text-right">
                    {item.tradesInReal}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">{t("payouts")}</TableCell>
                {licenseResults.map((item) => (
                  <TableCell key={`payouts-${item.licenses}`} className="text-right">
                    {item.payouts}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">{t("payoutPercentage")}</TableCell>
                {licenseResults.map((item) => (
                  <TableCell key={`percentage-${item.licenses}`} className="text-right">
                    {item.payoutPercentage.toFixed(2)}%
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
