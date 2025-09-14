import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SimulationResult, runSimulationAndDisplay } from "@/sim";
import { SimulationResults } from "@/components/SimulationResults";
import { SimulationForm } from "@/components/SimulationForm";
import { Loader2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

export function BatchSimulation() {
  const [numSimulations, setNumSimulations] = useState("100");
  const [isLoading, setIsLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<SimulationResult[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [params, setParams] = useState({
    clientsNumber: 500,
    tradesPerClient: 250,
    initialBalance: 200000,
    commissionPerTrade: 10,
    burnWonChallenges: true,
  });
  const { toast } = useToast();

  const runBatchSimulation = async () => {
    setIsLoading(true);
    const results: SimulationResult[] = [];
    const n = parseInt(numSimulations);

    try {
      for (let i = 0; i < n; i++) {
        const result = runSimulationAndDisplay(params);
        
        // Handle both single result and array of results
        if (Array.isArray(result)) {
          results.push(...result);
        } else {
          results.push(result);
        }
      }

      setBatchResults(results);
      toast({
        title: "Batch Simulation Complete",
        description: `Completed ${n} simulations successfully.`,
      });
    } catch (error) {
      toast({
        title: "Simulation Failed",
        description: "An error occurred during batch simulation.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const averages = batchResults.length
    ? {
        netProfit:
          batchResults.reduce((acc, curr) => acc + curr.netProfit, 0) /
          batchResults.length,
        challengesBought:
          batchResults.reduce((acc, curr) => acc + curr.challengesBought, 0) /
          batchResults.length,
        challengesWon:
          batchResults.reduce((acc, curr) => acc + curr.challengesWon, 0) /
          batchResults.length,
        challengesLost:
          batchResults.reduce((acc, curr) => acc + curr.challengesLost, 0) /
          batchResults.length,
        payoutsCost:
          batchResults.reduce((acc, curr) => acc + curr.payoutsCost, 0) /
          batchResults.length,
        refundsCost:
          batchResults.reduce((acc, curr) => acc + curr.refundsCost, 0) /
          batchResults.length,
        reimburseBrokerLossCost:
          batchResults.reduce((acc, curr) => acc + curr.reimburseBrokerLossCost, 0) /
          batchResults.length,
        extractedBrokerProfit:
          batchResults.reduce((acc, curr) => acc + curr.extractedBrokerProfit, 0) /
          batchResults.length,
        totalLots:
          batchResults.reduce((acc, curr) => acc + curr.totalLots, 0) /
          batchResults.length,
        propProfit:
          batchResults.reduce((acc, curr) => acc + curr.propProfit, 0) /
          batchResults.length,
        totalAmountSpent:
          batchResults.reduce((acc, curr) => acc + curr.totalAmountSpent, 0) /
          batchResults.length,
      }
    : null;

  return (
    <div className="space-y-8">
      <SimulationForm 
        onSubmit={(values) => {
          setParams(values);
          toast({
            title: "Parameters Updated",
            description: "Simulation parameters have been updated.",
          });
        }} 
        isLoading={isLoading}
        showSubmitButton={false}
      />

      <div className="flex gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="numSimulations">Number of Simulations</Label>
          <Input
            id="numSimulations"
            type="number"
            value={numSimulations}
            onChange={(e) => setNumSimulations(e.target.value)}
            min="1"
            className="w-[200px]"
          />
        </div>
        <Button onClick={runBatchSimulation} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            "Run Batch Simulation"
          )}
        </Button>
      </div>

      {averages && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Batch Simulation Averages</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Net Profit</Label>
              <div className="text-2xl font-bold">€{averages.netProfit.toFixed(2)}</div>
            </div>
            <div>
              <Label>Challenges Bought</Label>
              <div className="text-2xl font-bold">{averages.challengesBought.toFixed(2)}</div>
            </div>
            <div>
              <Label>Challenges Won</Label>
              <div className="text-2xl font-bold">{averages.challengesWon.toFixed(2)}</div>
            </div>
            <div>
              <Label>Challenges Lost</Label>
              <div className="text-2xl font-bold">{averages.challengesLost.toFixed(2)}</div>
            </div>
            <div>
              <Label>Payouts Cost</Label>
              <div className="text-2xl font-bold">€{averages.payoutsCost.toFixed(2)}</div>
            </div>
            <div>
              <Label>Refunds Cost</Label>
              <div className="text-2xl font-bold">€{averages.refundsCost.toFixed(2)}</div>
            </div>
            <div>
              <Label>Broker Loss Reimburse</Label>
              <div className="text-2xl font-bold">€{averages.reimburseBrokerLossCost.toFixed(2)}</div>
            </div>
            <div>
              <Label>Extracted Broker Profit</Label>
              <div className="text-2xl font-bold">€{averages.extractedBrokerProfit.toFixed(2)}</div>
            </div>
          </div>

          <Collapsible
            open={isDetailsOpen}
            onOpenChange={setIsDetailsOpen}
            className="mt-6"
          >
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <ChevronRight
                  className={`h-4 w-4 mr-2 transition-transform ${
                    isDetailsOpen ? "rotate-90" : ""
                  }`}
                />
                {isDetailsOpen ? "Hide Details" : "Show Details"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <SimulationResults
                results={batchResults}
                onClearResults={() => setBatchResults([])}
              />
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
}
