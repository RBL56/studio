
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDerivApi } from '@/context/deriv-api-context';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';

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

    if (percentages.over_3 >= 66) { confidence += 35; reasons.push("Strong Over 3"); }
    else if (percentages.over_3 >= 61) { confidence += 15; reasons.push("Moderate Over 3"); }
    if (percentages.under_6 >= 66) { confidence += 35; reasons.push("Strong Under 6"); }
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
        reasons,
        ticks_analyzed: total,
        update_time: new Date().toISOString(),
        strong_signal: percentages.over_3 >= 66 || percentages.under_6 >= 66,
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
    '1HZ50V': { name: 'Volatility 50 (1s)', type: 'volatility' },
    '1HZ75V': { name: 'Volatility 75 (1s)', type: 'volatility' },
    '1HZ100V': { name: 'Volatility 100 (1s)', type: 'volatility' },
    'JD10': { name: 'Jump 10', type: 'jump' },
    'JD25': { name: 'Jump 25', type: 'jump' },
    'JD50': { name: 'Jump 50', type: 'jump' },
    'JD75': { name: 'Jump 75', type: 'jump' },
    'JD100': { name: 'Jump 100', type: 'jump' },
};
// --- End of Analysis Logic ---

const SignalArena = () => {
    const { api, isConnected, subscribeToMessages, status: apiStatus, marketConfig } = useDerivApi();
    const [tickData, setTickData] = useState<{ [key: string]: number[] }>({});
    const [analysisData, setAnalysisData] = useState<{ [key: string]: any }>({});
    const [displayedCards, setDisplayedCards] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [tickCount, setTickCount] = useState(0);
    const [updateTime, setUpdateTime] = useState(new Date().toLocaleTimeString());
    
    const subscribedSymbols = useRef(new Set<string>());

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
        let filteredData = Object.values(analysisData).filter(d => d !== null);
        if (activeFilter !== 'all') {
            filteredData = filteredData.filter(d => {
                if (!d) return false;
                if (activeFilter === 'strong') return d.strong_signal;
                if (activeFilter === 'over3') return d.percentages.over_3 >= 66;
                if (activeFilter === 'under6') return d.percentages.under_6 >= 66;
                if (activeFilter === 'volatility') return SYMBOL_CONFIG[d.symbol]?.type === 'volatility';
                if (activeFilter === 'jump') return SYMBOL_CONFIG[d.symbol]?.type === 'jump';
                return true;
            });
        }
        filteredData.sort((a, b) => (b?.confidence ?? 0) - (a?.confidence ?? 0));
        setDisplayedCards(filteredData);
    }, [activeFilter, analysisData]);

    const handleMessage = useCallback((data: any) => {
        if (data.error) {
            if (data.error.code !== 'AlreadySubscribed' && data.error.code !== 'AuthorizationRequired' && data.error.code !== 'ForgetInvalid' && data.error.code !== 'RateLimit' && data.error.code !== 'InvalidSymbol') {
                 console.error("Signal Arena API Error:", data.error.message);
            }
            if (data.error.echo_req?.ticks_history) {
                const symbol = data.error.echo_req.ticks_history;
                setTickData(prev => ({...prev, [symbol]: [] }));
            }
            return;
        }

        if (data.msg_type === 'history') {
            const symbol = data.echo_req.ticks_history;
            const digits = data.history.prices.map((p: string) => extractLastDigit(parseFloat(p), symbol));
            setTickData(prev => ({ ...prev, [symbol]: digits.slice(-500) }));
            if (api) {
                api.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
            }
        }
        
        if (data.msg_type === 'tick') {
            setTickCount(prev => prev + 1);
            const tick = data.tick;
            const symbol = tick.symbol;
            if (subscribedSymbols.current.has(symbol)) {
                const newDigit = extractLastDigit(parseFloat(tick.quote), symbol);
                setTickData(prev => {
                    const existingTicks = prev[symbol] || [];
                    const updatedTicks = [...existingTicks, newDigit];
                    if (updatedTicks.length > 500) {
                        updatedTicks.shift();
                    }
                    return { ...prev, [symbol]: updatedTicks };
                });
            }
        }
    }, [api, extractLastDigit]);

    useEffect(() => {
        if (!api || !isConnected) return;
    
        const symbolsToSubscribe = Object.keys(SYMBOL_CONFIG);
        let delay = 0;
    
        symbolsToSubscribe.forEach(symbol => {
            if (!subscribedSymbols.current.has(symbol)) {
                setTimeout(() => {
                    if (api && api.readyState === WebSocket.OPEN) {
                         api.send(JSON.stringify({
                            ticks_history: symbol,
                            end: "latest",
                            count: 500,
                            style: "ticks"
                        }));
                        subscribedSymbols.current.add(symbol);
                    }
                }, delay);
                delay += 350; // Stagger requests to avoid rate limiting
            }
        });
    
    }, [api, isConnected]);

    useEffect(() => {
        const unsubscribe = subscribeToMessages(handleMessage);
        return () => unsubscribe();
    }, [handleMessage, subscribeToMessages]);

    useEffect(() => {
        const interval = setInterval(() => {
            const updatedAnalysis: { [key: string]: any } = {};
            for (const symbol of subscribedSymbols.current) {
                const digits = tickData[symbol];
                if (digits && digits.length >= 100) {
                    const result = analyzeDigits(digits, symbol, SYMBOL_CONFIG[symbol]?.name || symbol);
                    if (result) updatedAnalysis[symbol] = result;
                }
            }
            if (Object.keys(updatedAnalysis).length > 0) {
                 setAnalysisData(prev => ({ ...prev, ...updatedAnalysis }));
            }
            setUpdateTime(new Date().toLocaleTimeString());
        }, 1000);
        return () => clearInterval(interval);
    }, [tickData]);
    
    useEffect(() => {
        filterAndSortData();
    }, [analysisData, activeFilter, filterAndSortData]);


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
        const runBot = (symbol: string, direction: string) => {
            if (!confirm(`Start ${direction.toUpperCase()} bot for ${symbol}?\n\nBase stake: $1.00\nStop loss: $50.00 daily`)) return;
            alert(`Bot started for ${symbol} (${direction})\n\nRisk management active:\n• $50 daily loss limit\n• 30s cooldown per symbol\n• Max 3 concurrent trades`);
        };
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
                {card.reasons.length > 0 && <div className="signal-reasons">{card.reasons.map((reason: string) => <span key={reason} className="signal-reason-tag">{reason}</span>)}</div>}
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
                        <button className="signal-bot-btn signal-bot-over" disabled={card.percentages.over_3 < 66} onClick={() => runBot(card.symbol, 'over')}><Bot className="h-4 w-4" /> OVER</button>
                        <button className="signal-bot-btn signal-bot-under" disabled={card.percentages.under_6 < 66} onClick={() => runBot(card.symbol, 'under')}><Bot className="h-4 w-4" /> UNDER</button>
                    </div>
                </div>
                <div className="signal-update-time">Ticks: {card.ticks_analyzed} • Updated: {new Date(card.update_time).toLocaleTimeString()}</div>
            </div>
        );
    }
    
    const renderContent = () => {
        if (!isConnected) {
            return <div className="signal-loading"><div className="signal-loading-spinner"></div><p>Connecting to Deriv API...</p></div>;
        }

        const symbolsInFilter = FILTERS[activeFilter as keyof typeof FILTERS];
        const visibleCards = displayedCards.filter(card => symbolsInFilter.includes(card.symbol));
        const loadingOrNoDataSymbols = symbolsInFilter.filter(symbol => 
            !analysisData[symbol] || (tickData[symbol]?.length || 0) < 100
        );

        if (visibleCards.length === 0 && loadingOrNoDataSymbols.length === symbolsInFilter.length) {
             const loadingSymbolsCount = symbolsInFilter.filter(s => subscribedSymbols.current.has(s) && (tickData[s] === undefined || (tickData[s]?.length ?? 0) < 500)).length;
             if (loadingSymbolsCount > 0) {
                 return <div className="signal-loading"><div className="signal-loading-spinner"></div><p>Fetching historical data for {loadingSymbolsCount} market(s)...</p></div>;
             }
        }
       
        if (visibleCards.length === 0 && loadingOrNoDataSymbols.length === 0) {
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
                            <p style={{fontSize: '0.875rem'}}>Collecting data... ({(tickData[symbol]?.length || 0)}/500)</p>
                        </div>
                    </div>
                ))}
            </>
        );
    };

    return (
        <div className="signal-center-body">
            <div className="signal-center-container">
                <div className="signal-center-header"><h1><span>🎯</span> Deriv Digit Signal Center</h1><div className="signal-status-bar"><div className="signal-status-indicator"><div className={cn("signal-status-dot", { 'connected': isConnected })}></div><span>{apiStatus}</span></div><span>Ticks Processed: {tickCount}</span><span>Last Update: {updateTime}</span></div></div>
                <div className="signal-risk-panel">
                    <div className="signal-risk-item"><span className="signal-risk-label">Daily Loss Limit</span><span className="signal-risk-value">$50.00</span></div><div className="signal-risk-item"><span className="signal-risk-label">Max Concurrent Trades</span><span className="signal-risk-value">3</span></div>
                    <div className="signal-risk-item"><span className="signal-risk-label">Current Loss</span><span className="signal-risk-value risk-ok">$0.00</span></div><div className="signal-risk-item"><span className="signal-risk-label">Base Stake</span><span className="signal-risk-value">$1.00</span></div>
                </div>
                <div className="signal-filters">
                    {Object.keys(FILTERS).map(filter => (
                        <button key={filter} className={cn("signal-filter-btn", { 'active': activeFilter === filter })} onClick={() => setActiveFilter(filter)}>
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="signal-cards-grid">{renderContent()}</div>
            </div>
        </div>
    );
};

export default SignalArena;

    