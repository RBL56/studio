
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { BotConfigurationValues } from '@/components/bot-builder/bot-configuration-form';
import type { Trade } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useDerivApi } from './deriv-api-context';

export type BotStatus = 'idle' | 'running' | 'stopped';

interface BotContextType {
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
  resetStats: () => void;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

export const BotProvider = ({ children }: { children: ReactNode }) => {
  const { api, subscribeToMessages, isConnected } = useDerivApi();
  const { toast } = useToast();

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
  const totalProfitRef = useRef(0);
  const bulkTradesCompletedRef = useRef(0);
  const openContractsRef = useRef(0);

  useEffect(() => {
    totalProfitRef.current = totalProfit;
  }, [totalProfit]);
  
  const stopBot = useCallback((showToast = true) => {
    if (!isRunningRef.current) return;
    isRunningRef.current = false;
    setBotStatus('stopped');
    if (showToast) {
        toast({
            title: "Bot Stopped",
            description: "The trading bot has been stopped.",
        });
    }
  }, [toast]);

  const resetStats = useCallback(() => {
    if (isRunningRef.current) {
      toast({
        variant: 'destructive',
        title: 'Bot is running',
        description: 'Please stop the bot before resetting stats.',
      });
      return;
    }
    setTrades([]);
    setTotalProfit(0);
    setTotalStake(0);
    setTotalRuns(0);
    setTotalWins(0);
    setTotalLosses(0);
    bulkTradesCompletedRef.current = 0;
    toast({
        title: 'Stats Reset',
        description: 'The trade log and statistics have been cleared.',
    });
  }, [toast]);

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
    if (!api || !configRef.current) {
        if (isRunningRef.current) stopBot(false);
        return;
    }
    
    if (!isRunningRef.current) {
        // If the bot was stopped, but there are still contracts being processed,
        // we should not purchase new ones.
        return;
    }

    const config = configRef.current;
    const stake = currentStakeRef.current;
    
    setBotStatus('running');

    const contractType = getContractType(config.predictionType);

    const parameters: any = {
      amount: stake,
      basis: "stake",
      contract_type: contractType,
      currency: "USD",
      duration: config.ticks,
      duration_unit: "t",
      symbol: config.market,
    };

    if (config.tradeType !== 'even_odd') {
      parameters.barrier = config.lastDigitPrediction;
    }

    api.send(JSON.stringify({
      buy: "1",
      price: stake,
      parameters,
    }));
  }, [api, stopBot]);

  const handleMessage = useCallback((data: any) => {
    if (data.error) {
      if(data.error.code !== 'AlreadySubscribed' && data.error.code !== 'AuthorizationRequired'){
        console.error("Deriv API Error:", data.error.message);
        if (openContractsRef.current > 0) {
            openContractsRef.current--;
        }
        if (openContractsRef.current === 0) {
            stopBot(false);
        }
      }
      return;
    }
    
    if (data.msg_type === 'buy') {
        if(data.buy.contract_id){
            openContractsRef.current++;
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
    }

    if (data.msg_type === 'proposal_open_contract' && data.proposal_open_contract?.contract_id) {
        if (!isRunningRef.current && openContractsRef.current === 0) return;
        const contract = data.proposal_open_contract;
        if (!contract.is_sold) return;

        openContractsRef.current--;
        
        const isWin = contract.status === 'won';
        const profit = contract.profit;
        const newTotalProfit = totalProfitRef.current + profit;

        setTrades(prev => prev.map(t => t.id === contract.contract_id.toString() ? {
            ...t,
            payout: contract.payout,
            isWin,
        } : t));

        setTotalProfit(newTotalProfit);

        if (isWin) {
            setTotalWins(prev => prev + 1);
            if(configRef.current && !configRef.current.useBulkTrading) {
                currentStakeRef.current = configRef.current.initialStake;
            }
        } else {
            setTotalLosses(prev => prev + 1);
            if (configRef.current?.useMartingale && !configRef.current.useBulkTrading) {
                currentStakeRef.current *= (configRef.current.martingaleFactor || 2);
            }
        }

        const config = configRef.current;
        if (config?.takeProfit && newTotalProfit >= config.takeProfit) {
            toast({ title: "Take-Profit Hit", description: "Bot stopped due to take-profit limit." });
            stopBot(false);
            return;
        }

        if (config?.stopLoss && newTotalProfit <= -config.stopLoss) {
            toast({ title: "Stop-Loss Hit", description: "Bot stopped due to stop-loss limit." });
            stopBot(false);
            return;
        }
        
        if (config?.useBulkTrading) {
          bulkTradesCompletedRef.current += 1;
          if (bulkTradesCompletedRef.current >= (config.bulkTradeCount || 1)) {
            toast({ title: 'Bulk Trades Complete', description: `Finished ${config.bulkTradeCount} trades.`});
            stopBot(false);
            return;
          }
        } else if (isRunningRef.current) {
            purchaseContract();
        } else if (openContractsRef.current === 0) {
            stopBot(false);
        }
    }
  }, [purchaseContract, stopBot, toast]);
  
  useEffect(() => {
    if (!isConnected) {
        stopBot(false);
        return;
    }
    const unsubscribe = subscribeToMessages(handleMessage);
    return () => unsubscribe();
  }, [isConnected, subscribeToMessages, handleMessage, stopBot]);


  const startBot = useCallback((config: BotConfigurationValues) => {
    if (isRunningRef.current || !api || !isConnected) {
        if (!isConnected) {
            toast({
                variant: 'destructive',
                title: 'Not Connected',
                description: 'Please connect to the Deriv API first.',
            });
        }
        return;
    };
    
    configRef.current = config;
    currentStakeRef.current = config.initialStake;
    bulkTradesCompletedRef.current = 0;
    openContractsRef.current = 0;
    
    isRunningRef.current = true;
    setBotStatus('running');
    
    if (config.useBulkTrading) {
        const tradeCount = config.bulkTradeCount || 1;
        for (let i = 0; i < tradeCount; i++) {
            purchaseContract();
        }
    } else {
        purchaseContract();
    }
  }, [api, isConnected, purchaseContract, toast]);

  const isBotRunning = botStatus === 'running' && isRunningRef.current;

  return (
    <BotContext.Provider value={{
      trades,
      botStatus,
      totalProfit,
      totalStake,
      totalRuns,
      totalWins,
      totalLosses,
      isBotRunning,
      startBot,
      stopBot,
      resetStats
    }}>
      {children}
    </BotContext.Provider>
  );
};

export const useBot = () => {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error('useBot must be used within a BotProvider');
  }
  return context;
};
