'use client';

import { BotConfigurationForm } from '@/components/bot-builder/bot-configuration-form';
import { useDerivApi } from '@/context/deriv-api-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Bot, Signal, Trophy, Circle, CandlestickChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BotStatus } from '@/components/bot-builder/bot-status';
import { TradeLog } from '@/components/bot-builder/trade-log';
import { BotProvider } from '@/context/bot-context';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { botConfigurationSchema, type BotConfigurationValues } from '@/components/bot-builder/bot-configuration-form';
import { StartTradingButton } from '@/components/bot-builder/start-trading-button';
import { DigitAnalysisTool } from '@/components/bot-builder/digit-analysis-tool';

export default function BotBuilderPage() {
  const { isConnected } = useDerivApi();

  const formMethods = useForm<BotConfigurationValues>({
    resolver: zodResolver(botConfigurationSchema),
    defaultValues: {
      market: '1HZ10V',
      tradeType: 'matches_differs',
      ticks: 5,
      lastDigitPrediction: 1,
      predictionType: 'differs',
      initialStake: 1,
      takeProfit: 20,
      stopLoss: 10,
      useMartingale: true,
      martingaleFactor: 2,
      useBulkTrading: false,
      bulkTradeCount: 5,
    },
  });

  const botInterface = (
    <>
      {isConnected ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <FormProvider {...formMethods}>
              <BotConfigurationForm />
            </FormProvider>
          </div>
          <div className="space-y-8">
            <BotStatus />
            <TradeLog />
          </div>
        </div>
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
    </>
  );

  return (
    <div className="container py-8">
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
          <BotProvider>
            <FormProvider {...formMethods}>
                {botInterface}
            </FormProvider>
          </BotProvider>
        </TabsContent>
        <TabsContent value="signalbot">
          <BotProvider>
            <FormProvider {...formMethods}>
              {botInterface}
            </FormProvider>
          </BotProvider>
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
        </TabsContent>
        <TabsContent value="tradingview">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <CandlestickChart className="h-6 w-6" />
                TradingView
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>TradingView content will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
