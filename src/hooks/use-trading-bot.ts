'use client';

import { useState, useCallback, useRef } from 'react';
import type { BotConfigurationValues } from '@/components/bot-builder/bot-configuration-form';
import type { Trade } from '@/lib/types';
import { useToast } from './use-toast';

export type BotStatus = 'idle' | 'running' | 'stopped';

export interface TradingBot {
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
    handleMessage?: (data: any) => void;
    setApi: (api: WebSocket | null) => void;
}

export function useTradingBot(initialApi: WebSocket | null): TradingBot {
    const [api, setApi] = useState<WebSocket | null>(initialApi);
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
        // Unsubscribe from contract proposals
        if (api?.readyState === WebSocket.OPEN) {
            api.send(JSON.stringify({ forget_all: 'proposal_open_contract' }));
        }
    }, [api]);

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
        if (!api || !configRef.current || !isRunningRef.current) {
            if (isRunningRef.current) stopBot();
            return;
        };
    
        const config = configRef.current;
        const stake = currentStakeRef.current;
    
        if (config.stopLoss && totalProfit <= -config.stopLoss) {
            toast({ title: "Stop-Loss Hit", description: "Bot stopped due to stop-loss limit."});
            stopBot();
            return;
        }
    
        if (config.takeProfit && totalProfit >= config.takeProfit) {
            toast({ title: "Take-Profit Hit", description: "Bot stopped due to take-profit limit."});
            stopBot();
            return;
        }
    
        setBotStatus('running');
        setTotalStake(prev => prev + stake);
        setTotalRuns(prev => prev + 1);

        const contractType = getContractType(config.predictionType);

        api.send(JSON.stringify({
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
    }, [api, totalProfit, stopBot, toast]);

    const handleMessage = useCallback((data: any) => {
        if (!isRunningRef.current) return;

        if (data.msg_type === 'buy') {
            if (data.error) {
                console.error("Buy error:", data.error.message);
                toast({ variant: "destructive", title: "Trade Error", description: data.error.message });
                // If buy fails, maybe stop the bot or retry
                if (configRef.current?.useMartingale && currentStakeRef.current > configRef.current?.initialStake) {
                    currentStakeRef.current = configRef.current.initialStake;
                }
                setTimeout(purchaseContract, 250); // Wait a bit before next trade
                return;
            }

            const newTrade: Trade = {
                id: data.buy.contract_id.toString(),
                description: data.buy.longcode,
                marketId: configRef.current?.market || '',
                stake: data.buy.buy_price,
                payout: 0,
                isWin: false,
            };
            setTrades(prev => [newTrade, ...prev]);
        }

        if (data.msg_type === 'proposal_open_contract') {
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
                // Reset stake on win
                 if(configRef.current) {
                    currentStakeRef.current = configRef.current.initialStake;
                }
            } else {
                setTotalLosses(prev => prev + 1);
                // Apply martingale on loss
                if (configRef.current?.useMartingale) {
                    currentStakeRef.current *= (configRef.current.martingaleFactor || 2);
                }
            }

            // Delay before next purchase
            setTimeout(purchaseContract, 250);
        }
    }, [purchaseContract, toast]);

    const startBot = useCallback((config: BotConfigurationValues) => {
        if (isRunningRef.current || !api) return;
        
        configRef.current = config;
        currentStakeRef.current = config.initialStake;
        isRunningRef.current = true;
        
        // Reset stats
        setTrades([]);
        setTotalProfit(0);
        setTotalStake(0);
        setTotalRuns(0);
        setTotalWins(0);
        setTotalLosses(0);
        setBotStatus('running');

        // Subscribe to contract proposals
        api.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
        
        purchaseContract();
    }, [api, purchaseContract]);

    return {
        trades,
        botStatus,
        totalProfit,
        totalStake,
        totalRuns,
        totalWins,
        totalLosses,
        isBotRunning: isRunningRef.current,
        startBot,
        stopBot,
        handleMessage,
        setApi,
    };
}
