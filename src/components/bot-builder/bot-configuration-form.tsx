'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, RefreshCw, Square } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useDerivApi } from '@/context/deriv-api-context';
import { VOLATILITY_MARKETS } from '@/lib/constants';

const botConfigurationSchema = z.object({
  market: z.string().min(1, 'Please select a market.'),
  tradeType: z.string().min(1, 'Please select a trade type.'),
  ticks: z.coerce.number().int().min(1).max(10),
  lastDigitPrediction: z.coerce.number().int().min(0).max(9),
  predictionType: z.enum(['matches', 'differs']),
  initialStake: z.coerce.number().min(0.35, 'Minimum stake is $0.35.'),
  takeProfit: z.coerce.number().optional(),
  stopLoss: z.coerce.number().optional(),
  useMartingale: z.boolean().default(false),
  martingaleFactor: z.coerce.number().min(1, "Factor must be at least 1.").optional(),
});

export type BotConfigurationValues = z.infer<typeof botConfigurationSchema>;

export function BotConfigurationForm() {
  const { toast } = useToast();
  const { isBotRunning, startBot, stopBot } = useDerivApi();

  const form = useForm<BotConfigurationValues>({
    resolver: zodResolver(botConfigurationSchema),
    defaultValues: {
      market: '1HZ10V',
      tradeType: 'matches_differs',
      ticks: 5,
      lastDigitPrediction: 1,
      predictionType: 'differs',
      initialStake: 1,
      takeProfit: 20,
      stopLoss: 10,
      useMartingale: true,
      martingaleFactor: 2,
    },
  });

  const onSubmit = async (data: BotConfigurationValues) => {
    if (isBotRunning) {
        stopBot();
        toast({
            title: 'Bot Stopped',
            description: 'The trading bot has been stopped.',
        });
    } else {
        startBot(data);
        toast({
            title: 'Bot Started',
            description: 'The bot has started with your configuration.',
        });
    }
  };

  const useMartingale = form.watch('useMartingale');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Bot Configuration
        </CardTitle>
        <CardDescription>Set up your trading parameters. The bot will run until you stop it or it hits a limit.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="market"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isBotRunning}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a market" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VOLATILITY_MARKETS.map(market => (
                            <SelectItem key={market.symbol} value={market.symbol}>
                                {market.name}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tradeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isBotRunning}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a trade type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="matches_differs">Matches/Differs</SelectItem>
                        {/* More trade types can be added here */}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="ticks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticks (1-10)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={isBotRunning} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastDigitPrediction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Digit Prediction (0-9)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="9" {...field} disabled={isBotRunning} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="predictionType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex items-center gap-6"
                      disabled={isBotRunning}
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="matches" />
                        </FormControl>
                        <FormLabel className="font-normal">Matches</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="differs" />
                        </FormControl>
                        <FormLabel className="font-normal">Differs</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialStake"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Stake ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} disabled={isBotRunning} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="takeProfit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Take Profit ($) (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''} disabled={isBotRunning} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stopLoss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stop Loss ($) (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''} disabled={isBotRunning} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="useMartingale"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Martingale</FormLabel>
                    <CardDescription>
                      Automatically increase stake after a loss.
                    </CardDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isBotRunning}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {useMartingale && (
                <FormField
                control={form.control}
                name="martingaleFactor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Martingale Factor</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} value={field.value ?? ''} disabled={isBotRunning} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="pt-4">
                <Button type="submit" size="lg" className="w-full" variant={isBotRunning ? "destructive" : "default"}>
                  {isBotRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Stopping Bot...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" /> Start Bot
                    </>
                  )}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
