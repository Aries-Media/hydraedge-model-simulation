
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const formSchema = z.object({
  clientsNumber: z.coerce.number().min(1),
  tradesPerClient: z.coerce.number().min(1),
  challengeCost: z.coerce.number().min(0),
  tpGainChallenge: z.coerce.number().min(0),
  slLossChallenge: z.coerce.number().min(0),
  tpGainReal: z.coerce.number().min(0),
  slLossReal: z.coerce.number().min(0),
  propPayout: z.coerce.number().min(0),
});

interface SimulationFormV1Props {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
}

export function SimulationFormV1({ onSubmit, isLoading }: SimulationFormV1Props) {
  const { t } = useLanguage();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientsNumber: 1000,
      tradesPerClient: 100,
      challengeCost: 900,
      tpGainChallenge: 6000,
      slLossChallenge: 8200,
      tpGainReal: 2000,
      slLossReal: 4000,
      propPayout: 4000,
    },
  });

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>V1 Simulation Parameters</CardTitle>
        <CardDescription>
          Configure the parameters for the original simulation model
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientsNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clients Number</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tradesPerClient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trades per Client</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="challengeCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challenge Cost</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tpGainChallenge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TP Gain (Challenge)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slLossChallenge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SL Loss (Challenge)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tpGainReal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TP Gain (Real)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slLossReal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SL Loss (Real)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="propPayout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prop Payout</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Simulation...
                </>
              ) : (
                "Run Simulation"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
