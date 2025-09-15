
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
import { SimulationResult } from "@/sim";
import { runWithChallenge } from "@/sim/engine/run";
import { useLanguage } from "@/contexts/LanguageContext";

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
      const result = runWithChallenge({
        challengeId: 'fast_regular',
        strategyId: 'default',
        outcomeStrategy: 'fifty_fifty',
        clientsNumber,
        tradesPerClient,
        commissionPerTrade: 10,
        burnWonChallenges: false,
      });
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
              <Button onClick={handleSimulation} className="w-full bg-success hover:bg-success/90 text-success-foreground" disabled={isLoading}>
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
