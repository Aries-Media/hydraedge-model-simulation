
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const formSchema = z.object({
  clientsNumber: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 10000;
  }, "Must be a number between 1 and 10000"),
  tradesPerClient: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 1000;
  }, "Must be a number between 1 and 1000"),
  challengeCost: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 10000;
  }, "Must be a number between 1 and 10000"),
  tpGainChallenge: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1;
  }, "Must be a positive number"),
  slLossChallenge: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1;
  }, "Must be a positive number"),
  tpGainReal: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1;
  }, "Must be a positive number"),
  slLossReal: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1;
  }, "Must be a positive number"),
  propPayout: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1;
  }, "Must be a positive number"),
});

interface SimulationFormProps {
  onSubmit: (values: {
    clientsNumber: number;
    tradesPerClient: number;
    challengeCost: number;
    tpGainChallenge: number;
    slLossChallenge: number;
    tpGainReal: number;
    slLossReal: number;
    propPayout: number;
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
      clientsNumber: "1", // Default to 1 when hideClientsField is true
      tradesPerClient: "250",
      challengeCost: "900",
      tpGainChallenge: "1725",
      slLossChallenge: "1500",
      tpGainReal: "2850",
      slLossReal: "750",
      propPayout: "1600",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      clientsNumber: hideClientsField ? 1 : parseInt(values.clientsNumber),
      tradesPerClient: parseInt(values.tradesPerClient),
      challengeCost: parseInt(values.challengeCost),
      tpGainChallenge: parseInt(values.tpGainChallenge),
      slLossChallenge: parseInt(values.slLossChallenge),
      tpGainReal: parseInt(values.tpGainReal),
      slLossReal: parseInt(values.slLossReal),
      propPayout: parseInt(values.propPayout),
    });
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
              {/* First row */}
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
                  name="challengeCost"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>{t("challengeCost")}</FormLabel>
                      <FormControl>
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("challengeCost")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Second row */}
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="tpGainChallenge"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>{t("tpGainChallenge")}</FormLabel>
                      <FormControl>
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("tpGainChallenge")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slLossChallenge"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>{t("slLossChallenge")}</FormLabel>
                      <FormControl>
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("slLossChallenge")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tpGainReal"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>{t("tpGainReal")}</FormLabel>
                      <FormControl>
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("tpGainReal")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slLossReal"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>{t("slLossReal")}</FormLabel>
                      <FormControl>
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("slLossReal")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="propPayout"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>{t("propPayout")}</FormLabel>
                      <FormControl>
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t("propPayout")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
