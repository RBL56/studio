'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { BotConfigurationValues } from '@/components/bot-builder/bot-configuration-form';
import type { Trade } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export type BotStatus = 'idle' | 'running' | 'stopped';

interface DerivApiContextType {
  isConnected: boolean;
  token: string | null;
  balance: number | null;
  accountType: 'real' | 'demo' | null;
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  api: WebSocket | null;
  trades: Trade[];
  botStatus: BotStatus;
  totalProfit: number;
  totalStake: number;
  totalRuns: number;
  totalWins: number;
  totalLosses: number;
  isBotRunning: boolean;
  startBot: (config: BotConfigurationValues) => void;
  stopBot: () => void;
}

const DerivApiContext = createContext<DerivApiContextType | undefined>(undefined);

const APP_ID = 1089; // Default Deriv App ID

export const DerivApiProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [accountType, setAccountType] = useState<'real' | 'demo' | null>(null);
  const ws = useRef<WebSocket | null>(null);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus>('idle');
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalStake, setTotalStake] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [totalLosses, setTotalLosses] = useState(0);

  const configRef = useRef<BotConfigurationValues | null>(null);
  const currentStakeRef = useRef<number>(0);
  const isRunningRef = useRef(false);
  const { toast } = useToast();

  const stopBot = useCallback(() => {
    if (!isRunningRef.current) return;
    isRunningRef.current = false;
    setBotStatus('stopped');
  }, []);

  const getContractType = (predictionType: BotConfigurationValues['predictionType']) => {
    switch (predictionType) {
        case 'matches': return 'DIGITMATCH';
        case 'differs': return 'DIGITDIFF';
        case 'even': return 'DIGITEVEN';
        case 'odd': return 'DIGITODD';
        case 'over': return 'DIGITOVER';
        case 'under': return 'DIGITUNDER';
        default: throw new Error(`Invalid prediction type: ${predictionType}`);
    }
  }

  const purchaseContract = useCallback(() => {
    if (!ws.current || !configRef.current || !isRunningRef.current) {
      if (isRunningRef.current) stopBot();
      return;
    }

    const config = configRef.current;
    const stake = currentStakeRef.current;

    if (config.stopLoss && totalProfit <= -config.stopLoss) {
      toast({ title: "Stop-Loss Hit", description: "Bot stopped due to stop-loss limit." });
      stopBot();
      return;
    }

    if (config.takeProfit && totalProfit >= config.takeProfit) {
      toast({ title: "Take-Profit Hit", description: "Bot stopped due to take-profit limit." });
      stopBot();
      return;
    }

    setBotStatus('running');

    const contractType = getContractType(config.predictionType);

    ws.current.send(JSON.stringify({
      buy: "1",
      price: stake,
      parameters: {
        amount: stake,
        basis: "stake",
        contract_type: contractType,
        currency: "USD",
        duration: config.ticks,
        duration_unit: "t",
        symbol: config.market,
        barrier: config.lastDigitPrediction,
      }
    }));
  }, [stopBot, toast, totalProfit]);

  const handleMessage = useCallback((data: any) => {
    if (data.error) {
      if (data.error.code !== 'AlreadySubscribed') {
        console.error('Deriv API error:', data.error.message);
        toast({
          variant: "destructive",
          title: "API Error",
          description: data.error.message,
        });
        if (data.error.code === 'AuthorizationRequired') {
          stopBot();
        }
      }
      return;
    }

    if (data.msg_type === 'balance') {
      setBalance(data.balance.balance);
    }
    
    if (!isRunningRef.current && data.msg_type !== 'authorize') return;

    if (data.msg_type === 'buy') {
      const newTrade: Trade = {
        id: data.buy.contract_id.toString(),
        description: data.buy.longcode,
        marketId: configRef.current?.market || '',
        stake: data.buy.buy_price,
        payout: 0,
        isWin: false,
      };
      setTrades(prev => [newTrade, ...prev]);
      setTotalStake(prev => prev + newTrade.stake);
      setTotalRuns(prev => prev + 1);
    }

    if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract?.contract_id) {
        const contract = data.proposal_open_contract;
        if (!contract.is_sold) return; // Contract not finished yet

        const isWin = contract.status === 'won';
        const profit = contract.profit;

        setTrades(prev => prev.map(t => t.id === contract.contract_id.toString() ? {
            ...t,
            payout: profit,
            isWin,
        } : t));

        setTotalProfit(prev => prev + profit);

        if (isWin) {
            setTotalWins(prev => prev + 1);
            if(configRef.current) {
                currentStakeRef.current = configRef.current.initialStake;
            }
        } else {
            setTotalLosses(prev => prev + 1);
            if (configRef.current?.useMartingale) {
                currentStakeRef.current *= (configRef.current.martingaleFactor || 2);
            }
        }

        if (isRunningRef.current) {
            setTimeout(purchaseContract, 250);
        }
    }
  }, [purchaseContract, stopBot, toast]);


  const connect = useCallback(async (apiToken: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
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
        
        if (data.msg_type === 'authorize') {
            if (data.authorize) {
                setToken(apiToken);
                setIsConnected(true);
                setBalance(data.authorize.balance);
                setAccountType(data.authorize.is_virtual ? 'demo' : 'real');
                socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
                socket.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
                resolve();
            } else {
                reject(new Error('Authorization failed.'));
            }
        }
        
        handleMessage(data);
      };

      socket.onclose = () => {
        setIsConnected(false);
        stopBot();
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection error.'));
        setIsConnected(false);
      };
    });
  }, [handleMessage, stopBot]);
  
  const startBot = useCallback((config: BotConfigurationValues) => {
    if (isRunningRef.current || !ws.current) return;
    
    configRef.current = config;
    currentStakeRef.current = config.initialStake;
    
    setTrades([]);
    setTotalProfit(0);
    setTotalStake(0);
    setTotalRuns(0);
    setTotalWins(0);
    setTotalLosses(0);
    
    isRunningRef.current = true;
    setBotStatus('running');
    
    purchaseContract();
  }, [purchaseContract]);

  const disconnect = useCallback(() => {
    stopBot();
    if (ws.current) {
      if (ws.current.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ forget_all: 'proposal_open_contract' }));
          ws.current.send(JSON.stringify({ forget_all: 'balance' }));
        } catch (e) {
          console.error("Error unsubscribing:", e);
        }
      }
      ws.current.close();
      ws.current = null;
    }
    setToken(null);
    setBalance(null);
    setIsConnected(false);
    setAccountType(null);
  }, [stopBot]);

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const isBotRunning = botStatus === 'running';

  return (
    <DerivApiContext.Provider value={{
      isConnected,
      token,
      balance,
      accountType,
      connect,
      disconnect,
      api: ws.current,
      trades,
      botStatus,
      totalProfit,
      totalStake,
      totalRuns,
      totalWins,
      totalLosses,
      isBotRunning,
      startBot,
      stopBot
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
