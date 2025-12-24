'use client';

import { useState } from 'react';
import type { BacktestWithAIOutput } from '@/ai/flows/backtest-with-ai';
import { StrategyForm } from '@/components/bot-builder/strategy-form';
import { BacktestResults } from '@/components/bot-builder/backtest-results';
import { QuickStrategies } from '@/components/bot-builder/quick-strategies';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export type Strategy = {
  name: string;
  description: string;
  details: string;
};

export default function BotBuilderPage() {
  const [backtestResult, setBacktestResult] = useState<BacktestWithAIOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Create Your Trading Bot</CardTitle>
              <CardDescription>
                Define your strategy using natural language, or get started with a template.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StrategyForm
                setBacktestResult={setBacktestResult}
                setIsLoading={setIsLoading}
                selectedStrategy={selectedStrategy}
              />
            </CardContent>
          </Card>
           <Separator />
          <QuickStrategies onSelectStrategy={setSelectedStrategy} />
        </div>
        <div className="lg:col-span-2">
          <BacktestResults result={backtestResult} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
