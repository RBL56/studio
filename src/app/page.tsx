'use client';

import { useState } from 'react';
import { StrategyForm } from '@/components/bot-builder/strategy-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export type Strategy = {
  name: string;
  description: string;
  details: string;
};

export default function BotBuilderPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Create Your Trading Bot</CardTitle>
              <CardDescription>
                Define your strategy using natural language, or import an existing one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StrategyForm
                selectedStrategy={selectedStrategy}
              />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          {/* Backtest results were previously here */}
        </div>
      </div>
    </div>
  );
}
