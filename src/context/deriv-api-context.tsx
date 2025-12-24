'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { BotConfigurationValues } from '@/components/bot-builder/bot-configuration-form';
import type { Trade } from '@/lib/types';
import { useTradingBot, type TradingBot } from '@/hooks/use-trading-bot';

interface DerivApiContextType extends TradingBot {
  isConnected: boolean;
  token: string | null;
  balance: number | null;
  accountType: 'real' | 'demo' | null;
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  api: WebSocket | null;
}

const DerivApiContext = createContext<DerivApiContextType | undefined>(undefined);

const APP_ID = 1089; // Default Deriv App ID

export const DerivApiProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [accountType, setAccountType] = useState<'real' | 'demo' | null>(null);
  const ws = useRef<WebSocket | null>(null);
  
  const tradingBot = useTradingBot(ws.current);

  const connect = useCallback(async (apiToken: string) => {
    if (ws.current) {
        ws.current.close();
    }

    ws.current = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
    const socket = ws.current;

    return new Promise<void>((resolve, reject) => {
        socket.onopen = () => {
            socket.send(JSON.stringify({ authorize: apiToken }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error('Deriv API error:', data.error.message);
                socket.close();
                setToken(null);
                setBalance(null);
                setIsConnected(false);
                setAccountType(null);
                reject(new Error(data.error.message));
                return;
            }

            if (data.msg_type === 'authorize') {
                if (data.authorize) {
                    setToken(apiToken);
                    setIsConnected(true);
                    setBalance(data.authorize.balance);
                    setAccountType(data.authorize.is_virtual ? 'demo' : 'real');
                    // Subscribe to balance updates
                    socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
                    tradingBot.setApi(socket); // Set the API for the trading bot
                    resolve();
                } else {
                    reject(new Error('Authorization failed.'));
                }
            }
            
            if (data.msg_type === 'balance') {
                setBalance(data.balance.balance);
            }

            // Forward messages to the trading bot
            if (tradingBot.handleMessage) {
                tradingBot.handleMessage(data);
            }
        };

        socket.onclose = () => {
            setIsConnected(false);
            setToken(null);
            setBalance(null);
            setAccountType(null);
            tradingBot.setApi(null);
        };
        
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            reject(new Error('WebSocket connection error.'));
            setIsConnected(false);
            tradingBot.setApi(null);
        };
    });
  }, [tradingBot]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    tradingBot.stopBot();
    setToken(null);
    setBalance(null);
    setIsConnected(false);
    setAccountType(null);
  }, [tradingBot]);

  useEffect(() => {
    // Cleanup WebSocket on component unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return (
    <DerivApiContext.Provider value={{ 
        isConnected, 
        token, 
        balance, 
        accountType, 
        connect, 
        disconnect,
        api: ws.current,
        ...tradingBot
    }}>
      {children}
    </DerivApiContext.Provider>
  );
};

export const useDerivApi = () => {
  const context = useContext(DerivApiContext);
  if (context === undefined) {
    throw new Error('useDerivApi must be used within a DerivApiProvider');
  }
  return context;
};
