'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDerivApi } from '@/context/deriv-api-context';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

export function TradeLog() {
  const { trades, totalProfit, totalWins, totalLosses } = useDerivApi();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Trade Log</CardTitle>
        <CardDescription>{totalWins} won, {totalLosses} lost. Total Profit: {totalProfit.toFixed(2)} USD</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
            {trades.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <MinusCircle className="h-12 w-12 mb-4" />
                    <p>No trades have been executed yet.</p>
                </div>
            ) : (
                <ul className="space-y-4">
                {trades.map((trade) => (
                    <li key={trade.id} className="flex items-start gap-4">
                    <div>
                        {trade.isWin ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                            <XCircle className="h-6 w-6 text-red-500" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <p className="font-medium text-sm">{trade.description}</p>
                            <div className="text-right">
                                <p className={`font-bold ${trade.isWin ? 'text-green-500' : 'text-red-500'}`}>
                                    {trade.payout.toFixed(2)}
                                </p>
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
            )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
