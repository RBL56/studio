'use client';

import { useState } from 'react';
import { TradingForm } from '@/components/bot-builder/trading-form';
import { useDerivApi } from '@/context/deriv-api-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Bot, Signal, Trophy, Circle, CandlestickChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BotBuilderPage() {
  const { isConnected } = useDerivApi();

  const renderTabContent = (title: string, icon: React.ReactNode, content: React.ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )

  return (
    <div className="container py-8">
      <Tabs defaultValue="speedbot" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="speedbot"><Bot className="mr-2 h-4 w-4" />SpeedBot</TabsTrigger>
          <TabsTrigger value="signalbot"><Signal className="mr-2 h-4 w-4" />Signal Bot</TabsTrigger>
          <TabsTrigger value="signalarena"><Trophy className="mr-2 h-4 w-4" />Signal Arena</TabsTrigger>
          <TabsTrigger value="dcircle"><Circle className="mr-2 h-4 w-4" />DCircle</TabsTrigger>
          <TabsTrigger value="tradingview"><CandlestickChart className="mr-2 h-4 w-4" />TradingView</TabsTrigger>
        </TabsList>
        <TabsContent value="speedbot">
          {isConnected ? (
              <TradingForm />
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
        </TabsContent>
        <TabsContent value="signalbot">
          {renderTabContent("Signal Bot", <Signal className="h-6 w-6" />, <p>Signal Bot content will be here.</p>)}
        </TabsContent>
        <TabsContent value="signalarena">
          {renderTabContent("Signal Arena", <Trophy className="h-6 w-6" />, <p>Signal Arena content will be here.</p>)}
        </TabsContent>
        <TabsContent value="dcircle">
          {renderTabContent("DCircle", <Circle className="h-6 w-6" />, <p>DCircle content will be here.</p>)}
        </TabsContent>
        <TabsContent value="tradingview">
          {renderTabContent("TradingView", <CandlestickChart className="h-6 w-6" />, <p>TradingView integration will be here.</p>)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
