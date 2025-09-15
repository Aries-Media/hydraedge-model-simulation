import Decimal from "decimal.js";
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
import type { BalanceDistribution, LevelRule } from "@/sim/types";
import { snapshotChallenge } from "@/sim/registry";
import { fmtPct } from "@/sim";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";

// UI-only presets to quickly fill level arrays when "custom" is selected
const PRESET_LEVELS = {
  default: [
    { maxBalance: "200000", sl: "8200", tp: "5000" },
    { maxBalance: "223000", sl: "6000", tp: "5000" },
    { maxBalance: "228000", sl: "6000", tp: "" },
  ],
  original: [
    { maxBalance: "200000", sl: "6000", tp: "6000" },
    { maxBalance: "223000", sl: "6000", tp: "6000" },
    { maxBalance: "228000", sl: "6000", tp: "" },
  ],
  new: [
    { maxBalance: "200000", sl: "10200", tp: "6000" },
    { maxBalance: "206000", sl: "8000", tp: "6000" },
    { maxBalance: "212000", sl: "11000", tp: "5000" },
    { maxBalance: "217000", sl: "8000", tp: "5000" },
    { maxBalance: "222000", sl: "11500", tp: "4000" },
    { maxBalance: "226000", sl: "8000", tp: "4000" },
    { maxBalance: "230000", sl: "8000", tp: "" },
  ],
  new4: [
    { maxBalance: "200000", sl: "10200", tp: "8000" },
    { maxBalance: "208000", sl: "10400", tp: "7800" },
    { maxBalance: "215800", sl: "10800", tp: "7800" },
    { maxBalance: "223600", sl: "11200", tp: "7800" },
    { maxBalance: "230000", sl: "11200", tp: "" },
  ],
  mid: [
    { maxBalance: "200000", sl: "8200", tp: "6000" },
    { maxBalance: "206000", sl: "7000", tp: "6000" },
    { maxBalance: "212000", sl: "8400", tp: "6000" },
    { maxBalance: "218000", sl: "7000", tp: "6000" },
    { maxBalance: "224000", sl: "8800", tp: "" },
    { maxBalance: "228000", sl: "7000", tp: "" },
  ],
  blank: [],
};

const PRESET_REAL_LEVELS = {
  default: [
    { maxBalance: "200000", sl: "7000", tp: "2000" },
    { maxBalance: "223000", sl: "7000", tp: "2000" },
  ],
  original: [
    { maxBalance: "200000", sl: "7000", tp: "2000" },
    { maxBalance: "223000", sl: "7000", tp: "2000" },
  ],
  new4: [],
  blank: [],
};

// ---------------- Schemas ----------------

const levelRuleSchema = z.object({
  maxBalance: z.string().refine(v => !Number.isNaN(+v) && +v > 0, "Must be a positive number"),
  sl: z.string().refine(v => !Number.isNaN(+v) && +v > 0, "Must be a positive number"),
  tp: z.string().optional().refine(v => !v || (!Number.isNaN(+v) && +v > 0), "Must be a positive number or empty"),
});

const balanceDistributionSchema = z.object({
  balance: z.string().refine(v => !Number.isNaN(+v) && +v > 0, "Must be a positive number"),
  percentage: z.string().refine(v => !Number.isNaN(+v) && +v >= 0 && +v <= 100, "Must be 0–100"),
});

const formSchema = z.object({
  // Core run controls
  clientsNumber: z.string(),
  tradesPerClient: z.string(),
  burnWonChallenges: z.boolean(),
  tradeOutcomeStrategy: z.enum(["fifty_fifty","geometric_distance","logarithmic_distance","average","burn_after_sl"]).optional(),

  // Challenge & Strategy preset selections
  challengePreset: z.enum(["fast_regular","super_plus","custom"]).default("fast_regular"),
  strategyPreset: z.enum(["default","new4"]).default("default"),

  // Risk (used for "custom", also surfaced to let users tweak)
  maxLossRatio: z.string(),
  dailyLossRatio: z.string(),
  targetProfitRatio: z.string(),

  // Optional custom config
  levels: z.array(levelRuleSchema).optional(),
  realLevels: z.array(levelRuleSchema).optional(),
  balanceDistribution: z.array(balanceDistributionSchema).optional(),
});

type FormVals = z.infer<typeof formSchema>;

interface SimulationFormProps {
  onSubmit: (values:
    | {
        kind: "preset";
        challengeId: "fast_regular" | "super_plus";
        strategyId?: "default" | "new4";
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
        kind: "custom";
        customId: string;
        strategyId?: "default" | "new4";
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
        risk: { maxLoss: number; dailyLoss: number; targetProfit: number };
        levels: LevelRule[];
        realLevels: LevelRule[];
      }
  ) => void;
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
  const [isChallengeParametersOpen, setIsChallengeParametersOpen] = useState(true);
  const [isBalanceDistributionOpen, setIsBalanceDistributionOpen] = useState(false);
  const [isLevelsOpen, setIsLevelsOpen] = useState(false);
  const [isRealLevelsOpen, setIsRealLevelsOpen] = useState(false);

  const form = useForm<FormVals>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientsNumber: "500",
      tradesPerClient: "250",
      burnWonChallenges: false,
      tradeOutcomeStrategy: "logarithmic_distance",

      challengePreset: "fast_regular",
      strategyPreset: "default",

      maxLossRatio: "7",
      dailyLossRatio: "4",
      targetProfitRatio: "14",

      levels: PRESET_LEVELS.default,
      realLevels: PRESET_REAL_LEVELS.default,
      balanceDistribution: [
        { balance: "200000", percentage: "100" },
        { balance: "100000", percentage: "0" },
        { balance: "50000", percentage: "0" },
      ],
    },
  });

  // field arrays
  const { fields: levelFields, append: appendLevel, remove: removeLevel, replace: replaceLevels } =
    useFieldArray({ control: form.control, name: "levels" });

  const { fields: realLevelFields, append: appendRealLevel, remove: removeRealLevel, replace: replaceRealLevels } =
    useFieldArray({ control: form.control, name: "realLevels" });

  const { fields: balanceFields } = useFieldArray({ control: form.control, name: "balanceDistribution" });

  // preset helpers for custom editing panels
  const handlePresetSelect = (presetKey: keyof typeof PRESET_LEVELS) => {
    replaceLevels(PRESET_LEVELS[presetKey]);
  };
  const handleRealPresetSelect = (presetKey: keyof typeof PRESET_REAL_LEVELS) => {
    replaceRealLevels(PRESET_REAL_LEVELS[presetKey]);
  };


  const challengePreset = form.watch("challengePreset");
  const isCustom = challengePreset === "custom";

  const presetSnapshot = useMemo(() => {
    if (isCustom) return null;
    try {
      return snapshotChallenge(challengePreset, 200000); // same balance your sim assumes
    } catch {
      return null;
    }
  }, [challengePreset, isCustom]);

  // when the user switches TO custom, prefill once from latest preset snapshot
  const lastPresetRef = useRef<string | null>(null);
  useEffect(() => {
    if (isCustom && lastPresetRef.current !== "custom") {
      const snap = snapshotChallenge(lastPresetRef.current ?? "fast_regular", 200000);
      form.setValue("maxLossRatio", fmtPct(snap.riskPercent.maxLoss));
      form.setValue("dailyLossRatio", fmtPct(snap.riskPercent.dailyLoss));
      form.setValue("targetProfitRatio", fmtPct(snap.riskPercent.targetProfit));
      // optional: seed custom levels from preset tiers
      form.setValue("levels", snap.levels.evaluation.map(l => ({
        maxBalance: String(l.maxBalance),
        sl: String(l.sl),
        tp: l.tp ? String(l.tp) : "",
      })));
      form.setValue("realLevels", snap.levels.real.map(l => ({
        maxBalance: String(l.maxBalance),
        sl: String(l.sl),
        tp: l.tp ? String(l.tp) : "",
      })));
    }
    lastPresetRef.current = isCustom ? "custom" : challengePreset;
  }, [isCustom, challengePreset, form]);

  useEffect(() => {
    if (!isCustom) {
      const snap = presetSnapshot;
      const recommended = snap?.meta?.recommendedStrategyId;
      if (recommended && form.getValues("strategyPreset") !== recommended) {
        form.setValue("strategyPreset", recommended as any);
      }
    }
  }, [presetSnapshot, isCustom, form]);

  const handleSubmit = (values: FormVals) => {
    const balanceDistribution: BalanceDistribution[] | undefined =
      values.balanceDistribution?.map(dist => ({
        balance: Number.parseFloat(dist.balance),
        percentage: Number.parseFloat(dist.percentage),
      }));

    if (balanceDistribution && balanceDistribution.length > 0) {
      const total = balanceDistribution.reduce((s, x) => s + x.percentage, 0);
      if (Math.abs(total - 100) > 0.01) {
        form.setError("balanceDistribution", {
          type: "manual",
          message: `Balance distribution percentages must sum to 100%, current sum is ${total}%`,
        });
        return;
      }
    }

    const clientsNumber = hideClientsField ? 1 : Number.parseInt(values.clientsNumber);
    const tradesPerClient = Number.parseInt(values.tradesPerClient);

    // Shared defaults
    const payloadBase = {
      clientsNumber,
      tradesPerClient,
      commissionPerTrade: 10,
      initialBalance: 200000,
      balanceDistribution,
      burnWonChallenges: values.burnWonChallenges,
      outcomeStrategy: values.tradeOutcomeStrategy || "geometric_distance",
      strategyId: values.strategyPreset,
    } as const;

    if (!isCustom) {
      // Preset path: emit clean identifiers
      const challengeId = values.challengePreset as "fast_regular" | "super_plus";
      onSubmit({
        kind: "preset",
        challengeId,
        ...payloadBase,
      });
      return;
    }

    // Custom path: map levels into Decimal-based LevelRule for the sim
    const levels: LevelRule[] = (values.levels ?? []).map(l => ({
      maxBalance: new Decimal(l.maxBalance),
      sl: new Decimal(l.sl),
      tp: l.tp && l.tp !== "" ? new Decimal(l.tp) : undefined,
    }));

    const realLevels: LevelRule[] = (values.realLevels ?? []).map(l => ({
      maxBalance: new Decimal(l.maxBalance),
      sl: new Decimal(l.sl),
      tp: l.tp && l.tp !== "" ? new Decimal(l.tp) : undefined,
    }));

    const customId = `custom-${Date.now()}`;

    onSubmit({
      kind: "custom",
      customId,
      ...payloadBase,
      risk: {
        maxLoss: new Decimal(values.maxLossRatio).div(100).toNumber(),
        dailyLoss: new Decimal(values.dailyLossRatio).div(100).toNumber(),
        targetProfit: new Decimal(values.targetProfitRatio).div(100).toNumber(),
      },
      levels,
      realLevels,
    });
  };

  const addLevel = () => appendLevel({ maxBalance: "", sl: "", tp: "" });
  const addRealLevel = () => appendRealLevel({ maxBalance: "", sl: "", tp: "" });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("simulationParameters")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onChange={showSubmitButton ? undefined : () => form.handleSubmit(handleSubmit)()}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="space-y-6">
              {/* Run controls and strategies */}
              <Collapsible open={isRiskParametersOpen} onOpenChange={setIsRiskParametersOpen}>
                <div className="space-y-4">
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="flex w-full items-center justify-between p-4 hover:bg-muted/50">
                      <h3 className="text-lg font-medium">Run & Strategy</h3>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isRiskParametersOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {!hideClientsField && (
                        <FormField control={form.control} name="clientsNumber" render={({ field }) => (
                          <FormItem className="flex-1 min-w-[200px]">
                            <FormLabel>{t("numberOfClients")}</FormLabel>
                            <FormControl><Input type="text" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}/>
                      )}
                      {!hideTradesField && (
                        <FormField control={form.control} name="tradesPerClient" render={({ field }) => (
                          <FormItem className="flex-1 min-w-[200px]">
                            <FormLabel>{t("tradesPerClient")}</FormLabel>
                            <FormControl><Input type="text" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}/>
                      )}
                      <FormField control={form.control} name="tradeOutcomeStrategy" render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel>Trade Outcome Strategy</FormLabel>
                          <FormControl>
                            <Select value={field.value || "logarithmic_distance"} onValueChange={field.onChange}>
                              <SelectTrigger><SelectValue placeholder="Select strategy" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fifty_fifty">Fifty Fifty</SelectItem>
                                <SelectItem value="geometric_distance">Geometric Distance</SelectItem>
                                <SelectItem value="logarithmic_distance">Logarithmic Distance</SelectItem>
                                <SelectItem value="average">Average</SelectItem>
                                <SelectItem value="burn_after_sl">Burn After SL</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}/>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <FormField control={form.control} name="burnWonChallenges" render={({ field }) => (
                        <FormItem className="flex-1 min-w-[200px]">
                          <FormLabel>Burn Won Challenges</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              <span className="text-sm">{field.value ? "Enabled" : "Disabled"}</span>
                            </div>
                          </FormControl>
                          <FormDescription>Stop at eval win or continue to real</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}/>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Challenge & Strategy selection */}
              <Collapsible open={isChallengeParametersOpen} onOpenChange={setIsChallengeParametersOpen}>
                <div className="space-y-4">
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="flex w-full items-center justify-between p-4 hover:bg-muted/50">
                      <h3 className="text-lg font-medium">Challenge & Strategy Presets</h3>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isChallengeParametersOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="challengePreset" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Challenge Preset</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full md:w-[250px]">
                                <SelectValue placeholder="Select challenge preset" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fast_regular">Plus</SelectItem>
                                <SelectItem value="super_plus">Super Plus</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>Pick a built-in preset or Custom</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}/>

                      <FormField control={form.control} name="strategyPreset" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strategy Preset</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full md:w-[250px]">
                                <SelectValue placeholder="Select strategy preset" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">Default</SelectItem>
                                <SelectItem value="new4">Four Points</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>Lot coefficient policy</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}/>
                    </div>

                    {/* Risk knobs (used for Custom, still editable for curiosity) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {!isCustom && presetSnapshot && (
                        <>
                          <div>
                            <FormLabel>Max Loss (%)</FormLabel>
                            <div className="h-10 flex items-center rounded-md border px-3 bg-muted/50">
                              {presetSnapshot ? fmtPct(presetSnapshot.riskPercent.maxLoss) : ""}
                            </div>
                            <p className="text-xs text-muted-foreground">From preset</p>
                          </div>
                          <div>
                            <FormLabel>Daily Loss (%)</FormLabel>
                            <div className="h-10 flex items-center rounded-md border px-3 bg-muted/50">
                              {presetSnapshot ? fmtPct(presetSnapshot.riskPercent.dailyLoss) : ""}
                            </div>
                            <p className="text-xs text-muted-foreground">From preset</p>
                          </div>
                          <div>
                            <FormLabel>Target Profit (%)</FormLabel>
                            <div className="h-10 flex items-center rounded-md border px-3 bg-muted/50">
                              {presetSnapshot ? fmtPct(presetSnapshot.riskPercent.targetProfit) : ""}
                            </div>
                            <p className="text-xs text-muted-foreground">From preset</p>
                          </div>
                        </>
                      )}

                      {isCustom && (
                        <>
                          <FormField control={form.control} name="maxLossRatio" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Loss (%)</FormLabel>
                              <FormControl><Input type="number" step="0.1" min="0" max="100" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={form.control} name="dailyLossRatio" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Daily Loss (%)</FormLabel>
                              <FormControl><Input type="number" step="0.1" min="0" max="100" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                          <FormField control={form.control} name="targetProfitRatio" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Profit (%)</FormLabel>
                              <FormControl><Input type="number" step="0.1" min="0" max="100" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}/>
                        </>
                      )}

                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Balance Distribution */}
              <Collapsible open={isBalanceDistributionOpen} onOpenChange={setIsBalanceDistributionOpen}>
                <div className="space-y-4">
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="flex w-full items-center justify-between p-4 hover:bg-muted/50">
                      <h3 className="text-lg font-medium">Balance Distribution</h3>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isBalanceDistributionOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Percentages must sum to 100%.
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
                                  <FormField control={form.control} name={`balanceDistribution.${index}.balance`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="1000" {...field} className="w-full" placeholder="e.g., 200000" /></FormControl><FormMessage /></FormItem>
                                  )}/>
                                </TableCell>
                                <TableCell>
                                  <FormField control={form.control} name={`balanceDistribution.${index}.percentage`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="0.1" max="100" {...field} className="w-full" placeholder="e.g., 40" /></FormControl><FormMessage /></FormItem>
                                  )}/>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {balanceFields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No distribution defined. All clients use 200k.</p>
                      </div>
                    )}

                    <FormMessage />
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Custom Levels only show if Custom challenge selected */}
              <Collapsible open={isCustom && isLevelsOpen} onOpenChange={setIsLevelsOpen}>
                <div className={`space-y-4 ${!isCustom ? "hidden" : ""}`}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="flex w-full items-center justify-between p-4 hover:bg-muted/50">
                      <h3 className="text-lg font-medium">Custom Evaluation Levels</h3>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isLevelsOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Define evaluation tiers.</p>
                      <div className="flex gap-2">
                        <Select onValueChange={(v) => handlePresetSelect(v as keyof typeof PRESET_LEVELS)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select preset levels" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="blank">+ Blank</SelectItem>
                            <SelectItem value="default">Plus</SelectItem>
                            <SelectItem value="original">Original</SelectItem>
                            <SelectItem value="new">New Strategy</SelectItem>
                            <SelectItem value="new4">Super Plus</SelectItem>
                            <SelectItem value="mid">Mid</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={addLevel} variant="outline" size="sm">
                          <Plus className="mr-2 h-4 w-4" /> Add Level
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
                              <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {levelFields.map((field, index) => (
                              <TableRow key={field.id}>
                                <TableCell>
                                  <FormField control={form.control} name={`levels.${index}.maxBalance`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="0.01" {...field} className="w-full" /></FormControl><FormMessage /></FormItem>
                                  )}/>
                                </TableCell>
                                <TableCell>
                                  <FormField control={form.control} name={`levels.${index}.sl`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="0.01" {...field} className="w-full" /></FormControl><FormMessage /></FormItem>
                                  )}/>
                                </TableCell>
                                <TableCell>
                                  <FormField control={form.control} name={`levels.${index}.tp`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="0.01" {...field} className="w-full" placeholder="Empty = auto (gap to max balance)" /></FormControl><FormMessage /></FormItem>
                                  )}/>
                                </TableCell>
                                <TableCell>
                                  <Button type="button" onClick={() => removeLevel(index)} variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Collapsible open={isCustom && isRealLevelsOpen} onOpenChange={setIsRealLevelsOpen}>
                <div className={`space-y-4 ${!isCustom ? "hidden" : ""}`}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="flex w-full items-center justify-between p-4 hover:bg-muted/50">
                      <h3 className="text-lg font-medium">Custom Real Levels</h3>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isRealLevelsOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Define real-phase tiers.</p>
                      <div className="flex gap-2">
                        <Select onValueChange={(v) => handleRealPresetSelect(v as keyof typeof PRESET_REAL_LEVELS)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select preset levels" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="blank">+ Blank</SelectItem>
                            <SelectItem value="original">Original</SelectItem>
                            <SelectItem value="new4">Super Plus</SelectItem>
                            <SelectItem value="default">Default</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={addRealLevel} variant="outline" size="sm">
                          <Plus className="mr-2 h-4 w-4" /> Add Level
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
                              <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {realLevelFields.map((field, index) => (
                              <TableRow key={field.id}>
                                <TableCell>
                                  <FormField control={form.control} name={`realLevels.${index}.maxBalance`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="0.01" {...field} className="w-full" /></FormControl><FormMessage /></FormItem>
                                  )}/>
                                </TableCell>
                                <TableCell>
                                  <FormField control={form.control} name={`realLevels.${index}.sl`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="0.01" {...field} className="w-full" /></FormControl><FormMessage /></FormItem>
                                  )}/>
                                </TableCell>
                                <TableCell>
                                  <FormField control={form.control} name={`realLevels.${index}.tp`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="0.01" {...field} className="w-full" placeholder="Empty = auto (gap to max balance)" /></FormControl><FormMessage /></FormItem>
                                  )}/>
                                </TableCell>
                                <TableCell>
                                  <Button type="button" onClick={() => removeRealLevel(index)} variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>

            {showSubmitButton && (
              <Button type="submit" className="w-full bg-success hover:bg-success/90 text-success-foreground" disabled={isLoading}>
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

