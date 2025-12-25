'use client';

import { useBot } from '@/context/bot-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function QuickTradePanel() {
  const { startBot, stopBot, resetStats, isBotRunning, botConfig } = useBot();
  const { toast } = useToast();

  const handleStart = () => {
    if (botConfig) {
      startBot(botConfig);
    } else {
      toast({
        variant: 'destructive',
        title: 'No Configuration Found',
        description: 'Please configure the bot in the "Bot Builder" tab first.',
      });
    }
  };

  return (
    <Card className="mt-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={handleStart} disabled={isBotRunning} className="w-full">
            <Play className="mr-2 h-4 w-4" /> Start
          </Button>
          <Button type="button" variant="destructive" onClick={stopBot} disabled={!isBotRunning} className="w-full">
            <Pause className="mr-2 h-4 w-4" /> Stop
          </Button>
          <Button type="button" variant="outline" onClick={resetStats} disabled={isBotRunning} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
