'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';

export function TradeLog() {
  // Mock data, this would come from your trading logic
  const trades = [
    {
      id: 'trade1',
      description: 'Win Payout If The Last Digit Of Volatility 100 Index Is Not 1 After 5 Ticks.',
      marketId: 'R_100',
      stake: 10.00,
      payout: 0.96,
      isWin: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Trade Log</CardTitle>
        <CardDescription>1 won, 0 lost. Total Profit: 0.96</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {trades.map((trade) => (
            <li key={trade.id} className="flex items-start gap-4">
              <div>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                    <p className="font-medium">{trade.description}</p>
                    <div className="text-right">
                        <p className="font-bold text-green-500">+{trade.payout.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">USD</p>
                    </div>
                </div>
                <div className="flex justify-between items-end mt-1">
                    <Badge variant="secondary">{trade.marketId}</Badge>
                    <p className="text-xs text-muted-foreground">Stake: {trade.stake.toFixed(2)} USD</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
