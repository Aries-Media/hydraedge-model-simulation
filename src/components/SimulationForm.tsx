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
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LevelRule } from "@/utils/simulation";
import Decimal from 'decimal.js';
import { useState } from "react";

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
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientsNumber: "500",
      tradesPerClient: "180",
      burnWonChallenges: true,
      tradeOutputRandom: false,
      levels: [
        { maxBalance: "200000", sl: "8200", tp: "6000" },
        { maxBalance: "206000", sl: "7000", tp: "6000" },
        { maxBalance: "212000", sl: "8400", tp: "6000" },
        { maxBalance: "218000", sl: "7000", tp: "6000" },
        { maxBalance: "224000", sl: "8800", tp: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "levels",
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const levels: LevelRule[] | undefined = values.levels?.map(level => ({
      maxBalance: new Decimal(level.maxBalance),
      sl: new Decimal(level.sl),
      tp: level.tp && level.tp !== "" ? new Decimal(level.tp) : undefined,
    }));

    onSubmit({
      clientsNumber: hideClientsField ? 1 : parseInt(values.clientsNumber),
      tradesPerClient: parseInt(values.tradesPerClient),
      initialBalance: 200000, // Fixed default value
      commissionPerTrade: 10, // Fixed default
      burnWonChallenges: values.burnWonChallenges,
      tradeOutputRandom: values.tradeOutputRandom || false,
      levels,
    });
  };

  const addLevel = () => {
    append({ maxBalance: "", sl: "", tp: "" });
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
                      <FormLabel>Trade Outcome Random (Optional)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm text-muted-foreground">
                            {field.value ? "Random outcomes" : "Probability-based"}
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
                      <Button type="button" onClick={addLevel} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Level
                      </Button>
                    </div>
                    
                    {fields.length > 0 && (
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
                            {fields.map((field, index) => (
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
                                    onClick={() => remove(index)}
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
                    
                    {fields.length === 0 && (
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
              <Button type="submit" className="w-full" disabled={isLoading}>
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
