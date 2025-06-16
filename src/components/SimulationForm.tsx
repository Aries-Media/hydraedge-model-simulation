
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LevelRule } from "@/utils/simulation";
import Decimal from 'decimal.js';

const levelRuleSchema = z.object({
  maxBalance: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive number"),
  sl: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive number"),
  tp: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive number"),
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
  initialBalance: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 10000 && num <= 1000000;
  }, "Must be a number between 10000 and 1000000"),
  levels: z.array(levelRuleSchema).optional(),
});

interface SimulationFormProps {
  onSubmit: (values: {
    clientsNumber: number;
    tradesPerClient: number;
    initialBalance: number;
    commissionPerTrade: number;
    burnWonChallenges: boolean;
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
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientsNumber: "500",
      tradesPerClient: "180",
      initialBalance: "200000",
      levels: [
        { maxBalance: "200000", sl: "8200", tp: "6000" },
        { maxBalance: "206000", sl: "7000", tp: "6000" },
        { maxBalance: "212000", sl: "8400", tp: "6000" },
        { maxBalance: "218000", sl: "7000", tp: "6000" },
        { maxBalance: "224000", sl: "8800", tp: "16000" },
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
      tp: new Decimal(level.tp),
    }));

    onSubmit({
      clientsNumber: hideClientsField ? 1 : parseInt(values.clientsNumber),
      tradesPerClient: parseInt(values.tradesPerClient),
      initialBalance: parseInt(values.initialBalance),
      commissionPerTrade: 10, // Fixed default
      burnWonChallenges: true, // Fixed default
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
                <FormField
                  control={form.control}
                  name="initialBalance"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>{t("initialBalance")}</FormLabel>
                      <FormControl>
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormDescription>
                        Starting challenge balance (50k, 100k, 200k, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Levels Configuration Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Trading Levels Configuration</h3>
                  <Button type="button" onClick={addLevel} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Level
                  </Button>
                </div>
                
                {fields.length > 0 && (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Level {index + 1}</h4>
                          <Button
                            type="button"
                            onClick={() => remove(index)}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`levels.${index}.maxBalance`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Balance</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Upper limit for this level
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`levels.${index}.sl`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stop Loss</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Stop loss distance
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`levels.${index}.tp`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Take Profit</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Take profit distance
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                
                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No custom levels defined. Default levels will be used.</p>
                    <p className="text-sm mt-2">Click "Add Level" to define custom trading levels.</p>
                  </div>
                )}
              </div>
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
