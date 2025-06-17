
import { useState } from "react";
import { SimulationForm } from "@/components/SimulationForm";
import { SimulationFormV1 } from "@/components/SimulationFormV1";
import { SimulationResults } from "@/components/SimulationResults";
import { SimulationResultsV1 } from "@/components/SimulationResultsV1";
import { BatchSimulation } from "@/components/BatchSimulation";
import { CustomerView } from "@/components/CustomerView";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useToast } from "@/hooks/use-toast";
import { SimulationResult, runSimulation } from "@/utils/simulation";
import { SimulationResultV1, runSimulationV1 } from "@/utils/simulationV1";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [resultsV1, setResultsV1] = useState<SimulationResultV1[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeVersion, setActiveVersion] = useState<"v1" | "v2">("v2");
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSimulation = async (values: {
    clientsNumber: number;
    tradesPerClient: number;
    initialBalance: number;
    commissionPerTrade: number;
    burnWonChallenges: boolean;
    tradeOutputRandom: boolean;
    levels?: any[];
  }) => {
    setIsLoading(true);
    try {
      const result = runSimulation(values);
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

  const handleSimulationV1 = async (values: {
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
      const result = runSimulationV1(values);
      setResultsV1((prev) => [result, ...prev]);
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
  };

  const handleClearResultsV1 = () => {
    setResultsV1([]);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto space-y-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-6">
            <h1 className="text-4xl font-bold tracking-tight">
              Hydraedge Model Simulation
            </h1>
            <Tabs value={activeVersion} onValueChange={(value) => setActiveVersion(value as "v1" | "v2")} className="w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="v1">V1</TabsTrigger>
                <TabsTrigger value="v2">V2</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <LanguageSelector />
        </div>
        
        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customer">{t("customerView")}</TabsTrigger>
            <TabsTrigger value="single">{t("singleSimulation")}</TabsTrigger>
            <TabsTrigger value="batch">{t("batchSimulations")}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="customer" className="space-y-8">
            <CustomerView />
          </TabsContent>
          
          <TabsContent value="single" className="space-y-8">
            <div className="flex flex-col items-center gap-8">
              {activeVersion === "v2" ? (
                <>
                  <SimulationForm onSubmit={handleSimulation} isLoading={isLoading} />
                  <SimulationResults
                    results={results}
                    onClearResults={handleClearResults}
                  />
                </>
              ) : (
                <>
                  <SimulationFormV1 onSubmit={handleSimulationV1} isLoading={isLoading} />
                  <SimulationResultsV1
                    results={resultsV1}
                    onClearResults={handleClearResultsV1}
                  />
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="batch">
            <BatchSimulation />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
