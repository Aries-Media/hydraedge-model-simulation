import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import type { BalanceDistribution, LevelRule } from "@/utils/simulation";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";

// Define preset trading levels
const PRESET_LEVELS = {
	original: [
		{
			maxBalance: "200000",
			sl: "6000",
			tp: "6000",
		},
		{
			maxBalance: "223000",
			sl: "6000",
			tp: "6000",
		},
		{
			maxBalance: "228000",
			sl: "6000",
			tp: "",
		},
	],
	default: [
		{
			maxBalance: "200000",
			sl: "8200",
			tp: "5000",
		},
		{
			maxBalance: "223000",
			sl: "6000",
			tp: "5000",
		},
		{
			maxBalance: "228000",
			sl: "6000",
			tp: "",
		},
	],
	new: [
		{
			maxBalance: "200000",
			sl: "10200",
			tp: "6000",
		},
		{
			maxBalance: "206000",
			sl: "8000",
			tp: "6000",
		},
		{
			maxBalance: "212000",
			sl: "11000",
			tp: "5000",
		},
		{
			maxBalance: "217000",
			sl: "8000",
			tp: "5000",
		},
		{
			maxBalance: "222000",
			sl: "11500",
			tp: "4000",
		},
		{
			maxBalance: "226000",
			sl: "8000",
			tp: "4000",
		},
		{
			maxBalance: "230000",
			sl: "8000",
			tp: "",
		},
	],
	new4: [
		{
			maxBalance: "200000",
			sl: "10200",
			tp: "8000",
		},
		{
			maxBalance: "208000",
			sl: "10400",
			tp: "7800",
		},
		{
			maxBalance: "215800",
			sl: "10800",
			tp: "7800",
		},
		{
			maxBalance: "223600",
			sl: "11200",
			tp: "7800",
		},
		{
			maxBalance: "230000",
			sl: "11200",
			tp: "",
		},
	],
	mid: [
		{
			maxBalance: "200000",
			sl: "8200",
			tp: "6000",
		},
		{
			maxBalance: "206000",
			sl: "7000",
			tp: "6000",
		},
		{
			maxBalance: "212000",
			sl: "8400",
			tp: "6000",
		},
		{
			maxBalance: "218000",
			sl: "7000",
			tp: "6000",
		},
		{
			maxBalance: "224000",
			sl: "8800",
			tp: "",
		},
		{
			maxBalance: "228000",
			sl: "7000",
			tp: "",
		},
	],
	blank: [],
};

// Define preset trading real levels
const PRESET_REAL_LEVELS = {
	original: [
		{
			maxBalance: "200000",
			sl: "7000",
			tp: "2000",
		},
		{
			maxBalance: "223000",
			sl: "7000",
			tp: "2000",
		},
	],
	default: [
		{
			maxBalance: "200000",
			sl: "7000",
			tp: "2000",
		},
		{
			maxBalance: "223000",
			sl: "7000",
			tp: "2000",
		},
	],
	new4: [],
	blank: [],
};

const levelRuleSchema = z.object({
	maxBalance: z.string().refine((val) => {
		const num = Number.parseFloat(val);
		return !Number.isNaN(num) && num > 0;
	}, "Must be a positive number"),
	sl: z.string().refine((val) => {
		const num = Number.parseFloat(val);
		return !Number.isNaN(num) && num > 0;
	}, "Must be a positive number"),
	tp: z
		.string()
		.optional()
		.refine((val) => {
			if (!val || val === "") return true;
			const num = Number.parseFloat(val);
			return !Number.isNaN(num) && num > 0;
		}, "Must be a positive number or empty"),
});

const balanceDistributionSchema = z.object({
	balance: z.string().refine((val) => {
		const num = Number.parseFloat(val);
		return !Number.isNaN(num) && num > 0;
	}, "Must be a positive number"),
	percentage: z.string().refine((val) => {
		const num = Number.parseFloat(val);
		return !Number.isNaN(num) && num >= 0 && num <= 100;
	}, "Must be a number between 0 and 100"),
});

const formSchema = z.object({
	clientsNumber: z.string().refine((val) => {
		const num = Number.parseInt(val);
		return !Number.isNaN(num) && num >= 1 && num <= 10000;
	}, "Must be a number between 1 and 10000"),
	tradesPerClient: z.string().refine((val) => {
		const num = Number.parseInt(val);
		return !Number.isNaN(num) && num >= 1 && num <= 1000;
	}, "Must be a number between 1 and 1000"),
	burnWonChallenges: z.boolean(),
	tradeOutcomeStrategy: z
		.enum([
			"fifty_fifty",
			"geometric_distance",
			"logarithmic_distance",
			"average",
			"burn_after_sl",
		])
		.optional(),
	maxLossRatio: z.string().refine((val) => {
		const num = Number.parseFloat(val);
		return !Number.isNaN(num) && num > 0 && num <= 100;
	}, "Must be a percentage between 0 and 100"),
	dailyLossRatio: z.string().refine((val) => {
		const num = Number.parseFloat(val);
		return !Number.isNaN(num) && num > 0 && num <= 100;
	}, "Must be a percentage between 0 and 100"),
	targetProfitRatio: z.string().refine((val) => {
		const num = Number.parseFloat(val);
		return !Number.isNaN(num) && num > 0 && num <= 100;
	}, "Must be a percentage between 0 and 100"),
	levels: z.array(levelRuleSchema).optional(),
	realLevels: z.array(levelRuleSchema).optional(),
	balanceDistribution: z.array(balanceDistributionSchema).optional(),
	levelsPreset: z.string().optional(),
});

interface SimulationFormProps {
	onSubmit: (values: {
		clientsNumber: number;
		tradesPerClient: number;
		initialBalance: number;
		commissionPerTrade: number;
		burnWonChallenges: boolean;
		tradeOutcomeStrategy:
			| "fifty_fifty"
			| "geometric_distance"
			| "logarithmic_distance"
			| "average"
			| "burn_after_sl";
		maxLossRatio: number;
		dailyLossRatio: number;
		targetProfitRatio: number;
		levels?: LevelRule[];
		realLevels?: LevelRule[];
		balanceDistribution?: BalanceDistribution[];
		levelsPreset?: string;
	}) => void;
	isLoading?: boolean;
	showSubmitButton?: boolean;
	hideClientsField?: boolean;
	hideTradesField?: boolean;
}

export function SimulationForm({
	onSubmit,
	isLoading,
	showSubmitButton = true,
	hideClientsField = false,
	hideTradesField = false,
}: SimulationFormProps) {
	const { t } = useLanguage();
	const [isRiskParametersOpen, setIsRiskParametersOpen] = useState(true);
	const [isChallengeParametersOpen, setIsChallengeParametersOpen] =
		useState(true);
	const [isBalanceDistributionOpen, setIsBalanceDistributionOpen] =
		useState(false);
	const [isLevelsOpen, setIsLevelsOpen] = useState(false);
	const [isRealLevelsOpen, setIsRealLevelsOpen] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			clientsNumber: "500",
			tradesPerClient: "250",
			burnWonChallenges: false,
			tradeOutcomeStrategy: "geometric_distance",
			maxLossRatio: "7",
			dailyLossRatio: "4",
			targetProfitRatio: "14",
			levels: PRESET_LEVELS.default,
			realLevels: PRESET_REAL_LEVELS.default,
			balanceDistribution: [
				{
					balance: "200000",
					percentage: "100",
				},
				{
					balance: "100000",
					percentage: "0",
				},
				{
					balance: "50000",
					percentage: "0",
				},
			],
		},
	});

	const {
		fields: levelFields,
		append: appendLevel,
		remove: removeLevel,
		replace: replaceLevels,
	} = useFieldArray({
		control: form.control,
		name: "levels",
	});

	const {
		fields: realLevelFields,
		append: appendRealLevel,
		remove: removeRealLevel,
		replace: replaceRealLevels,
	} = useFieldArray({
		control: form.control,
		name: "realLevels",
	});

	const { fields: balanceFields } = useFieldArray({
		control: form.control,
		name: "balanceDistribution",
	});

	const handlePresetSelect = (presetKey: string) => {
		// Set the levelsPreset value in the form
		form.setValue("levelsPreset", presetKey);
		
		if (presetKey === "default") {
			replaceLevels(PRESET_LEVELS.default);
		} else if (presetKey === "original") {
			replaceLevels(PRESET_LEVELS.original);
		} else if (presetKey === "mid") {
			replaceLevels(PRESET_LEVELS.mid);
		} else if (presetKey === "new") {
			replaceLevels(PRESET_LEVELS.new);
		} else if (presetKey === "new4") {
			replaceLevels(PRESET_LEVELS.new4);
		} else if (presetKey === "blank") {
			replaceLevels(PRESET_LEVELS.blank);
		}
	};
	5;
	const handleRealPresetSelect = (presetKey: string) => {
		if (presetKey === "default") {
			replaceRealLevels(PRESET_REAL_LEVELS.default);
		} else if (presetKey === "original") {
			replaceRealLevels(PRESET_REAL_LEVELS.original);
		} else if (presetKey === "new4") {
			replaceRealLevels(PRESET_REAL_LEVELS.new4);
		} else if (presetKey === "blank") {
			replaceRealLevels(PRESET_REAL_LEVELS.blank);
		}
	};

	const handleSubmit = (values: z.infer<typeof formSchema>) => {
		const levels: LevelRule[] | undefined = values.levels?.map((level) => ({
			maxBalance: new Decimal(level.maxBalance),
			sl: new Decimal(level.sl),
			tp: level.tp && level.tp !== "" ? new Decimal(level.tp) : undefined,
		}));
		const realLevels: LevelRule[] | undefined = values.realLevels?.map(
			(level) => ({
				maxBalance: new Decimal(level.maxBalance),
				sl: new Decimal(level.sl),
				tp: level.tp && level.tp !== "" ? new Decimal(level.tp) : undefined,
			}),
		);
		const balanceDistribution: BalanceDistribution[] | undefined =
			values.balanceDistribution?.map((dist) => ({
				balance: Number.parseFloat(dist.balance),
				percentage: Number.parseFloat(dist.percentage),
			}));

		// Validate balance distribution percentages sum to 100
		if (balanceDistribution && balanceDistribution.length > 0) {
			const totalPercentage = balanceDistribution.reduce(
				(sum, item) => sum + item.percentage,
				0,
			);
			if (Math.abs(totalPercentage - 100) > 0.01) {
				form.setError("balanceDistribution", {
					type: "manual",
					message: `Balance distribution percentages must sum to 100%, current sum is ${totalPercentage}%`,
				});
				return;
			}
		}
		onSubmit({
			clientsNumber: hideClientsField
				? 1
				: Number.parseInt(values.clientsNumber),
			tradesPerClient: Number.parseInt(values.tradesPerClient),
			initialBalance: 200000, // Default value when no distribution is used
			commissionPerTrade: 10, // Fixed default
			burnWonChallenges: values.burnWonChallenges,
			tradeOutcomeStrategy: values.tradeOutcomeStrategy || "geometric_distance",
			maxLossRatio: Number.parseFloat(values.maxLossRatio) / 100,
			dailyLossRatio: Number.parseFloat(values.dailyLossRatio) / 100,
			targetProfitRatio: Number.parseFloat(values.targetProfitRatio) / 100,
			levels,
			realLevels,
			balanceDistribution,
			levelsPreset: values.levelsPreset,
		});
	};

	const addLevel = () => {
		appendLevel({
			maxBalance: "",
			sl: "",
			tp: "",
		});
	};

	const addRealLevel = () => {
		appendRealLevel({
			maxBalance: "",
			sl: "",
			tp: "",
		});
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>{t("simulationParameters")}</CardTitle>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form
						onChange={
							showSubmitButton
								? undefined
								: () => form.handleSubmit(handleSubmit)()
						}
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-6"
					>
						<div className="space-y-6">
							<Collapsible
								open={isRiskParametersOpen}
								onOpenChange={setIsRiskParametersOpen}
							>
								<div className="space-y-4">
									<CollapsibleTrigger asChild>
										<Button
											type="button"
											variant="outline"
											className="flex w-full items-center justify-between p-4 hover:bg-muted/50"
										>
											<h3 className="text-lg font-medium">Risk Parameters</h3>
											<ChevronDown
												className={`h-4 w-4 transition-transform duration-200 ${isRiskParametersOpen ? "rotate-180" : ""}`}
											/>
										</Button>
									</CollapsibleTrigger>

									<CollapsibleContent className="space-y-4">
										<p className="text-sm text-muted-foreground">
											Configure risk parameters as parameters to evolve the
											simulation behavior.
										</p>

										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											{!hideClientsField && (
												<FormField
													control={form.control}
													name="clientsNumber"
													render={({ field }) => (
														<FormItem className="flex-1 min-w-[200px]">
															<FormLabel>{t("numberOfClients")}</FormLabel>
															<FormControl>
																<Input type="text" {...field} />
															</FormControl>
															<FormDescription>
																{t("numberOfClients")}
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>
											)}
											{!hideTradesField && (
												<FormField
													control={form.control}
													name="tradesPerClient"
													render={({ field }) => (
														<FormItem className="flex-1 min-w-[200px]">
															<FormLabel>{t("tradesPerClient")}</FormLabel>
															<FormControl>
																<Input type="text" {...field} />
															</FormControl>
															<FormDescription>
																{t("tradesPerClient")}
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>
											)}
										</div>

										<div className="flex flex-wrap gap-4">
											<FormField
												control={form.control}
												name="burnWonChallenges"
												render={({ field }) => (
													<FormItem className="flex-1 min-w-[200px]">
														<FormLabel>Burn Won Challenges</FormLabel>
														<FormControl>
															<div className="flex items-center space-x-2">
																<Checkbox
																	checked={field.value}
																	onCheckedChange={field.onChange}
																/>
																<span className="text-sm">
																	{field.value ? "Enabled" : "Disabled"}
																</span>
															</div>
														</FormControl>
														<FormDescription>
															Whether to burn won challenges or continue to real
															trading phase
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="tradeOutcomeStrategy"
												render={({ field }) => (
													<FormItem className="flex-1 min-w-[200px]">
														<FormLabel>Trade Outcome Strategy</FormLabel>
														<FormControl>
															<Select
																value={field.value || "geometric_distance"}
																onValueChange={field.onChange}
															>
																<SelectTrigger>
																	<SelectValue placeholder="Select strategy" />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="fifty_fifty">
																		Fifty Fifty
																	</SelectItem>
																	<SelectItem value="geometric_distance">
																		Geometric Distance
																	</SelectItem>
																	<SelectItem value="logarithmic_distance">
																		Logarithmic Distance
																	</SelectItem>
																	<SelectItem value="average">
																		Average
																	</SelectItem>
																	<SelectItem value="burn_after_sl">
																		Burn After SL
																	</SelectItem>
																</SelectContent>
															</Select>
														</FormControl>
														<FormDescription>
															Strategy used to calculate trade outcomes
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									</CollapsibleContent>
								</div>
							</Collapsible>

							{/* Challenge Parameters Configuration Section */}
							<Collapsible
								open={isChallengeParametersOpen}
								onOpenChange={setIsChallengeParametersOpen}
							>
								<div className="space-y-4">
									<CollapsibleTrigger asChild>
										<Button
											type="button"
											variant="outline"
											className="flex w-full items-center justify-between p-4 hover:bg-muted/50"
										>
											<h3 className="text-lg font-medium">
												Challenge Parameters
											</h3>
											<ChevronDown
												className={`h-4 w-4 transition-transform duration-200 ${isChallengeParametersOpen ? "rotate-180" : ""}`}
											/>
										</Button>
									</CollapsibleTrigger>

									<CollapsibleContent className="space-y-4">
										<p className="text-sm text-muted-foreground">
											Configure challenge parameters as percentages like done on
											the Prop Firm.
										</p>

										{/* Challenge Parameters Presets */}
										<div className="mb-4">
											<FormLabel className="text-sm font-medium">Challenge Presets</FormLabel>
											<Select 
												onValueChange={(value) => {
													if (value === "fast_regular") {
														form.setValue("maxLossRatio", "7");
														form.setValue("dailyLossRatio", "4");
														form.setValue("targetProfitRatio", "14");
													} else if (value === "super_plus") {
														form.setValue("maxLossRatio", "7");
														form.setValue("dailyLossRatio", "5");
														form.setValue("targetProfitRatio", "15");
													}
												}}
											>
												<SelectTrigger className="w-full md:w-[250px]">
													<SelectValue placeholder="Select challenge preset" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="fast_regular">Fast Regular</SelectItem>
													<SelectItem value="super_plus">Super Plus</SelectItem>
												</SelectContent>
											</Select>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<FormField
												control={form.control}
												name="maxLossRatio"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Max Loss (%)</FormLabel>
														<FormControl>
															<Input
																type="number"
																step="0.1"
																min="0"
																max="100"
																{...field}
															/>
														</FormControl>
														<FormDescription>
															Maximum drawdown percentage
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="dailyLossRatio"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Daily Loss (%)</FormLabel>
														<FormControl>
															<Input
																type="number"
																step="0.1"
																min="0"
																max="100"
																{...field}
															/>
														</FormControl>
														<FormDescription>
															Maximum daily loss percentage
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="targetProfitRatio"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Target Profit (%)</FormLabel>
														<FormControl>
															<Input
																type="number"
																step="0.1"
																min="0"
																max="100"
																{...field}
															/>
														</FormControl>
														<FormDescription>
															Profit target percentage
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									</CollapsibleContent>
								</div>
							</Collapsible>

							{/* Balance Distribution Configuration Section */}
							<Collapsible
								open={isBalanceDistributionOpen}
								onOpenChange={setIsBalanceDistributionOpen}
							>
								<div className="space-y-4">
									<CollapsibleTrigger asChild>
										<Button
											type="button"
											variant="outline"
											className="flex w-full items-center justify-between p-4 hover:bg-muted/50"
										>
											<h3 className="text-lg font-medium">
												Balance Distribution Configuration
											</h3>
											<ChevronDown
												className={`h-4 w-4 transition-transform duration-200 ${isBalanceDistributionOpen ? "rotate-180" : ""}`}
											/>
										</Button>
									</CollapsibleTrigger>

									<CollapsibleContent className="space-y-4">
										<div className="flex items-center justify-between">
											<p className="text-sm text-muted-foreground">
												Define what percentage of clients operate with different
												initial balances. Percentages must sum to 100%.
											</p>
										</div>

										{balanceFields.length > 0 && (
											<div className="border rounded-lg">
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Initial Balance ($)</TableHead>
															<TableHead>Percentage (%)</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{balanceFields.map((field, index) => (
															<TableRow key={field.id}>
																<TableCell>
																	<FormField
																		control={form.control}
																		name={`balanceDistribution.${index}.balance`}
																		render={({ field }) => (
																			<FormItem>
																				<FormControl>
																					<Input
																						type="number"
																						step="1000"
																						{...field}
																						className="w-full"
																						placeholder="e.g., 200000"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</TableCell>
																<TableCell>
																	<FormField
																		control={form.control}
																		name={`balanceDistribution.${index}.percentage`}
																		render={({ field }) => (
																			<FormItem>
																				<FormControl>
																					<Input
																						type="number"
																						step="0.1"
																						max="100"
																						{...field}
																						className="w-full"
																						placeholder="e.g., 40"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</div>
										)}

										{balanceFields.length === 0 && (
											<div className="text-center py-8 text-muted-foreground">
												<p>
													No balance distribution defined. All clients will use
													the default 200k balance.
												</p>
												<p className="text-sm mt-2">
													Click "Add Balance Tier" to define custom balance
													distribution.
												</p>
											</div>
										)}

										<FormMessage />
									</CollapsibleContent>
								</div>
							</Collapsible>

							{/* Collapsible Levels Configuration Section */}
							<Collapsible open={isLevelsOpen} onOpenChange={setIsLevelsOpen}>
								<div className="space-y-4">
									<CollapsibleTrigger asChild>
										<Button
											type="button"
											variant="outline"
											className="flex w-full items-center justify-between p-4 hover:bg-muted/50"
										>
											<h3 className="text-lg font-medium">
												Trading Levels Configuration
											</h3>
											<ChevronDown
												className={`h-4 w-4 transition-transform duration-200 ${isLevelsOpen ? "rotate-180" : ""}`}
											/>
										</Button>
									</CollapsibleTrigger>

									<CollapsibleContent className="space-y-4">
										<div className="flex items-center justify-between">
											<p className="text-sm text-muted-foreground">
												Define custom trading levels with specific balance
												ranges and rules.
											</p>
											<div className="flex gap-2">
												<Select onValueChange={handlePresetSelect}>
													<SelectTrigger className="w-48">
														<SelectValue placeholder="Select preset levels" />
													</SelectTrigger>
													<SelectContent className="bg-popover z-50">
														<SelectItem value="blank">+ Blank</SelectItem>
														<SelectItem value="default">
															Original Unbalanced
														</SelectItem>
														<SelectItem value="original">Original</SelectItem>
														<SelectItem value="new">New Strategy</SelectItem>
														<SelectItem value="new4">
															New Strategy 4 Points
														</SelectItem>
														<SelectItem value="mid">Mid</SelectItem>
													</SelectContent>
												</Select>
												<Button
													type="button"
													onClick={addLevel}
													variant="outline"
													size="sm"
												>
													<Plus className="mr-2 h-4 w-4" />
													Add Level
												</Button>
											</div>
										</div>

										{levelFields.length > 0 && (
											<div className="border rounded-lg">
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Max Balance</TableHead>
															<TableHead>Stop Loss</TableHead>
															<TableHead>Take Profit</TableHead>
															<TableHead className="w-[80px]">
																Actions
															</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{levelFields.map((field, index) => (
															<TableRow key={field.id}>
																<TableCell>
																	<FormField
																		control={form.control}
																		name={`levels.${index}.maxBalance`}
																		render={({ field }) => (
																			<FormItem>
																				<FormControl>
																					<Input
																						type="number"
																						step="0.01"
																						{...field}
																						className="w-full"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</TableCell>
																<TableCell>
																	<FormField
																		control={form.control}
																		name={`levels.${index}.sl`}
																		render={({ field }) => (
																			<FormItem>
																				<FormControl>
																					<Input
																						type="number"
																						step="0.01"
																						{...field}
																						className="w-full"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</TableCell>
																<TableCell>
																	<FormField
																		control={form.control}
																		name={`levels.${index}.tp`}
																		render={({ field }) => (
																			<FormItem>
																				<FormControl>
																					<Input
																						type="number"
																						step="0.01"
																						{...field}
																						className="w-full"
																						placeholder="Empty = auto (gap to max balance)"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</TableCell>
																<TableCell>
																	<Button
																		type="button"
																		onClick={() => removeLevel(index)}
																		variant="outline"
																		size="sm"
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</div>
										)}

										{levelFields.length === 0 && (
											<div className="text-center py-8 text-muted-foreground">
												<p>
													No custom levels defined. Default levels will be used.
												</p>
												<p className="text-sm mt-2">
													Click "Add Level" to define custom trading levels.
												</p>
											</div>
										)}
									</CollapsibleContent>
								</div>
							</Collapsible>

							{/* Collapsible Real Levels Configuration Section */}
							<Collapsible
								open={isRealLevelsOpen}
								onOpenChange={setIsRealLevelsOpen}
							>
								<div className="space-y-4">
									<CollapsibleTrigger asChild>
										<Button
											type="button"
											variant="outline"
											className="flex w-full items-center justify-between p-4 hover:bg-muted/50"
										>
											<h3 className="text-lg font-medium">
												Trading Real Levels Configuration
											</h3>
											<ChevronDown
												className={`h-4 w-4 transition-transform duration-200 ${isRealLevelsOpen ? "rotate-180" : ""}`}
											/>
										</Button>
									</CollapsibleTrigger>

									<CollapsibleContent className="space-y-4">
										<div className="flex items-center justify-between">
											<p className="text-sm text-muted-foreground">
												Define custom trading levels with specific balance
												ranges and rules.
											</p>
											<div className="flex gap-2">
												<Select onValueChange={handleRealPresetSelect}>
													<SelectTrigger className="w-48">
														<SelectValue placeholder="Select preset levels" />
													</SelectTrigger>
													<SelectContent className="bg-popover z-50">
														<SelectItem value="blank">+ Blank</SelectItem>
														<SelectItem value="original">Original</SelectItem>
														<SelectItem value="new4">
															New Strategy 4 Points
														</SelectItem>
														<SelectItem value="default">Default</SelectItem>
													</SelectContent>
												</Select>
												<Button
													type="button"
													onClick={addRealLevel}
													variant="outline"
													size="sm"
												>
													<Plus className="mr-2 h-4 w-4" />
													Add Level
												</Button>
											</div>
										</div>

										{realLevelFields.length > 0 && (
											<div className="border rounded-lg">
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Max Balance</TableHead>
															<TableHead>Stop Loss</TableHead>
															<TableHead>Take Profit</TableHead>
															<TableHead className="w-[80px]">
																Actions
															</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{realLevelFields.map((field, index) => (
															<TableRow key={field.id}>
																<TableCell>
																	<FormField
																		control={form.control}
																		name={`realLevels.${index}.maxBalance`}
																		render={({ field }) => (
																			<FormItem>
																				<FormControl>
																					<Input
																						type="number"
																						step="0.01"
																						{...field}
																						className="w-full"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</TableCell>
																<TableCell>
																	<FormField
																		control={form.control}
																		name={`realLevels.${index}.sl`}
																		render={({ field }) => (
																			<FormItem>
																				<FormControl>
																					<Input
																						type="number"
																						step="0.01"
																						{...field}
																						className="w-full"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</TableCell>
																<TableCell>
																	<FormField
																		control={form.control}
																		name={`realLevels.${index}.tp`}
																		render={({ field }) => (
																			<FormItem>
																				<FormControl>
																					<Input
																						type="number"
																						step="0.01"
																						{...field}
																						className="w-full"
																						placeholder="Empty = auto (gap to max balance)"
																					/>
																				</FormControl>
																				<FormMessage />
																			</FormItem>
																		)}
																	/>
																</TableCell>
																<TableCell>
																	<Button
																		type="button"
																		onClick={() => removeRealLevel(index)}
																		variant="outline"
																		size="sm"
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</div>
										)}

										{realLevelFields.length === 0 && (
											<div className="text-center py-8 text-muted-foreground">
												<p>
													No custom levels defined. Default levels will be used.
												</p>
												<p className="text-sm mt-2">
													Click "Add Level" to define custom trading levels.
												</p>
											</div>
										)}
									</CollapsibleContent>
								</div>
							</Collapsible>
						</div>
						{showSubmitButton && (
							<Button
								type="submit"
								className="w-full bg-black hover:bg-gray-800 text-white"
								disabled={isLoading}
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{t("runningSimulation")}
									</>
								) : (
									t("runSimulation")
								)}
							</Button>
						)}
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
