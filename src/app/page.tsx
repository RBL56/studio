
'use client';

import { BotConfigurationForm } from '@/components/bot-builder/bot-configuration-form';
import { useDerivApi } from '@/context/deriv-api-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Bot, Signal, Trophy, Circle, CandlestickChart, Play, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BotStatus } from '@/components/bot-builder/bot-status';
import { TradeLog } from '@/components/bot-builder/trade-log';
import { BotProvider, useBot } from '@/context/bot-context';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { botConfigurationSchema, type BotConfigurationValues } from '@/components/bot-builder/bot-configuration-form';
import { DigitAnalysisTool } from '@/components/bot-builder/digit-analysis-tool';
import { StartTradingButton } from '@/components/bot-builder/start-trading-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

function TradingViewTabContent() {
    const { isBotRunning, startBot, stopBot } = useBot();
    const { toast } = useToast();
    const form = useFormContext<BotConfigurationValues>();
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

    const handleToggleBot = () => {
        if (isBotRunning) {
            stopBot();
            toast({
                title: 'Bot Stopped',
                description: 'The trading bot has been stopped.',
            });
            setIsStatusDialogOpen(false);
        } else {
            form.handleSubmit((data) => {
                startBot(data);
                toast({
                    title: 'Bot Started',
                    description: 'The bot has started with your configuration.',
                });
                setIsStatusDialogOpen(true);
            }, (errors) => {
                console.error("Form validation failed", errors);
                toast({
                    variant: "destructive",
                    title: 'Invalid Configuration',
                    description: 'Please check your bot configuration and try again.',
                });
            })();
        }
    };
    
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                    <CandlestickChart className="h-6 w-6" />
                    TradingView Chart
                    </CardTitle>
                    <CardDescription>
                    Live chart from deriv.com for your analysis.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video w-full rounded-md overflow-hidden border">
                        <iframe
                            src="https://charts.deriv.com"
                            className="w-full h-full"
                            title="Deriv TradingView Chart"
                        />
                    </div>
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
                </CardContent>
            </Card>
            <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                <DialogContent className="max-w-3xl grid-rows-[auto_1fr] gap-0 p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="font-headline">Live Bot Status</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto">
                        <BotStatus />
                        <TradeLog />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}


export default function BotBuilderPage() {
  const { isConnected } = useDerivApi();

  const formMethods = useForm<BotConfigurationValues>({
    resolver: zodResolver(botConfigurationSchema),
    defaultValues: {
      market: '1HZ75V',
      tradeType: 'matches_differs',
      ticks: 1,
      lastDigitPrediction: 4,
      predictionType: 'differs',
      initialStake: 10,
      takeProfit: 2,
      stopLoss: 10,
      useMartingale: true,
      martingaleFactor: 2,
      useBulkTrading: false,
      bulkTradeCount: 5,
    },
  });

  const tradingInterface = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Tabs defaultValue="speedbot" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <TabsList className="grid w-full grid-cols-5 mb-6 min-w-[600px]">
              <TabsTrigger value="speedbot" className="py-3 text-base"><Bot className="mr-2 h-5 w-5" />SpeedBot</TabsTrigger>
              <TabsTrigger value="signalbot" className="py-3 text-base"><Signal className="mr-2 h-5 w-5" />Signal Bot</TabsTrigger>
              <TabsTrigger value="signalarena" className="py-3 text-base"><Trophy className="mr-2 h-5 w-5" />Signal Arena</TabsTrigger>
              <TabsTrigger value="dcircle" className="py-3 text-base"><Circle className="mr-2 h-5 w-5" />DCircle</TabsTrigger>
              <TabsTrigger value="tradingview" className="py-3 text-base"><CandlestickChart className="mr-2 h-5 w-5" />TradingView</TabsTrigger>
            </TabsList>
          </ScrollArea>
          
          <TabsContent value="speedbot">
            <BotConfigurationForm />
          </TabsContent>
          <TabsContent value="signalbot">
            <BotConfigurationForm />
          </TabsContent>
          <TabsContent value="signalarena">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Trophy className="h-6 w-6" />
                  Signal Arena
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Signal Arena content will be here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="dcircle">
              <DigitAnalysisTool />
              <StartTradingButton />
          </TabsContent>
          <TabsContent value="tradingview">
            <TradingViewTabContent />
          </TabsContent>
        </Tabs>
      </div>
      <div className="space-y-8 mt-8 lg:mt-0">
        <BotStatus />
        <TradeLog />
      </div>
    </div>
  );

  return (
    <div className="container py-8">
      <BotProvider>
        <FormProvider {...formMethods}>
          {isConnected ? (
            tradingInterface
          ) : (
            <Card className="h-full flex flex-col justify-center items-center text-center py-16">
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
        </FormProvider>
      </BotProvider>
    </div>
  );
}
