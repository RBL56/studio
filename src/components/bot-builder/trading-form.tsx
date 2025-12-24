'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const tradeFormSchema = z.object({
  asset: z.string().min(1, 'Please select an asset.'),
  amount: z.coerce.number().min(1, 'Amount must be at least 1.'),
  tradeType: z.enum(['buy', 'sell']),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

export function TradingForm() {
  const { toast } = useToast();
  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      asset: 'EUR/USD',
      amount: 10,
      tradeType: 'buy',
    },
  });

  const onSubmit = async (data: TradeFormValues) => {
    form.clearErrors();
    console.log('Placing trade:', data);
    toast({
      title: "Trade Placed Successfully",
      description: `Your ${data.tradeType.toUpperCase()} order for ${data.amount} on ${data.asset} has been submitted.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Manual Trade</CardTitle>
        <CardDescription>Place a trade directly from here.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="asset"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an asset to trade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                      <SelectItem value="USD/JPY">USD/JPY</SelectItem>
                      <SelectItem value="GBP/USD">GBP/USD</SelectItem>
                      <SelectItem value="BTC/USD">BTC/USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                size="lg"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => form.setValue('tradeType', 'buy')}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && form.getValues('tradeType') === 'buy' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="mr-2 h-5 w-5" />
                )}
                Buy
              </Button>
              <Button
                type="submit"
                size="lg"
                variant="destructive"
                className="flex-1"
                onClick={() => form.setValue('tradeType', 'sell')}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && form.getValues('tradeType') === 'sell' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDown className="mr-2 h-5 w-5" />
                )}
                Sell
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
