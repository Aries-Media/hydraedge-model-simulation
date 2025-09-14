
import { CustomerView } from "@/components/CustomerView";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SimulationForm } from "@/components/SimulationForm";
import { SimulationResults } from "@/components/SimulationResults";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// NEW: import the new API surface
import {
  type SimulationResult,
  // legacy entry is still there if you want fallback
  // runSimulationAndDisplay,
} from "@/sim";
import { runWithChallenge } from "@/sim/engine/run";
import { registerChallenge } from "@/sim/registry";
import { toDec } from "@/sim/constants";
import type { Challenge } from "@/sim/contracts";
import type { LevelRule, BalanceDistribution } from "@/sim/types";

type UIOnSubmit =
  | {
      // Preset-run path
      kind: "preset";
      challengeId: "fast_regular" | "super_plus";
      hedgeId?: "default" | "new4";
      outcomeStrategy:
        | "fifty_fifty"
        | "geometric_distance"
        | "logarithmic_distance"
        | "average"
        | "burn_after_sl";
      clientsNumber: number;
      tradesPerClient: number;
      commissionPerTrade: number;
      initialBalance: number;
      balanceDistribution?: BalanceDistribution[];
      burnWonChallenges: boolean;
    }
  | {
      // Custom-run path
      kind: "custom";
      customId: string; // e.g. "custom-<timestamp>"
      hedgeId?: "default" | "new4";
      outcomeStrategy:
        | "fifty_fifty"
        | "geometric_distance"
        | "logarithmic_distance"
        | "average"
        | "burn_after_sl";
      clientsNumber: number;
      tradesPerClient: number;
      commissionPerTrade: number;
      initialBalance: number;
      balanceDistribution?: BalanceDistribution[];
      burnWonChallenges: boolean;

      // custom specifics
      risk: { maxLoss: number; dailyLoss: number; targetProfit: number }; // decimals like 0.07
      levels: LevelRule[];
      realLevels: LevelRule[];
    };

const Index = () => {
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSimulation = async (payload: UIOnSubmit) => {
    setIsLoading(true);
    try {
      let result: SimulationResult;

      if (payload.kind === "preset") {
        // Run directly with preset challenge + hedge IDs
        result = runWithChallenge({
          challengeId: payload.challengeId,
          hedgeId: payload.hedgeId ?? "default",
          outcomeStrategy: payload.outcomeStrategy,
          clientsNumber: payload.clientsNumber,
          tradesPerClient: payload.tradesPerClient,
          commissionPerTrade: payload.commissionPerTrade,
          initialBalance: payload.initialBalance,
          balanceDistribution: payload.balanceDistribution,
          burnWonChallenges: payload.burnWonChallenges,
        });
      } else {
        // Register a one-off custom Challenge using the UI-provided config
        const { customId, risk, levels, realLevels } = payload;

        const customChallenge: Challenge = {
          id: customId,
          risk() {
            return {
              maxLossRatio: toDec(risk.maxLoss),
              dailyLossRatio: toDec(risk.dailyLoss),
              targetProfitRatio: toDec(risk.targetProfit),
            };
          },
          economics(initialBalance) {
            // keep the same scaling as the engine defaults
            const scale = initialBalance.div(200000);
            return {
              challengeCost: toDec(900).times(scale),
              tradeLots: toDec(8).times(scale),
              brokerSeed: toDec(6000).times(scale),
            };
          },
          levels() {
            return {
              getEvaluationLevels: () => levels,
              getRealLevels: () => realLevels,
            };
          },
          payoutPolicy(initialBalance) {
            // identical to default burn behavior: refund challengeCost + broker reimb, no payout
            const pct = toDec(0.02);
            return {
              profitCyclePayoutPct: () => pct,
              onBurnedWin: ({ brokerSeed, challengeCost, brokerBalance }) => {
                const brokerReimb = brokerBalance.lt(brokerSeed)
                  ? brokerSeed.minus(brokerBalance)
                  : toDec(0);
                return { refund: challengeCost, payout: toDec(0), brokerReimb };
              },
            };
          },
        };

        registerChallenge(customChallenge);

        result = runWithChallenge({
          challengeId: customId,
          hedgeId: payload.hedgeId ?? "default",
          outcomeStrategy: payload.outcomeStrategy,
          clientsNumber: payload.clientsNumber,
          tradesPerClient: payload.tradesPerClient,
          commissionPerTrade: payload.commissionPerTrade,
          initialBalance: payload.initialBalance,
          balanceDistribution: payload.balanceDistribution,
          burnWonChallenges: payload.burnWonChallenges,
        });
      }

      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error(error);
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto space-y-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Hydraedge Model Simulation
          </h1>
          <LanguageSelector />
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">{t("singleSimulation")}</TabsTrigger>
            <TabsTrigger value="customer">{t("customerView")}</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-8">
            <div className="flex flex-col items-center gap-8">
              <SimulationForm onSubmit={handleSimulation} isLoading={isLoading} />
              <SimulationResults results={results} onClearResults={handleClearResults} />
            </div>
          </TabsContent>


          <TabsContent value="customer" className="space-y-8">
            <CustomerView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;

