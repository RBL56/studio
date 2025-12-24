'use client';

import { useBot } from '@/context/bot-context';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFormContext } from 'react-hook-form';
import type { BotConfigurationValues } from './bot-configuration-form';

export function StartTradingButton() {
  const { isBotRunning, startBot, stopBot } = useBot();
  const { toast } = useToast();
  const form = useFormContext<BotConfigurationValues>();

  const handleToggleBot = () => {
    if (isBotRunning) {
      stopBot();
      toast({
        title: 'Bot Stopped',
        description: 'The trading bot has been stopped.',
      });
    } else {
      form.handleSubmit((data) => {
        startBot(data);
        toast({
          title: 'Bot Started',
          description: 'The bot has started with your configuration.',
        });
      })();
    }
  };

  return (
    <div className="mt-4">
      <Button onClick={handleToggleBot} size="lg" className="w-full" variant={isBotRunning ? 'destructive' : 'default'}>
        {isBotRunning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Stopping Bot...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" /> Start Trading
          </>
        )}
      </Button>
    </div>
  );
}
