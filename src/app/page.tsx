'use client';

import { useState } from 'react';
import type { Strategy } from '@/lib/types';
import { TradingForm } from '@/components/bot-builder/trading-form';
import { useDerivApi } from '@/context/deriv-api-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function BotBuilderPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const { isConnected } = useDerivApi();

  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
            {isConnected ? (
              <TradingForm />
            ) : (
                <Card className="h-full flex flex-col justify-center items-center text-center">
                    <CardHeader>
                        <div className="mx-auto bg-destructive/10 rounded-full p-3 w-fit mb-4">
                            <ShieldAlert className="h-8 w-8 text-destructive" />
                        </div>
                        <CardTitle className="font-headline text-2xl">Connect Your Account</CardTitle>
                        <CardDescription>
                            Please connect your Deriv account using your API token to start trading.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            You can get your API token from your Deriv account settings. Click the "API Token" button in the header to get started.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
        <div className="lg:col-span-2">
          {/* Backtest results were previously here */}
        </div>
      </div>
    </div>
  );
}
