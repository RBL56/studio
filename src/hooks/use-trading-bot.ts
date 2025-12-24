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
        if (api?.readyState === WebSocket.OPEN) {
            try {
                api.send(JSON.stringify({ forget_all: 'proposal_open_contract' }));
            } catch (e) {
                console.error("Error unsubscribing from contracts:", e);
            }
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
        if (data.error) {
            console.error("API Error:", data.error.message);
            toast({ variant: "destructive", title: "API Error", description: data.error.message });
            if (data.error.code === 'AuthorizationRequired') {
                stopBot();
            }
            return;
        }

        if (!isRunningRef.current) return;

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

            // Delay before next purchase if still running
            if (isRunningRef.current) {
                setTimeout(purchaseContract, 250);
            }
        }
    }, [purchaseContract, toast, stopBot]);

    const startBot = useCallback((config: BotConfigurationValues) => {
        if (isRunningRef.current || !api) return;
        
        configRef.current = config;
        currentStakeRef.current = config.initialStake;
        
        // Reset stats
        setTrades([]);
        setTotalProfit(0);
        setTotalStake(0);
        setTotalRuns(0);
        setTotalWins(0);
        setTotalLosses(0);
        
        isRunningRef.current = true;
        setBotStatus('running');

        // Subscribe to contract proposals
        api.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
        
        purchaseContract();
    }, [api, purchaseContract]);
    
    const isBotRunning = botStatus === 'running';

    return {
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
        handleMessage,
        setApi,
    };
}
