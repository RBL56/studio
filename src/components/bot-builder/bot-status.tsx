'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDerivApi } from '@/context/deriv-api-context';
import { Loader2, PlayCircle, Square, CircleDollarSign } from 'lucide-react';

export function BotStatus() {
  const { botStatus, totalProfit, totalRuns, totalStake } = useDerivApi();

  const getStatusContent = () => {
    switch (botStatus) {
      case 'running':
        return {
          icon: <Loader2 className="h-6 w-6 animate-spin text-primary" />,
          title: 'Trade in Progress',
          description: 'Monitoring for contract result.',
        };
      case 'stopped':
        return {
          icon: <Square className="h-6 w-6 text-destructive" />,
          title: 'Bot Stopped',
          description: 'Press "Start Bot" to begin trading.',
        };
      case 'idle':
        return {
          icon: <PlayCircle className="h-6 w-6 text-muted-foreground" />,
          title: 'Bot is Idle',
          description: 'Ready to start trading.',
        };
      default:
        return {
          icon: <PlayCircle className="h-6 w-6 text-muted-foreground" />,
          title: 'Bot is Idle',
          description: 'Ready to start trading.',
        };
    }
  };

  const { icon, title, description } = getStatusContent();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Bot Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
            <div>
                <p className="font-semibold text-lg">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {icon}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm pt-4">
            <div className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-green-500" />
                <div>
                    <p className="text-muted-foreground">Total Profit</p>
                    <p className="font-bold">{totalProfit.toFixed(2)} USD</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <p className="font-bold text-xl">{totalRuns}</p>
                <div>
                    <p className="text-muted-foreground">Total Runs</p>
                </div>
            </div>
             <div className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-red-500" />
                <div>
                    <p className="text-muted-foreground">Total Stake</p>
                    <p className="font-bold">{totalStake.toFixed(2)} USD</p>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
