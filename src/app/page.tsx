'use client';

import { useState } from 'react';
import { useDerivApi } from '@/context/deriv-api-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Bot, Signal, Trophy, CandlestickChart, Circle, Waypoints } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BotProvider } from '@/context/bot-context';
import { DigitAnalysisTool } from '@/components/digit-analysis-tool';
import BotConfigurationForm from '@/components/bot-builder/bot-configuration-form';
import BotStatus from '@/components/bot-builder/bot-status';
import TradeLog from '@/components/bot-builder/trade-log';
import { Separator } from '@/components/ui/separator';


export default function BotBuilderPage() {
  const { isConnected } = useDerivApi();

  const botBuilderInterface = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <BotConfigurationForm />
      </div>
      <div className="lg:col-span-2">
        <BotStatus />
        <Separator className="my-6" />
        <TradeLog />
      </div>
    </div>
  );

  const tradingInterface = (
    <div className="grid grid-cols-1 gap-8">
      <Tabs defaultValue="bot-builder" className="w-full">
        <ScrollArea className="w-full whitespace-nowrap pb-4">
            <TabsList className="grid w-full grid-cols-4 mb-6 min-w-[600px]">
                <TabsTrigger value="bot-builder" className="py-3 text-base"><Waypoints className="mr-2 h-5 w-5" />Bot Builder</TabsTrigger>
                <TabsTrigger value="dcircle" className="py-3 text-base"><Circle className="mr-2 h-5 w-5" />DCircle</TabsTrigger>
                <TabsTrigger value="trading-view" className="py-3 text-base"><CandlestickChart className="mr-2 h-5 w-5" />TradingView</TabsTrigger>
                <TabsTrigger value="signal-arena" className="py-3 text-base"><Trophy className="mr-2 h-5 w-5" />Signal Arena</TabsTrigger>
            </TabsList>
        </ScrollArea>
        
        <TabsContent value="bot-builder">
            <Tabs defaultValue="speedbot" className="w-full">
                <ScrollArea className="w-full whitespace-nowrap pb-4">
                    <TabsList className="grid w-full grid-cols-2 mb-6 min-w-[300px]">
                        <TabsTrigger value="speedbot" className="py-3 text-base"><Bot className="mr-2 h-5 w-5" />SpeedBot</TabsTrigger>
                        <TabsTrigger value="signalbot" className="py-3 text-base"><Signal className="mr-2 h-5 w-5" />Signal Bot</TabsTrigger>
                    </TabsList>
                </ScrollArea>
                
                <TabsContent value="speedbot">
                  {botBuilderInterface}
                </TabsContent>

                <TabsContent value="signalbot">
                  <Card>
                    <CardHeader>
                      <CardTitle>Under Development</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>This feature is currently under development and will be available soon.</p>
                    </CardContent>
                  </Card>
                </TabsContent>
            </Tabs>
        </TabsContent>

        <TabsContent value="dcircle">
          <DigitAnalysisTool />
        </TabsContent>

        <TabsContent value="trading-view">
            <div className="w-full rounded-md overflow-hidden border h-[70vh]">
                <iframe
                    src="https://charts.deriv.com"
                    className="w-full h-full"
                    title="Deriv TradingView Chart"
                />
            </div>
        </TabsContent>

        <TabsContent value="signal-arena">
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
      </Tabs>
    </div>
  );

  return (
    <div className="container py-8">
      <BotProvider>
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
      </BotProvider>
    </div>
  );
}
