
'use client';

import { useDerivApi } from '@/context/deriv-api-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Bot, Signal, CandlestickChart, Circle, Waypoints, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BotProvider, useBot } from '@/context/bot-context';
import { DigitAnalysisTool } from '@/components/digit-analysis-tool';
import BotConfigurationForm from '@/components/bot-builder/bot-configuration-form';
import BotStatus from '@/components/bot-builder/bot-status';
import TradeLog from '@/components/bot-builder/trade-log';
import QuickTradePanel from '@/components/bot-builder/quick-trade-panel';
import { useDigitAnalysis } from '@/context/digit-analysis-context';
import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';
import SignalArena from '@/components/bot-builder/signal-arena';

function BotBuilderContent() {
  const { isConnected } = useDerivApi();
  const { connect: connectDigitAnalysis, disconnect: disconnectDigitAnalysis, status: digitAnalysisStatus } = useDigitAnalysis();
  const { 
    activeTab, 
    setActiveTab, 
    activeBuilderTab, 
    setActiveBuilderTab, 
    tradeLogRef 
  } = useBot();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'dcircle') {
      if (digitAnalysisStatus !== 'connected' && digitAnalysisStatus !== 'connecting' && digitAnalysisStatus !== 'collecting') {
        connectDigitAnalysis();
      }
    } else {
      if (digitAnalysisStatus === 'connected' || digitAnalysisStatus === 'connecting' || digitAnalysisStatus === 'collecting') {
        disconnectDigitAnalysis();
      }
    }
  };

  return (
    <div className={cn("py-4 md:py-8")}>
        {isConnected ? (
          <>
          <SignalArena isVisible={activeTab === 'signal-arena'} />
          <Tabs value={activeTab} className="w-full md:grid md:grid-cols-[250px_1fr] gap-8" onValueChange={handleTabChange}>
              <TabsList className="flex-col h-auto hidden md:flex">
                  <TabsTrigger value="bot-builder" className="py-3 text-base w-full justify-start"><Waypoints className="mr-2 h-5 w-5" />Bot Builder</TabsTrigger>
                  <TabsTrigger value="dcircle" className="py-3 text-base w-full justify-start"><Circle className="mr-2 h-5 w-5" />DCircle</TabsTrigger>
                  <TabsTrigger value="signal-arena" className="py-3 text-base w-full justify-start"><Target className="mr-2 h-5 w-5" />Signal Arena</TabsTrigger>
                  <TabsTrigger value="trading-view" className="py-3 text-base w-full justify-start"><CandlestickChart className="mr-2 h-5 w-5" />TradingView</TabsTrigger>
              </TabsList>
              
              <div className="md:hidden px-4 mb-4">
                 <ScrollArea className="w-full whitespace-nowrap pb-2">
                    <TabsList className="inline-flex w-full mb-4">
                        <TabsTrigger value="bot-builder" className="py-3 text-base"><Waypoints className="mr-2 h-5 w-5" />Bot Builder</TabsTrigger>
                        <TabsTrigger value="dcircle" className="py-3 text-base"><Circle className="mr-2 h-5 w-5" />DCircle</TabsTrigger>
                        <TabsTrigger value="signal-arena" className="py-3 text-base w-full justify-start"><Target className="mr-2 h-5 w-5" />Signal Arena</TabsTrigger>
                        <TabsTrigger value="trading-view" className="py-3 text-base"><CandlestickChart className="mr-2 h-5 w-5" />TradingView</TabsTrigger>
                    </TabsList>
                </ScrollArea>
              </div>

              <div className={cn(activeTab === 'signal-arena' ? 'hidden' : 'block')}>
                <TabsContent value="bot-builder" className="mt-0 px-4 md:px-0">
                    <Tabs value={activeBuilderTab} className="w-full" onValueChange={setActiveBuilderTab}>
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="speedbot" className="py-3 text-base"><Bot className="mr-2 h-5 w-5" />SpeedBot</TabsTrigger>
                            <TabsTrigger value="signalbot" className="py-3 text-base"><Signal className="mr-2 h-5 w-5" />Signal Bot</TabsTrigger>
                        </TabsList>
                        <TabsContent value="speedbot">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1">
                                    <BotConfigurationForm />
                                </div>
                                <div className="lg:col-span-2 space-y-8">
                                    <BotStatus />
                                    <div ref={tradeLogRef}>
                                      <TradeLog />
                                    </div>
                                </div>
                            </div>
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

                <TabsContent value="dcircle" className="mt-0 px-4 md:px-0">
                  <ScrollArea className="h-[calc(100vh-160px)] md:h-[calc(100vh-200px)]">
                    <div className="space-y-8 pr-4">
                        <QuickTradePanel />
                        <DigitAnalysisTool />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="trading-view" className="mt-0 px-4 md:px-0">
                    <div className="space-y-8">
                        <QuickTradePanel />
                        <div className="w-full rounded-md overflow-hidden border h-[70vh]">
                            <iframe
                                src="https://charts.deriv.com"
                                className="w-full h-full"
                                title="Deriv TradingView Chart"
                            />
                        </div>
                    </div>
                </TabsContent>
              </div>
          </Tabs>
          </>
        ) : (
          <Card className="h-full flex flex-col justify-center items-center text-center py-16 mx-4 md:mx-0">
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
    </div>
  );
}

export default function BotBuilderPage() {
  return (
    <BotProvider>
      <BotBuilderContent />
    </BotProvider>
  )
}
