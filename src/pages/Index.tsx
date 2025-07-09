import { BatchSimulation } from "@/components/BatchSimulation";
import { CustomerView } from "@/components/CustomerView";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SimulationForm } from "@/components/SimulationForm";
import { SimulationResults } from "@/components/SimulationResults";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
	type SimulationResult,
	runSimulationAndDisplay,
} from "@/utils/simulation";
import { useState } from "react";

const Index = () => {
	const [results, setResults] = useState<SimulationResult[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const { toast } = useToast();
	const { t } = useLanguage();

	const handleSimulation = async (values: {
		clientsNumber: number;
		tradesPerClient: number;
		initialBalance: number;
		commissionPerTrade: number;
		burnWonChallenges: boolean;
		tradeOutcomeStrategy: 'fifty_fifty' | 'geometric_distance' | 'logarithmic_distance' | 'average';
		levels?: any[];
	}) => {
		setIsLoading(true);
		try {
			console.log("Running simulation", values);
			const result = runSimulationAndDisplay(values);

			// Handle both single result and array of results
			if (Array.isArray(result)) {
				setResults((prev) => [...result, ...prev]);
			} else {
				setResults((prev) => [result, ...prev]);
			}
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
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="single">{t("singleSimulation")}</TabsTrigger>
						<TabsTrigger value="batch">{t("batchSimulations")}</TabsTrigger>
            <TabsTrigger value="customer">{t("customerView")}</TabsTrigger>
					</TabsList>

					<TabsContent value="single" className="space-y-8">
						<div className="flex flex-col items-center gap-8">
							<SimulationForm
								onSubmit={handleSimulation}
								isLoading={isLoading}
							/>
							<SimulationResults
								results={results}
								onClearResults={handleClearResults}
							/>
						</div>
					</TabsContent>

					<TabsContent value="batch">
						<BatchSimulation />
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
