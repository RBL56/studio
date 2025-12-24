'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useDerivApi } from '@/context/deriv-api-context';
import { VOLATILITY_MARKETS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '../ui/skeleton';
import { TrendingUp, TrendingDown, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BotConfigurationValues } from './bot-configuration-form';
import { StartTradingButton } from './start-trading-button';

export function DigitStats() {
  const { api, isConnected } = useDerivApi();
  const [ticks, setTicks] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'none'>(
    'none'
  );
  const [numTicks, setNumTicks] = useState(1000);
  const { watch, setValue } = useFormContext<BotConfigurationValues>();
  const market = watch('market');
  const lastDigitPrediction = watch('lastDigitPrediction');
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !isConnected || !market) return;

    // Unsubscribe from previous ticks subscription if it exists
    if (subscriptionId) {
      api.send(JSON.stringify({ forget: subscriptionId }));
    }
    
    // Reset state for new market
    setTicks([]);
    setCurrentPrice(null);
    setPriceDirection('none');

    api.send(
      JSON.stringify({
        ticks_history: market,
        count: numTicks,
        end: 'latest',
      })
    );
    api.send(
      JSON.stringify({
        ticks: market,
        subscribe: 1,
      })
    );

    return () => {
      // Don't unsubscribe on component unmount, let the new market effect handle it.
    };
  }, [api, isConnected, market, numTicks]);

  useEffect(() => {
    if (!api) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        return;
      }
      if (data.msg_type === 'history') {
        setTicks(data.history.prices);
        if (data.history.prices.length > 0) {
            const lastPrice = data.history.prices[data.history.prices.length - 1];
            setCurrentPrice(lastPrice);
        }
      }
      if (data.msg_type === 'tick') {
        if(data.subscription?.id){
            setSubscriptionId(data.subscription.id);
        }
        
        const newTick = data.tick;
        setTicks((prev) => [...prev.slice(-numTicks + 1), newTick.quote]);
        
        if (currentPrice !== null) {
            if (newTick.quote > currentPrice) {
                setPriceDirection('up');
            } else if (newTick.quote < currentPrice) {
                setPriceDirection('down');
            }
        }
        setCurrentPrice(newTick.quote);
      }
    };
    api.addEventListener('message', handleMessage);
    return () => api.removeEventListener('message', handleMessage);
  }, [api, numTicks, currentPrice]);

  const digitStats = useMemo(() => {
    const counts = Array(10).fill(0);
    const relevantTicks = ticks.slice(-numTicks);
    if (relevantTicks.length === 0) return { counts, even: 0, odd: 0 };

    relevantTicks.forEach((price) => {
      const priceStr = price.toString();
      const lastDigit = parseInt(priceStr[priceStr.length - 1]);
      if (!isNaN(lastDigit)) {
        counts[lastDigit]++;
      }
    });

    const even = counts.reduce((acc, count, digit) => acc + (digit % 2 === 0 ? count : 0), 0);
    const odd = relevantTicks.length - even;

    return {
      counts: counts.map((c) => (c / relevantTicks.length) * 100),
      even: (even / relevantTicks.length) * 100,
      odd: (odd / relevantTicks.length) * 100,
    };
  }, [ticks, numTicks]);

  const priceColor =
    priceDirection === 'up'
      ? 'text-green-500'
      : priceDirection === 'down'
      ? 'text-red-500'
      : 'text-foreground';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="md:col-span-1 space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                    <Select onValueChange={(value) => setValue('market', value)} defaultValue={market}>
                        <SelectTrigger className="w-full font-headline text-lg">
                            <SelectValue placeholder="Select a market" />
                        </SelectTrigger>
                        <SelectContent>
                            {VOLATILITY_MARKETS.map(m => (
                                <SelectItem key={m.symbol} value={m.symbol}>
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="text-center my-6">
                        {currentPrice === null ? (
                            <Skeleton className="h-12 w-48 mx-auto" />
                        ) : (
                            <p className={cn("text-5xl font-bold font-mono tracking-tighter", priceColor)}>
                                {currentPrice.toFixed(3)}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm text-muted-foreground">Number of Ticks</label>
                        <Select onValueChange={(v) => setNumTicks(parseInt(v))} defaultValue={numTicks.toString()}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[100, 500, 1000].map(n => (
                                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            <StartTradingButton />
        </div>
        <div className="md:col-span-2 space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Last Digit Prediction</CardTitle>
                </CardHeader>
                <CardContent>
                    {ticks.length > 0 ? (
                        <div className="grid grid-cols-5 gap-3 text-center">
                            {digitStats.counts.map((stat, digit) => (
                                <div
                                key={digit}
                                onClick={() => setValue('lastDigitPrediction', digit)}
                                className={cn(
                                    "p-3 rounded-lg border-2 transition-all cursor-pointer",
                                    lastDigitPrediction === digit ? 'bg-primary border-primary-foreground text-primary-foreground shadow-lg' : 'bg-muted/50 border-transparent hover:border-primary/50'
                                )}
                                >
                                    <p className="font-bold text-3xl font-headline">{digit}</p>
                                    <p className="text-sm font-mono">{stat.toFixed(1)}%</p>
                                </div>
                            ))}
                        </div>
                    ) : <Skeleton className="h-24 w-full" />}
                </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Even/Odd Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    {ticks.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-blue-500/10 text-center border-2 border-blue-500/30">
                                <TrendingUp className="h-8 w-8 text-blue-400 mx-auto mb-2"/>
                                <p className="text-muted-foreground">Even</p>
                                <p className="text-4xl font-bold font-mono text-blue-300">{digitStats.even.toFixed(1)}%</p>
                            </div>
                            <div className="p-4 rounded-lg bg-purple-500/10 text-center border-2 border-purple-500/30">
                                <Waves className="h-8 w-8 text-purple-400 mx-auto mb-2"/>
                                <p className="text-muted-foreground">Odd</p>
                                <p className="text-4xl font-bold font-mono text-purple-300">{digitStats.odd.toFixed(1)}%</p>
                            </div>
                        </div>
                     ) : <Skeleton className="h-24 w-full" />}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
