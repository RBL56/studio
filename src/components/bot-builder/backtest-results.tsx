import type { BacktestWithAIOutput } from '@/ai/flows/backtest-with-ai';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Lightbulb, TrendingUp, TrendingDown, BarChart } from 'lucide-react';
import { Separator } from '../ui/separator';

interface BacktestResultsProps {
  result: BacktestWithAIOutput | null;
  isLoading: boolean;
}

export function BacktestResults({ result, isLoading }: BacktestResultsProps) {
  if (isLoading) {
    return (
      <Card className="sticky top-20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline">AI Analysis in Progress...</CardTitle>
          </div>
          <CardDescription>The AI is analyzing your strategy against historical data. Please wait.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Separator />
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!result) {
    return (
      <Card className="sticky top-20 text-center">
        <CardHeader>
            <div className="mx-auto bg-secondary rounded-full p-3 w-fit">
              <BarChart className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="font-headline">Backtest Results</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Your backtesting results will appear here once you run an analysis.</p>
        </CardContent>
      </Card>
    );
  }

  const isWin = result.winLossProjection.toLowerCase().includes('win') || result.winLossProjection.toLowerCase().includes('profit');

  return (
    <Card className="sticky top-20 border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-3">
            <Bot className="h-6 w-6 text-primary" />
            AI Backtest Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold font-headline flex items-center gap-2 mb-2">
            {isWin ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
            Win/Loss Projection
          </h3>
          <p className="text-sm text-foreground/80">{result.winLossProjection}</p>
        </div>
        <Separator />
        <div>
          <h3 className="font-semibold font-headline flex items-center gap-2 mb-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Strategy Insights
          </h3>
          <p className="text-sm text-foreground/80">{result.strategyInsights}</p>
        </div>
      </CardContent>
    </Card>
  );
}
