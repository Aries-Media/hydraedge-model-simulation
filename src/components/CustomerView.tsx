
import { useState } from "react";
import { SimulationForm } from "@/components/SimulationForm";
import { CustomerResults } from "@/components/CustomerResults";
import { useToast } from "@/hooks/use-toast";
import { SimulationResult, runSimulation } from "@/utils/simulation";
import { useLanguage } from "@/contexts/LanguageContext";

export function CustomerView() {
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSimulation = async (values: {
    clientsNumber: number;
    tradesPerClient: number;
    challengeCost: number;
    tpGainChallenge: number;
    slLossChallenge: number;
    tpGainReal: number;
    slLossReal: number;
    propPayout: number;
  }) => {
    setIsLoading(true);
    try {
      // Override clientsNumber to always be 1 for customer view
      const customerValues = { ...values, clientsNumber: 1 };
      const result = runSimulation(customerValues);
      setResults((prev) => [result, ...prev]);
      toast({
        title: t("simulationComplete"),
        description: `${t("netProfit")}: €${result.netProfit.toFixed(2)}`,
      });
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
    toast({
      title: t("resultsCleared"),
      description: t("allResultsCleared"),
    });
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <SimulationForm
        onSubmit={handleSimulation}
        isLoading={isLoading}
        hideClientsField={true}
        hideTradesField={true}
      />
      <CustomerResults
        results={results}
        onClearResults={handleClearResults}
      />
    </div>
  );
}
