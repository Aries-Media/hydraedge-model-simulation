import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SimulationResult, runSimulation } from "@/utils/simulation";
import { SimulationResults } from "@/components/SimulationResults";
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
  const { toast } = useToast();

  const runBatchSimulation = async () => {
    setIsLoading(true);
    const results: SimulationResult[] = [];
    const n = parseInt(numSimulations);

    try {
      for (let i = 0; i < n; i++) {
        const result = runSimulation({
          clientsNumber: 500,
          tradesPerClient: 250,
          challengeCost: 900,
        });
        results.push(result);
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
        costOfChallenges:
          batchResults.reduce((acc, curr) => acc + curr.costOfChallenges, 0) /
          batchResults.length,
        propWithdraw:
          batchResults.reduce((acc, curr) => acc + curr.propWithdraw, 0) /
          batchResults.length,
        brokerWithdraw:
          batchResults.reduce((acc, curr) => acc + curr.brokerWithdraw, 0) /
          batchResults.length,
        tradesInReal:
          batchResults.reduce((acc, curr) => acc + curr.tradesInReal, 0) /
          batchResults.length,
        payouts:
          batchResults.reduce((acc, curr) => acc + curr.payouts, 0) /
          batchResults.length,
        payoutPercentage:
          batchResults.reduce((acc, curr) => acc + curr.payoutPercentage, 0) /
          batchResults.length,
      }
    : null;

  return (
    <div className="space-y-8">
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
          {isLoading ? "Running..." : "Run Batch Simulation"}
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
              <Label>Prop Withdraw</Label>
              <div className="text-2xl font-bold">€{averages.propWithdraw.toFixed(2)}</div>
            </div>
            <div>
              <Label>Payout Percentage</Label>
              <div className="text-2xl font-bold">{averages.payoutPercentage.toFixed(2)}%</div>
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