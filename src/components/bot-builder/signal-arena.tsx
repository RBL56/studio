

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDerivApi } from '@/context/deriv-api-context';
import { cn } from '@/lib/utils';
import { Bot, Zap } from 'lucide-react';
import { useBot } from '@/context/bot-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '../ui/badge';
import type { SignalBot } from '@/lib/types';
import SignalBotConfigPanel from './signal-bot-config-panel';


// --- Sound Utility ---
const playSound = (text: string) => {
    try {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1.2;
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Text-to-speech not supported in this browser.");
        }
    } catch(e) {
        console.error("Could not play sound", e);
    }
};


// --- Start of Analysis Logic ---
const chiSquareTest = (observed: number[]) => {
    const total = observed.reduce((a, b) => a + b, 0);
    if (total === 0) return { chi2: 0, pValue: 1, interpretation: 'No Data' };

    const expected = total / 10;
    if (expected === 0) return { chi2: 0, pValue: 1, interpretation: 'No Data' };

    const chi2 = observed.reduce((acc, obs) => acc + Math.pow(obs - expected, 2) / expected, 0);
    
    // Simplified p-value estimation for 9 degrees of freedom
    const p_value_table: { [key: number]: number } = {
        21.67: 0.01, 19.02: 0.025, 16.92: 0.05, 14.68: 0.1, 12.24: 0.2, 4.17: 0.9, 2.7: 0.98
    };

    let pValue = 1.0;
    for (const threshold in p_value_table) {
        if (chi2 >= parseFloat(threshold)) {
            pValue = p_value_table[threshold as any];
            break;
        }
    }

    let interpretation = "Uniform (fair)";
    if (pValue < 0.01) interpretation = "STRONG BIAS DETECTED";
    else if (pValue < 0.05) interpretation = "Bias detected";

    return { chi2, pValue, interpretation };
};


const analyzeDigits = (digits: number[], symbol: string, name: string) => {
    const total = digits.length;
    if (total < 100) return null;

    const counts = Array(10).fill(0);
    digits.forEach(digit => {
        if (digit >= 0 && digit <= 9) {
            counts[digit]++;
        }
    });

    const percentages: { [key: string]: number } = {};
    for (let i = 0; i < 10; i++) {
        percentages[`digit_${i}`] = (counts[i] / total) * 100;
    }
    percentages.over_3 = (counts.slice(4).reduce((a, b) => a + b, 0) / total) * 100;
    percentages.under_6 = (counts.slice(0, 6).reduce((a, b) => a + b, 0) / total) * 100;
    const evenCount = counts.reduce((acc, count, i) => i % 2 === 0 ? acc + count : acc, 0);
    percentages.even = (evenCount / total) * 100;
    percentages.odd = 100 - percentages.even;

    const chiSquare = chiSquareTest(counts);
    let confidence = 0;
    const reasons: string[] = [];
    let strongSignalType = '';

    if (percentages.over_3 >= 66) { confidence += 35; reasons.push("Strong Over 3"); strongSignalType = 'Strong Over 3'; }
    else if (percentages.over_3 >= 61) { confidence += 15; reasons.push("Moderate Over 3"); }
    if (percentages.under_6 >= 66) { confidence += 35; reasons.push("Strong Under 6"); strongSignalType = 'Strong Under 6'; }
    else if (percentages.under_6 >= 61) { confidence += 15; reasons.push("Moderate Under 6"); }
    if (percentages.even >= 56 || percentages.even <= 44) { confidence += 15; reasons.push("Strong Even/Odd Bias"); }
    if (chiSquare.pValue < 0.01) { confidence += 20; reasons.push("Strong Statistical Bias"); }
    else if (chiSquare.pValue < 0.05) { confidence += 10; reasons.push("Statistical Bias"); }
    const hotDigits = counts.map((c, i) => ({ c, i })).filter(d => (d.c / total) * 100 >= 14).map(d => d.i);
    if(hotDigits.length > 0) { confidence += 15; reasons.push("Hot Digit(s)"); }

    return {
        symbol,
        name,
        percentages,
        chi_square: chiSquare,
        confidence: Math.min(100, confidence),
        hot_digits: hotDigits,
        ticks_analyzed: total,
        update_time: new Date().toISOString(),
        strong_signal: strongSignalType !== '',
        strong_signal_type: strongSignalType,
        reasons,
    };
};

const SYMBOL_CONFIG: { [key: string]: { name: string, type: string } } = {
    'R_10': { name: 'Volatility 10', type: 'volatility' },
    'R_25': { name: 'Volatility 25', type: 'volatility' },
    'R_50': { name: 'Volatility 50', type: 'volatility' },
    'R_75': { name: 'Volatility 75', type: 'volatility' },
    'R_100': { name: 'Volatility 100', type: 'volatility' },
    '1HZ10V': { name: 'Volatility 10 (1s)', type: 'volatility' },
    '1HZ25V': { name: 'Volatility 25 (1s)', type: 'volatility' },
    '1HZ30V': { name: 'Volatility 30 (1s)', type: 'volatility' },
    '1HZ50V': { name: 'Volatility 50 (1s)', type: 'volatility' },
    '1HZ75V': { name: 'Volatility 75 (1s)', type: 'volatility' },
    '1HZ90V': { name: 'Volatility 90 (1s)', type: 'volatility' },
    '1HZ100V': { name: 'Volatility 100 (1s)', type: 'volatility' },
    'JD10': { name: 'Jump 10', type: 'jump' },
    'JD25': { name: 'Jump 25', type: 'jump' },
    'JD50': { name: 'Jump 50', type: 'jump' },
    'JD75': { name: 'Jump 75', type: 'jump' },
    'JD100': { name: 'Jump 100', type: 'jump' },
};
// --- End of Analysis Logic ---

const SignalArena = () => {
    const { api, isConnected, subscribeToMessages, marketConfig } = useDerivApi();
    const { startSignalBot, setActiveTab, setActiveBuilderTab, activeTab, signalBots } = useBot();
    const [displayedCards, setDisplayedCards] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState('volatility');
    const [updateTime, setUpdateTime] = useState(new Date().toLocaleTimeString());
    const [apiStatus, setApiStatus] = useState('Disconnected');
    const [signalAlert, setSignalAlert] = useState<any | null>(null);
    
    const tickDataRef = useRef<{ [key: string]: number[] }>({});
    const analysisDataRef = useRef<{ [key: string]: any }>({});
    const subscribedSymbols = useRef(new Set<string>());
    const historyFetchedSymbols = useRef(new Set<string>());
    const strongSignalNotified = useRef(new Set<string>());

    const extractLastDigit = useCallback((price: number, marketSymbol: string) => {
        const config = marketConfig[marketSymbol];
        const decimals = config?.decimals || 2;
        const priceStr = price.toFixed(decimals);
        return parseInt(priceStr[priceStr.length - 1]);
    }, [marketConfig]);
    
    const FILTERS = React.useMemo(() => ({
        'all': Object.keys(SYMBOL_CONFIG),
        'strong': [],
        'over3': [],
        'under6': [],
        'volatility': Object.keys(SYMBOL_CONFIG).filter(s => SYMBOL_CONFIG[s].type === 'volatility'),
        'jump': Object.keys(SYMBOL_CONFIG).filter(s => SYMBOL_CONFIG[s].type === 'jump'),
    }), []);

    const filterAndSortData = useCallback(() => {
        let filteredData = Object.values(analysisDataRef.current).filter(d => d !== null);

        const filterSymbols = FILTERS[activeFilter as keyof typeof FILTERS];
        if (filterSymbols && filterSymbols.length > 0) {
          filteredData = filteredData.filter(d => filterSymbols.includes(d.symbol));
        }

        if (activeFilter === 'strong') {
          filteredData = filteredData.filter(d => d.strong_signal);
        }
        
        if (activeFilter === 'over3') {
            filteredData.sort((a, b) => (b?.percentages.over_3 ?? 0) - (a?.percentages.over_3 ?? 0));
        } else if (activeFilter === 'under6') {
            filteredData.sort((a, b) => (b?.percentages.under_6 ?? 0) - (a?.percentages.under_6 ?? 0));
        } else {
            filteredData.sort((a, b) => (b?.confidence ?? 0) - (a?.confidence ?? 0));
        }
        
        setDisplayedCards(filteredData);
    }, [activeFilter, FILTERS]);

    const runBotFromSignal = (signal: any, manualStart: boolean = false) => {
        const direction = signal.strong_signal_type.includes('Over') ? 'over' : 'under';
        const prediction = signal.strong_signal_type.includes('Over') ? 3 : 6;

        const botConfig: SignalBot = {
            id: `${signal.symbol}-${Date.now()}`,
            name: signal.name,
            market: signal.symbol,
            signalType: signal.strong_signal_type,
            status: 'running',
            profit: 0,
            config: {
                market: signal.symbol,
                tradeType: 'over_under',
                predictionType: direction,
                lastDigitPrediction: prediction,
                ticks: 1,
                // These will be overridden by global signal bot config from context
                initialStake: 1, 
                takeProfit: 10,
                stopLossType: 'consecutive_losses',
                stopLossConsecutive: 5,
                useMartingale: true,
                martingaleFactor: 2.1
            }
        }
        
        startSignalBot(botConfig);
        if (manualStart) {
            setActiveTab('bot-builder');
            setActiveBuilderTab('signalbot');
        }
    };

    const runAnalysis = useCallback(() => {
        Object.keys(tickDataRef.current).forEach(symbol => {
            const digits = tickDataRef.current[symbol];
            if (digits && digits.length >= 100) {
                const result = analyzeDigits(digits, symbol, SYMBOL_CONFIG[symbol]?.name || symbol);
                if (result) {
                    const previousResult = analysisDataRef.current[symbol];
                    if (result.strong_signal && (!previousResult || !previousResult.strong_signal)) {
                        if (!strongSignalNotified.current.has(symbol)) {
                            const message = `${result.name}, ${result.strong_signal_type}`;
                            playSound(message);
                            strongSignalNotified.current.add(symbol);
                            
                             if (activeTab !== 'signal-arena' && activeTab !== 'trading-view') {
                                setSignalAlert(result);
                            }
                        }
                    } else if (!result.strong_signal && previousResult && previousResult.strong_signal) {
                        strongSignalNotified.current.delete(symbol);
                    }
                    analysisDataRef.current[symbol] = result;
                }
            }
        });
        setUpdateTime(new Date().toLocaleTimeString());
    }, [activeTab]);


    const handleMessage = useCallback((data: any) => {
        if (data.error) {
            if (data.error.code !== 'AlreadySubscribed' && data.error.code !== 'AuthorizationRequired' && data.error.code !== 'ForgetInvalid' && data.error.code !== 'RateLimit' && data.error.code !== 'InvalidSymbol' && data.error.code !== 'MarketIsClosed') {
                 console.error("Signal Arena API Error:", data.error.message);
            }
            return;
        }

        if (data.msg_type === 'history') {
            const symbol = data.echo_req.ticks_history;
            const newDigits = data.history.prices.map((p: string) => extractLastDigit(parseFloat(p), symbol));
            tickDataRef.current[symbol] = (tickDataRef.current[symbol] || []).concat(newDigits);

            if (api && api.readyState === WebSocket.OPEN && !subscribedSymbols.current.has(symbol)) {
                api.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
                subscribedSymbols.current.add(symbol);
            }
        }

        if (data.msg_type === 'tick') {
            const tick = data.tick;
            const symbol = tick.symbol;
            const newDigit = extractLastDigit(parseFloat(tick.quote), symbol);
            const existingTicks = tickDataRef.current[symbol] || [];
            const updatedTicks = [...existingTicks, newDigit];
            if (updatedTicks.length > 500) {
                updatedTicks.shift();
            }
            tickDataRef.current[symbol] = updatedTicks;
            runAnalysis();
        }
    }, [extractLastDigit, api, runAnalysis]);

    const manageSubscriptions = useCallback(() => {
        if (!api || !isConnected) return;

        const symbols = Object.keys(SYMBOL_CONFIG);

        const subscribeWithDelay = (index: number) => {
            if (index >= symbols.length) return;
            const symbol = symbols[index];
            
            // Only fetch history if it has not been fetched before in this session
            if (!historyFetchedSymbols.current.has(symbol) && api.readyState === WebSocket.OPEN) {
                api.send(JSON.stringify({ ticks_history: symbol, end: 'latest', count: 500, style: 'ticks' }));
                historyFetchedSymbols.current.add(symbol);
            }
            
            setTimeout(() => subscribeWithDelay(index + 1), 200); 
        };

        if (api.readyState === WebSocket.OPEN) {
            setApiStatus('Connected');
            subscribeWithDelay(0);
        }
    }, [api, isConnected]);


    useEffect(() => {
        if (isConnected) {
            manageSubscriptions();
            const unsubscribe = subscribeToMessages(handleMessage);
            const uiInterval = setInterval(filterAndSortData, 1000);

            return () => {
                unsubscribe();
                clearInterval(uiInterval);
            };
        } else {
             setApiStatus('Disconnected');
        }
    }, [isConnected, manageSubscriptions, handleMessage, subscribeToMessages, filterAndSortData, api]);
    
    
    const renderCard = (card: any) => {
        if (!card) return null;
        const confidenceClass = card.confidence >= 70 ? 'confidence-high' : card.confidence >= 40 ? 'confidence-medium' : 'confidence-low';
        const biasClass = card.chi_square.interpretation.includes('STRONG') ? 'bias-strong' : card.chi_square.interpretation.includes('Bias') ? 'bias-detected' : 'bias-fair';
        const getSignalClass = (value: number, type: 'over_under' | 'even_odd') => {
            if (type === 'over_under') {
                if (value >= 66) return 'signal-strong'; if (value >= 61) return 'signal-moderate';
            } else {
                if (value >= 56 || value <= 44) return 'signal-strong'; if ((value >= 53 && value < 56) || (value > 44 && value <= 47)) return 'signal-moderate';
            }
            return 'signal-weak';
        };
        const getDigitClass = (pct: number) => {
            if (pct >= 14) return 'signal-digit-hot'; if (pct >= 11) return 'signal-digit-warm'; return '';
        };

        const overPercentage = card.percentages.over_3 || 0;
        const underPercentage = card.percentages.under_6 || 0;

        return (
             <div key={card.symbol} className="signal-card">
                <div className="signal-card-header">
                    <div className="signal-symbol-info"><h3>{card.name}</h3><div className="symbol">{card.symbol}</div></div>
                    <div className={cn("signal-confidence-badge", confidenceClass)}>{card.confidence}%</div>
                </div>
                <div className="signal-signals-grid">
                    <div className="signal-signal-item"><div className="signal-signal-label">Over 3</div><div className={cn("signal-signal-value", getSignalClass(card.percentages.over_3, 'over_under'))}>{card.percentages.over_3.toFixed(1)}%</div></div>
                    <div className="signal-signal-item"><div className="signal-signal-label">Under 6</div><div className={cn("signal-signal-value", getSignalClass(card.percentages.under_6, 'over_under'))}>{card.percentages.under_6.toFixed(1)}%</div></div>
                    <div className="signal-signal-item"><div className="signal-signal-label">Even</div><div className={cn("signal-signal-value", getSignalClass(card.percentages.even, 'even_odd'))}>{card.percentages.even.toFixed(1)}%</div></div>
                    <div className="signal-signal-item"><div className="signal-signal-label">Odd</div><div className={cn("signal-signal-value", getSignalClass(card.percentages.odd, 'even_odd'))}>{card.percentages.odd.toFixed(1)}%</div></div>
                </div>
                <div className="signal-stats-row"><div className="signal-chi-square">χ²: {card.chi_square.chi2.toFixed(2)}, p: {card.chi_square.pValue.toFixed(3)}</div><div className={cn("signal-bias-indicator", biasClass)}>{card.chi_square.interpretation}</div></div>
                {card.reasons && card.reasons.length > 0 && <div className="signal-reasons">{card.reasons.map((reason: string) => <span key={reason} className="signal-reason-tag">{reason}</span>)}</div>}
                <div className="signal-digits-table">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={cn("signal-digit-cell", getDigitClass(card.percentages[`digit_${i}`]), i === 0 ? 'digit-zero' : '')}>
                            <div className="signal-digit-label">{i}</div><div className="signal-digit-value">{card.percentages[`digit_${i}`].toFixed(1)}%</div>
                        </div>
                    ))}
                </div>
                <div className="signal-card-footer">
                    <div className="signal-hot-digits"><span>🔥 Hot Digits:</span><span>{card.hot_digits.length > 0 ? card.hot_digits.join(', ') : 'None'}</span></div>
                    <div className="signal-bot-buttons">
                        {card.strong_signal && (
                            <button
                                className={cn('signal-bot-btn', overPercentage >= underPercentage ? 'signal-bot-over' : 'signal-bot-under')}
                                onClick={() => runBotFromSignal(card, true)}
                                disabled={signalBots.some(b => b.market === card.symbol && b.status === 'running')}
                            >
                                <Bot className="h-4 w-4" /> {overPercentage >= underPercentage ? 'OVER' : 'UNDER'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="signal-update-time">Updated: {new Date(card.update_time).toLocaleTimeString()}</div>
            </div>
        );
    }
    
    const renderContent = () => {
        if (!isConnected) {
            return <div className="signal-loading"><div className="signal-loading-spinner"></div><p>Connecting to Deriv API...</p></div>;
        }

        const symbolsInFilter = FILTERS[activeFilter as keyof typeof FILTERS] || Object.keys(SYMBOL_CONFIG);
        const visibleCards = displayedCards;

        const loadingOrNoDataSymbols = symbolsInFilter.filter(symbol => 
            !analysisDataRef.current[symbol] || (tickDataRef.current[symbol]?.length || 0) < 100
        );

        if (visibleCards.length === 0 && loadingOrNoDataSymbols.length === symbolsInFilter.length) {
             const loadingSymbolsCount = symbolsInFilter.filter(s => (tickDataRef.current[s] === undefined || (tickDataRef.current[s]?.length ?? 0) < 100)).length;
             if (loadingSymbolsCount > 0) {
                 return <div className="signal-loading"><div className="signal-loading-spinner"></div><p>Waiting for live data for {loadingSymbolsCount} market(s)...</p></div>;
             }
        }
       
        if (visibleCards.length === 0 && loadingOrNoDataSymbols.length === 0 && activeFilter !== 'all' ) {
            return <div className="signal-no-data"><p>No signals match the current filter.</p></div>
        }
        
        return (
            <>
                {visibleCards.map(card => renderCard(card))}
                {loadingOrNoDataSymbols
                    .filter(symbol => symbolsInFilter.includes(symbol) && !visibleCards.some(card => card.symbol === symbol))
                    .map(symbol => (
                    <div key={symbol} className="signal-card">
                        <div className="signal-card-header"><div className="signal-symbol-info"><h3>{SYMBOL_CONFIG[symbol]?.name || symbol}</h3><div className="symbol">{symbol}</div></div></div>
                        <div className="signal-loading" style={{padding: '20px 0'}}>
                            <div className="signal-loading-spinner" style={{width: '24px', height: '24px', borderTopColor: '#3b82f6'}}></div>
                            <p style={{fontSize: '0.875rem'}}>Collecting historical data... ({(tickDataRef.current[symbol]?.length || 0)}/500)</p>
                        </div>
                    </div>
                ))}
            </>
        );
    };

    const handleStartBotFromAlert = () => {
        if(signalAlert) {
            runBotFromSignal(signalAlert, true);
        }
        setSignalAlert(null);
    }

    return (
        <div className="signal-center-body">
            <div className="signal-center-container">
                <div className="signal-center-header"><h1><span>🎯</span> Deriv Digit Signal Center</h1><div className="signal-status-bar"><div className="signal-status-indicator"><div className={cn("signal-status-dot", { 'connected': isConnected })}></div><span>{apiStatus}</span></div><span>Last Update: {updateTime}</span></div></div>
                <SignalBotConfigPanel />
                <div className="signal-filters">
                    {Object.keys(FILTERS).map(filter => (
                        <button key={filter} className={cn("signal-filter-btn", { 'active': activeFilter === filter })} onClick={() => setActiveFilter(filter)}>
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="signal-cards-grid">{renderContent()}</div>
            </div>

            <AlertDialog open={!!signalAlert} onOpenChange={() => setSignalAlert(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Zap className="text-yellow-400" />
                        Strong Signal Detected!
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        A strong signal has been found and a bot can be automatically started for you.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="my-4">
                        <p className="font-bold text-lg">{signalAlert?.name}</p>
                        <Badge>{signalAlert?.strong_signal_type}</Badge>
                    </div>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartBotFromAlert}>
                        <Bot className="mr-2 h-4 w-4" /> Start Bot
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default SignalArena;

    
    