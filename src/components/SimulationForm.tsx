
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LevelRule, BalanceDistribution } from "@/utils/simulation";
import Decimal from 'decimal.js';
import { useState } from "react";

// Define preset trading levels
const PRESET_LEVELS = {
  original: [
    { maxBalance: "200000", sl: "6000", tp: "6000" },
    { maxBalance: "223000", sl: "6000", tp: "6000" },
    { maxBalance: "228000", sl: "6000", tp: "" },
  ],
  original_unbalanced: [
    { maxBalance: "200000", sl: "8200", tp: "5000" },
    { maxBalance: "223000", sl: "6000", tp: "5000" },
    { maxBalance: "228000", sl: "6000", tp: "" },
  ],
  default: [
    { maxBalance: "200000", sl: "8200", tp: "6000" },
    { maxBalance: "206000", sl: "7000", tp: "6000" },
    { maxBalance: "212000", sl: "8400", tp: "6000" },
    { maxBalance: "218000", sl: "7000", tp: "6000" },
    { maxBalance: "224000", sl: "8800", tp: "" },
    { maxBalance: "228000", sl: "7000", tp: "" },
  ],
};

const levelRuleSchema = z.object({
  maxBalance: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive number"),
  sl: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive number"),
  tp: z.string().optional().refine((val) => {
    if (!val || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive number or empty"),
});

const balanceDistributionSchema = z.object({
  balance: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive number"),
  percentage: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 100;
  }, "Must be a number between 0 and 100"),
});

const formSchema = z.object({
  clientsNumber: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 10000;
  }, "Must be a number between 1 and 10000"),
  tradesPerClient: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 1000;
  }, "Must be a number between 1 and 1000"),
  burnWonChallenges: z.boolean(),
  tradeOutputRandom: z.boolean().optional(),
  levels: z.array(levelRuleSchema).optional(),
  balanceDistribution: z.array(balanceDistributionSchema).optional(),
});

interface SimulationFormProps {
  onSubmit: (values: {
    clientsNumber: number;
    tradesPerClient: number;
    initialBalance: number;
    commissionPerTrade: number;
    burnWonChallenges: boolean;
    tradeOutputRandom: boolean;
    levels?: LevelRule[];
    balanceDistribution?: BalanceDistribution[];
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
  hideTradesField = false
}: SimulationFormProps) {
  const { t } = useLanguage();
  const [isLevelsOpen, setIsLevelsOpen] = useState(false);
  const [isBalanceDistributionOpen, setIsBalanceDistributionOpen] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientsNumber: "500",
      tradesPerClient: "250",
      burnWonChallenges: false,
      tradeOutputRandom: false,
      levels: PRESET_LEVELS.default,
      balanceDistribution: [
        { balance: "200000", percentage: "20" },
        { balance: "100000", percentage: "40" },
        { balance: "50000", percentage: "40" },
      ],
    },
  });

  const { fields: levelFields, append: appendLevel, remove: removeLevel, replace: replaceLevels } = useFieldArray({
    control: form.control,
    name: "levels",
  });

  const { fields: balanceFields, append: appendBalance, remove: removeBalance } = useFieldArray({
    control: form.control,
    name: "balanceDistribution",
  });

  const handlePresetSelect = (presetKey: string) => {
    if (presetKey === "default") {
      replaceLevels(PRESET_LEVELS.default);
    } else if (presetKey === "original") {
      replaceLevels(PRESET_LEVELS.original);
    } else if (presetKey === "original_unbalanced") {
      replaceLevels(PRESET_LEVELS.original_unbalanced);
    }
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const levels: LevelRule[] | undefined = values.levels?.map(level => ({
      maxBalance: new Decimal(level.maxBalance),
      sl: new Decimal(level.sl),
      tp: level.tp && level.tp !== "" ? new Decimal(level.tp) : undefined,
    }));

    const balanceDistribution: BalanceDistribution[] | undefined = values.balanceDistribution?.map(dist => ({
      balance: parseFloat(dist.balance),
      percentage: parseFloat(dist.percentage),
    }));

    // Validate balance distribution percentages sum to 100
    if (balanceDistribution && balanceDistribution.length > 0) {
      const totalPercentage = balanceDistribution.reduce((sum, item) => sum + item.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        form.setError("balanceDistribution", {
          type: "manual",
          message: `Balance distribution percentages must sum to 100%, current sum is ${totalPercentage}%`
        });
        return;
      }
    }

    onSubmit({
      clientsNumber: hideClientsField ? 1 : parseInt(values.clientsNumber),
      tradesPerClient: parseInt(values.tradesPerClient),
      initialBalance: 200000, // Default value when no distribution is used
      commissionPerTrade: 10, // Fixed default
      burnWonChallenges: values.burnWonChallenges,
      tradeOutputRandom: values.tradeOutputRandom || false,
      levels,
      balanceDistribution,
    });
  };

  const addLevel = () => {
    appendLevel({ maxBalance: "", sl: "", tp: "" });
  };

  const addBalanceDistribution = () => {
    appendBalance({ balance: "", percentage: "" });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("simulationParameters")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onChange={showSubmitButton ? undefined : () => form.handleSubmit(handleSubmit)()} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4">
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
                        Whether to burn won challenges or continue to real trading phase
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tradeOutputRandom"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>Trade Outcome Random</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm">
                            {field.value ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Enable for random 50-50 trade outcomes instead of probability-based results
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Balance Distribution Configuration Section */}
              <Collapsible open={isBalanceDistributionOpen} onOpenChange={setIsBalanceDistributionOpen}>
                <div className="space-y-4">
                  <CollapsibleTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex w-full items-center justify-between p-4 hover:bg-muted/50"
                    >
                      <h3 className="text-lg font-medium">Balance Distribution Configuration</h3>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isBalanceDistributionOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Define what percentage of clients operate with different initial balances. Percentages must sum to 100%.</p>
                      <Button type="button" onClick={addBalanceDistribution} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Balance Tier
                      </Button>
                    </div>
                    
                    {balanceFields.length > 0 && (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Initial Balance ($)</TableHead>
                              <TableHead>Percentage (%)</TableHead>
                              <TableHead className="w-[80px]">Actions</TableHead>
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
                                          <Input type="number" step="1000" {...field} className="w-full" placeholder="e.g., 200000" />
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
                                          <Input type="number" step="0.1" max="100" {...field} className="w-full" placeholder="e.g., 40" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    onClick={() => removeBalance(index)}
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
                    
                    {balanceFields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No balance distribution defined. All clients will use the default 200k balance.</p>
                        <p className="text-sm mt-2">Click "Add Balance Tier" to define custom balance distribution.</p>
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
                      <h3 className="text-lg font-medium">Trading Levels Configuration</h3>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isLevelsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Define custom trading levels with specific balance ranges and rules.</p>
                      <div className="flex gap-2">
                        <Select onValueChange={handlePresetSelect}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select preset levels" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="default">Default Levels</SelectItem>
                            <SelectItem value="original">Original</SelectItem>
                            <SelectItem value="original_unbalanced">Original Unbalanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={addLevel} variant="outline" size="sm">
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
                              <TableHead className="w-[80px]">Actions</TableHead>
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
                                          <Input type="number" step="0.01" {...field} className="w-full" />
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
                                          <Input type="number" step="0.01" {...field} className="w-full" />
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
                        <p>No custom levels defined. Default levels will be used.</p>
                        <p className="text-sm mt-2">Click "Add Level" to define custom trading levels.</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
            {showSubmitButton && (
              <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white" disabled={isLoading}>
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
