
import { useState } from "react";
import { SimulationForm } from "@/components/SimulationForm";
import { CustomerResults } from "@/components/CustomerResults";
import { MultiLicenseResults } from "@/components/MultiLicenseResults";
import { TradeHistoryModal } from "@/components/TradeHistoryModal";
import { useToast } from "@/hooks/use-toast";
import { SimulationResult, runSimulation } from "@/utils/simulation";
import { useLanguage } from "@/contexts/LanguageContext";

export function CustomerView() {
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTradeHistory, setSelectedTradeHistory] = useState<{
    tradeHistory: any;
    simulationId: string;
  } | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSimulation = async (values: {
    clientsNumber: number;
    tradesPerClient: number;
    initialBalance: number;
    commissionPerTrade: number;
    burnWonChallenges: boolean;
    maxLossRatio?: number;
    dailyLossRatio?: number;
    targetProfitRatio?: number;
  }) => {
    setIsLoading(true);
    try {
      // Override clientsNumber to always be 1 for customer view
      const customerValues = { ...values, clientsNumber: 1 };
      const result = runSimulation(customerValues);
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
        <SimulationForm
          onSubmit={handleSimulation}
          isLoading={isLoading}
          hideClientsField={true}
          hideTradesField={true}
        />
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
