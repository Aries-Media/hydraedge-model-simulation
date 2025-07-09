
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { CustomerResults } from "@/components/CustomerResults";
import { MultiLicenseResults } from "@/components/MultiLicenseResults";
import { TradeHistoryModal } from "@/components/TradeHistoryModal";
import { useToast } from "@/hooks/use-toast";
import { SimulationResult, runSimulation } from "@/utils/simulation";
import { useLanguage } from "@/contexts/LanguageContext";
import Decimal from "decimal.js";

export function CustomerView() {
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientsNumber, setClientsNumber] = useState(1);
  const [tradesPerClient, setTradesPerClient] = useState(250);
  const [selectedTradeHistory, setSelectedTradeHistory] = useState<{
    tradeHistory: any;
    simulationId: string;
  } | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSimulation = async () => {
    setIsLoading(true);
    try {
      const values = {
        clientsNumber,
        tradesPerClient,
        initialBalance: 100000, // Default
        commissionPerTrade: 10, // Default
        burnWonChallenges: false, // Default
        tradeOutcomeStrategy: 'fifty_fifty' as const, // As requested
        maxLossRatio: 0.08, // Default
        dailyLossRatio: 0.04, // Default
        targetProfitRatio: 0.08, // Default
        levels: [
          // Original Unbalanced preset for trading levels
          { 
            type: "evaluation", 
            targetProfit: 8, 
            maxLoss: 8, 
            dailyLoss: 4, 
            minTradingDays: 4, 
            maxTradingDays: 30, 
            commission: 10, 
            licensePrice: 900,
            maxBalance: new Decimal(200000),
            sl: new Decimal(8200),
            tp: new Decimal(2000)
          },
          { 
            type: "verification", 
            targetProfit: 4, 
            maxLoss: 8, 
            dailyLoss: 4, 
            minTradingDays: 4, 
            maxTradingDays: 60, 
            commission: 10, 
            licensePrice: 0,
            maxBalance: new Decimal(223000),
            sl: new Decimal(6000),
            tp: new Decimal(2000)
          }
        ],
        realLevels: [
          // Default preset for real levels
          { 
            targetProfit: 8, 
            maxLoss: 8, 
            dailyLoss: 4, 
            minTradingDays: 0, 
            maxTradingDays: 365, 
            commission: 10, 
            withdrawalFee: 10, 
            profitSplit: 80,
            maxBalance: new Decimal(223000),
            sl: new Decimal(6000),
            tp: new Decimal(2000)
          }
        ]
      };
      
      const result = runSimulation(values);
      setLatestResult(result);
      setResults((prev) => [result, ...prev]);
    } catch (error) {
      toast({
        title: t("simulationFailed"),
        description: t("simulationError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearResults = () => {
    setResults([]);
    setLatestResult(null);
  };

  const handleViewTradeHistory = (result: SimulationResult) => {
    if (result.tradeHistory) {
      setSelectedTradeHistory({
        tradeHistory: result.tradeHistory,
        simulationId: result.id
      });
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>{t("simulationParameters")}</CardTitle>
            <CardDescription>
              Simplified customer simulation with default parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientsNumber">{t("clientsNumber")}</Label>
                  <Input
                    id="clientsNumber"
                    type="number"
                    value={clientsNumber}
                    onChange={(e) => setClientsNumber(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tradesPerClient">{t("tradesPerClient")}</Label>
                  <Input
                    id="tradesPerClient"
                    type="number"
                    value={tradesPerClient}
                    onChange={(e) => setTradesPerClient(Number(e.target.value))}
                    min={1}
                  />
                </div>
              </div>
              <Button onClick={handleSimulation} className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("runningSimulation")}
                  </>
                ) : (
                  t("runSimulation")
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <MultiLicenseResults result={latestResult} />
        <CustomerResults
          results={results}
          onClearResults={handleClearResults}
          onViewTradeHistory={handleViewTradeHistory}
        />
      </div>

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
