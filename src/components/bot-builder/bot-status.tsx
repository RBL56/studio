'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, PlayCircle, Square, CircleDollarSign, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '../ui/button';
import { useBot } from '@/context/bot-context';

export function BotStatus() {
  const { botStatus, totalProfit, totalRuns, totalStake, totalWins, totalLosses, resetStats, isBotRunning } = useBot();

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
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <p className="font-semibold text-lg">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {icon}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-5 w-5 text-green-500" />
                    <div>
                        <p className="text-muted-foreground">Total Profit</p>
                        <p className="font-bold">{totalProfit.toFixed(2)} USD</p>
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
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-lg">{totalRuns}</p>
                    <p className="text-muted-foreground">Total Runs</p>
                </div>
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div>
                        <p className="text-muted-foreground">Wins</p>
                        <p className="font-bold">{totalWins}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <div>
                        <p className="text-muted-foreground">Losses</p>
                        <p className="font-bold">{totalLosses}</p>
                    </div>
                </div>
            </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" onClick={resetStats} disabled={isBotRunning}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Log
        </Button>
      </CardFooter>
    </Card>
  );
}
