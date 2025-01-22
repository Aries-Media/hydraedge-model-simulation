import { useState } from "react";
import { SimulationForm } from "@/components/SimulationForm";
import { SimulationResults } from "@/components/SimulationResults";
import { BatchSimulation } from "@/components/BatchSimulation";
import { useToast } from "@/hooks/use-toast";
import { SimulationResult, runSimulation } from "@/utils/simulation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
      const result = runSimulation(values);
      setResults((prev) => [result, ...prev]);
      toast({
        title: "Simulation Complete",
        description: `Net Profit: €${result.netProfit.toFixed(2)}`,
      });
    } catch (error) {
      toast({
        title: "Simulation Failed",
        description: "An error occurred while running the simulation.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearResults = () => {
    setResults([]);
    toast({
      title: "Results Cleared",
      description: "All simulation results have been cleared.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Hydraedge Model Simulation
          </h1>
        </div>
        
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Simulation</TabsTrigger>
            <TabsTrigger value="batch">Batch Simulations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single" className="space-y-8">
            <div className="flex flex-col items-center gap-8">
              <SimulationForm onSubmit={handleSimulation} isLoading={isLoading} />
              <SimulationResults
                results={results}
                onClearResults={handleClearResults}
              />
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