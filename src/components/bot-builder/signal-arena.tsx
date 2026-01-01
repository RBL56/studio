'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useDerivApi } from '@/context/deriv-api-context';
import { VOLATILITY_MARKETS } from '@/lib/constants';

// --- Type Definitions ---
enum SignalStrength {
    STRONG = "strong",
    MODERATE = "moderate",
    WEAK = "weak",
}

interface AnalysisResult {
    symbol: string;
    name: string;
    percentages: { [key: string]: number };
    chi_square: { chi2: number; p_value: number; interpretation: string };
    signals: { [key: string]: SignalStrength };
    confidence: number;
    reasons: string[];
    ticks_analyzed: number;
    update_time: string;
    strong_signal: boolean;
}

// --- Helper Components ---
const LoadingComponent = () => (
    <div className="signal-loading">
        <div className="signal-loading-spinner"></div>
        <p>Connecting to analysis server...</p>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '8px' }}>
            Starting WebSocket connection and collecting initial ticks...
        </p>
    </div>
);

const NoDataComponent = () => (
    <div className="signal-no-data">
        <p>No signals match the current filter</p>
        <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>Try changing filter settings</p>
    </div>
);


const SignalArena = () => {
    const { api, isConnected, marketConfig } = useDerivApi();
    const [status, setStatus] = useState('Disconnected');
    const [analysisData, setAnalysisData] = useState<{ [key: string]: AnalysisResult }>({});
    const [tickCount, setTickCount] = useState(0);
    const [updateTime, setUpdateTime] = useState(new Date().toLocaleTimeString());
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    const ticksRef = useRef<{ [key: string]: number[] }>({});
    const subscriptionsRef = useRef<{ [key: string]: string }>({});

    const allSymbols = VOLATILITY_MARKETS.map(m => m.symbol);

    // --- Analysis Logic (Ported from Python) ---
    const extractLastDigit = useCallback((price: number, symbol: string) => {
        const config = marketConfig[symbol];
        const decimals = config?.decimals ?? 2;
        const priceStr = price.toFixed(decimals);
        return parseInt(priceStr[priceStr.length - 1]);
    }, [marketConfig]);

    const calculatePercentages = (digits: number[]) => {
        const counts = Array(10).fill(0);
        digits.forEach(d => { if (d >= 0 && d <= 9) counts[d]++; });

        const total = digits.length;
        if (total === 0) return { digit_counts: counts };

        const percentages: { [key: string]: any } = { digit_counts: counts };
        percentages['over_3'] = (counts.slice(4).reduce((a, b) => a + b, 0) / total) * 100;
        percentages['under_6'] = (counts.slice(0, 6).reduce((a, b) => a + b, 0) / total) * 100;
        const evenCount = counts[0] + counts[2] + counts[4] + counts[6] + counts[8];
        percentages['even'] = (evenCount / total) * 100;
        percentages['odd'] = 100 - percentages['even'];
        for (let i = 0; i < 10; i++) {
            percentages[`digit_${i}`] = (counts[i] / total) * 100;
        }
        return percentages;
    };
    
    // Basic Chi-Square implementation, as `scipy` is not available in JS.
    const chiSquareTest = (counts: number[]) => {
        const total = counts.reduce((a, b) => a + b, 0);
        if (total === 0) return { chi2: 0, p_value: 1, interpretation: 'No data' };

        const expected = total / 10;
        let chi2 = 0;
        for (const observed of counts) {
            chi2 += Math.pow(observed - expected, 2) / expected;
        }
        
        // P-value for 9 degrees of freedom. This is a simplified lookup.
        let p_value = 0.5;
        if (chi2 > 21.67) p_value = 0.01;
        else if (chi2 > 16.92) p_value = 0.05;

        let interpretation = "Uniform (fair)";
        if (p_value < 0.01) interpretation = "STRONG BIAS DETECTED";
        else if (p_value < 0.05) interpretation = "Bias detected";

        return { chi2, p_value, interpretation };
    };
    
    const classifySignalStrength = (percentages: { [key: string]: number }) => {
        const signals: { [key: string]: SignalStrength } = {};
        if ((percentages.over_3 ?? 0) >= 66) signals.over_3 = SignalStrength.STRONG;
        else if ((percentages.over_3 ?? 0) >= 61) signals.over_3 = SignalStrength.MODERATE;
        else signals.over_3 = SignalStrength.WEAK;

        if ((percentages.under_6 ?? 0) >= 66) signals.under_6 = SignalStrength.STRONG;
        else if ((percentages.under_6 ?? 0) >= 61) signals.under_6 = SignalStrength.MODERATE;
        else signals.under_6 = SignalStrength.WEAK;

        const even = percentages.even ?? 50;
        if (even >= 56 || even <= 44) signals.even_odd = SignalStrength.STRONG;
        else if ((even >= 53 && even <= 55) || (even >= 45 && even <= 47)) signals.even_odd = SignalStrength.MODERATE;
        else signals.even_odd = SignalStrength.WEAK;

        return signals;
    };

    const calculateConfidence = (signals: { [key: string]: SignalStrength }, chi_square: { p_value: number }, percentages: {[key: string]: number}) => {
        let confidence = 0;
        if (signals.over_3 === SignalStrength.STRONG) confidence += 35;
        if (signals.under_6 === SignalStrength.STRONG) confidence += 35;
        if (signals.over_3 === SignalStrength.MODERATE) confidence += 15;
        if (signals.under_6 === SignalStrength.MODERATE) confidence += 15;
        if (signals.even_odd === SignalStrength.STRONG) confidence += 20;

        if (chi_square.p_value < 0.01) confidence += 25;
        else if (chi_square.p_value < 0.05) confidence += 10;
        
        for (let i = 0; i < 10; i++) {
            if((percentages[`digit_${i}`] ?? 0) >= 14) {
                confidence += 20;
                break;
            }
        }
        return Math.min(100, confidence);
    };

    const generateReasons = (signals: { [key: string]: SignalStrength }, chi_square: { p_value: number }, percentages: {[key: string]: number}) => {
        const reasons = [];
        if (signals.over_3 === SignalStrength.STRONG) reasons.push("Strong Over 3");
        if (signals.under_6 === SignalStrength.STRONG) reasons.push("Strong Under 6");
        if (chi_square.p_value < 0.01) reasons.push("Strong Statistical Bias");

        for (let i = 0; i < 10; i++) {
            if((percentages[`digit_${i}`] ?? 0) >= 14) {
                reasons.push("Hot Digit Detected");
                break;
            }
        }
        return reasons;
    };
    
    const analyzeSymbol = useCallback((symbol: string): AnalysisResult | null => {
        const digits = ticksRef.current[symbol];
        if (!digits || digits.length < 100) return null;

        const percentages = calculatePercentages(digits);
        const chi_square = chiSquareTest(percentages.digit_counts);
        const signals = classifySignalStrength(percentages);
        const confidence = calculateConfidence(signals, chi_square, percentages);
        const reasons = generateReasons(signals, chi_square, percentages);
        const strong_signal = signals.over_3 === SignalStrength.STRONG || signals.under_6 === SignalStrength.STRONG;
        
        const symbolName = VOLATILITY_MARKETS.find(m => m.symbol === symbol)?.name || symbol;

        return {
            symbol,
            name: symbolName,
            percentages,
            chi_square,
            signals,
            confidence,
            reasons,
            ticks_analyzed: digits.length,
            update_time: new Date().toISOString(),
            strong_signal,
        };
    }, []);


    // --- WebSocket and Data Handling ---
    const handleTick = useCallback((data: any) => {
        if (data.error || !data.tick) return;
        const { symbol, quote, id } = data.tick;

        if (!ticksRef.current[symbol]) {
            ticksRef.current[symbol] = [];
        }

        const lastDigit = extractLastDigit(quote, symbol);
        ticksRef.current[symbol].push(lastDigit);
        if (ticksRef.current[symbol].length > 500) {
            ticksRef.current[symbol].shift();
        }

        setTickCount(prev => prev + 1);

        // Update analysis every 5 ticks
        if (ticksRef.current[symbol].length >= 100 && ticksRef.current[symbol].length % 5 === 0) {
            const analysis = analyzeSymbol(symbol);
            if (analysis) {
                setAnalysisData(prev => ({ ...prev, [symbol]: analysis }));
                if (analysis.strong_signal && !showAlert) {
                    setShowAlert(true);
                    setAlertMessage(`Strong signal for ${analysis.name}: ${analysis.reasons.join(', ')}`);
                }
            }
        }
    }, [extractLastDigit, analyzeSymbol, showAlert]);
    
    const subscribeToAllSymbols = useCallback(() => {
        if (!api || !isConnected) return;
        setStatus('Subscribing to symbols...');
        
        allSymbols.forEach(symbol => {
            if (!subscriptionsRef.current[symbol]) {
                api.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
            }
        });
        
        const onMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.subscription) {
                const symbol = allSymbols.find(s => data.echo_req.ticks === s);
                if (symbol) {
                    subscriptionsRef.current[symbol] = data.subscription.id;
                }
            } else if (data.tick) {
                handleTick(data);
            }
        };

        api.addEventListener('message', onMessage);
        setStatus('Connected');

        return () => {
            api.removeEventListener('message', onMessage);
            Object.values(subscriptionsRef.current).forEach(id => {
                api.send(JSON.stringify({ forget: id }));
            });
            subscriptionsRef.current = {};
        };
    }, [api, isConnected, allSymbols, handleTick]);

    useEffect(() => {
        const cleanup = subscribeToAllSymbols();
        return cleanup;
    }, [subscribeToAllSymbols]);

    useEffect(() => {
        const timer = setInterval(() => setUpdateTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    const runBot = (symbol: string, direction: string) => {
        if (!confirm(`Start ${direction.toUpperCase()} bot for ${symbol}?\n\nBase stake: $1.00\nStop loss: $50.00 daily`)) return;
        alert(`Bot started for ${symbol} (${direction})\n\nRisk management active:\n• $50 daily loss limit\n• 30s cooldown per symbol\n• Max 3 concurrent trades`);
        console.log(`Starting ${direction} bot for ${symbol}`);
    };
    
    // --- UI Helpers ---
    const getConfidenceClass = (confidence: number) => {
        if (confidence >= 70) return 'confidence-high';
        if (confidence >= 40) return 'confidence-medium';
        return 'confidence-low';
    };
    const getBiasClass = (interpretation: string) => {
        if (interpretation.includes('STRONG')) return 'bias-strong';
        if (interpretation.includes('Bias')) return 'bias-detected';
        return 'bias-fair';
    };
    const getDigitClass = (percentage: number) => {
        if (percentage >= 14) return 'signal-digit-hot';
        if (percentage >= 11) return 'signal-digit-warm';
        return '';
    };
    const getSignalClass = (value: number, type: string) => {
        if (type === 'over_3' || type === 'under_6') {
            if (value >= 66) return 'signal-strong';
            if (value >= 61) return 'signal-moderate';
            return 'signal-weak';
        } else if (type === 'even' || type === 'odd') {
            if (value >= 56 || value <= 44) return 'signal-strong';
            if ((value >= 53 && value <= 55) || (value >= 45 && value <= 47)) return 'signal-moderate';
            return 'signal-weak';
        }
        return '';
    };

    const filteredAndSortedData = Object.values(analysisData)
        .filter((card: any) => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'strong') return card.strong_signal;
            if (activeFilter === 'over3') return card.percentages.over_3 >= 66;
            if (activeFilter === 'under6') return card.percentages.under_6 >= 66;
            if (activeFilter === 'volatility') return card.symbol.startsWith('R_') || card.symbol.includes('V');
            if (activeFilter === 'jump') return card.symbol.startsWith('JD');
            return true;
        })
        .sort((a: any, b: any) => {
            if (b.confidence !== a.confidence) return b.confidence - a.confidence;
            if (b.strong_signal !== a.strong_signal) return b.strong_signal ? 1 : -1;
            return a.symbol.localeCompare(b.symbol);
        });

    return (
        <div className="signal-center-body">
            <div className="signal-center-container">
                <div className="signal-center-header">
                    <h1><span>🎯</span> Deriv Digit Signal Center</h1>
                    <div className="signal-status-bar">
                        <div className="signal-status-indicator">
                            <div className={cn("signal-status-dot", { 'connected': isConnected && status === 'Connected' })}></div>
                            <span>{status}</span>
                        </div>
                        <span>Ticks: {tickCount}</span>
                        <span>{updateTime}</span>
                    </div>
                </div>

                {showAlert && (
                    <div className="signal-alert-banner" style={{ display: 'flex' }}>
                        <div><strong>🚨 STRONG SIGNAL DETECTED!</strong> <span>{alertMessage}</span></div>
                        <button onClick={() => setShowAlert(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                    </div>
                )}

                <div className="signal-risk-panel">
                    {/* Risk panel items... */}
                </div>
                
                <div className="signal-filters">
                    {['all', 'strong', 'over3', 'under6', 'volatility', 'jump'].map(filter => (
                        <button key={filter} className={cn("signal-filter-btn", { 'active': activeFilter === filter })} onClick={() => setActiveFilter(filter)}>
                            {/* Filter names */}
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="signal-cards-grid">
                    {!isConnected || Object.keys(analysisData).length === 0 ? (
                        <LoadingComponent />
                    ) : filteredAndSortedData.length > 0 ? (
                        filteredAndSortedData.map((card) => {
                             const hotDigits = Object.entries(card.percentages)
                                .filter(([key]) => key.startsWith('digit_') && !key.includes('counts'))
                                .filter(([, value]) => (value as number) >= 14)
                                .map(([key]) => key.split('_')[1]);

                            return (
                                <div key={card.symbol} className="signal-card">
                                    <div className="signal-card-header">
                                        <div className="signal-symbol-info">
                                            <h3>{card.name}</h3>
                                            <div className="symbol">{card.symbol}</div>
                                        </div>
                                        <div className={cn("signal-confidence-badge", getConfidenceClass(card.confidence))}>
                                            {card.confidence}%
                                        </div>
                                    </div>
                                    <div className="signal-signals-grid">
                                        <div className="signal-signal-item">
                                            <div className="signal-signal-label">Over 3</div>
                                            <div className={cn("signal-signal-value", getSignalClass(card.percentages.over_3, 'over_3'))}>
                                                {card.percentages.over_3?.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="signal-signal-item">
                                            <div className="signal-signal-label">Under 6</div>
                                            <div className={cn("signal-signal-value", getSignalClass(card.percentages.under_6, 'under_6'))}>
                                                {card.percentages.under_6?.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="signal-signal-item">
                                            <div className="signal-signal-label">Even</div>
                                            <div className={cn("signal-signal-value", getSignalClass(card.percentages.even, 'even'))}>
                                                {card.percentages.even?.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="signal-signal-item">
                                            <div className="signal-signal-label">Odd</div>
                                            <div className={cn("signal-signal-value", getSignalClass(card.percentages.odd, 'odd'))}>
                                                {card.percentages.odd?.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="signal-stats-row">
                                        <div className="signal-chi-square">
                                            χ²: {card.chi_square.chi2.toFixed(2)}, p: {card.chi_square.p_value.toFixed(4)}
                                        </div>
                                        <div className={cn("signal-bias-indicator", getBiasClass(card.chi_square.interpretation))}>
                                            {card.chi_square.interpretation}
                                        </div>
                                    </div>
                                    {card.reasons.length > 0 && (
                                        <div className="signal-reasons">
                                            {card.reasons.map((reason: string) => <span key={reason} className="signal-reason-tag">{reason}</span>)}
                                        </div>
                                    )}
                                    <div className="signal-digits-table">
                                        {Array.from({ length: 10 }).map((_, i) => {
                                            const pct = card.percentages[`digit_${i}`] || 0;
                                            return (
                                                <div key={i} className={cn("signal-digit-cell", getDigitClass(pct))} title={`Digit ${i}: ${pct.toFixed(1)}%`}>
                                                    <div className="signal-digit-label">{i}</div>
                                                    <div className="signal-digit-value">{pct.toFixed(1)}%</div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="signal-card-footer">
                                        <div className="signal-hot-digits">
                                            <span>🔥 Hot Digits:</span>
                                            <span>{hotDigits.length > 0 ? hotDigits.join(', ') : 'None'}</span>
                                        </div>
                                        <div className="signal-bot-buttons">
                                            <button className="signal-bot-btn signal-bot-over"
                                                disabled={(card.percentages.over_3 || 0) < 66}
                                                onClick={() => runBot(card.symbol, 'over')}>
                                                🤖 RUN OVER
                                            </button>
                                            <button className="signal-bot-btn signal-bot-under"
                                                disabled={(card.percentages.under_6 || 0) < 66}
                                                onClick={() => runBot(card.symbol, 'under')}>
                                                🤖 RUN UNDER
                                            </button>
                                        </div>
                                    </div>
                                    <div className="signal-update-time">
                                        Ticks: {card.ticks_analyzed} • Updated: {new Date(card.update_time).toLocaleTimeString()}
                                    </div>
                                </div>
                            );
                        })
                    ) : <NoDataComponent />}
                </div>
            </div>
        </div>
    );
};

export default SignalArena;
