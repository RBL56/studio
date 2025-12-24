'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDerivApi } from '@/context/deriv-api-context';
import { VOLATILITY_MARKETS } from '@/lib/constants';

const colors = ["#22c55e", "#eab308", "#f97316", "#ef4444"]; // Green to Red
const MAX_TICKS = 1000;

export function DigitAnalysisTool() {
    const { api, isConnected } = useDerivApi();
    const [market, setMarket] = useState('R_100');
    const [ticks, setTicks] = useState<{ price: number; digit: number }[]>([]);
    const [currentPrice, setCurrentPrice] = useState<string>('--');
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

    const digitBoxesRef = useRef<(HTMLDivElement | null)[]>([]);

    const memoizedVolatilityMarkets = useMemo(() => [
        ...VOLATILITY_MARKETS.filter(m => !m.symbol.startsWith('1HZ')),
        ...VOLATILITY_MARKETS.filter(m => m.symbol.startsWith('1HZ')),
    ], []);


    const forgetPreviousSubscriptions = useCallback(() => {
        if (api && subscriptionId) {
            try {
                api.send(JSON.stringify({ forget: subscriptionId }));
                setSubscriptionId(null);
            } catch (e) {
                console.error("Error forgetting subscription:", e);
            }
        }
    }, [api, subscriptionId]);

    useEffect(() => {
        if (!api || !isConnected) return;

        forgetPreviousSubscriptions();
        setTicks([]);

        const subscribe = () => {
            api.send(JSON.stringify({
                ticks_history: market,
                count: MAX_TICKS,
                end: 'latest',
                subscribe: 1
            }));
        };

        if (api.readyState === WebSocket.OPEN) {
            subscribe();
        } else {
            api.addEventListener('open', subscribe, { once: true });
        }

        const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.error) {
                return;
            }

            if (data.msg_type === 'history') {
                const historyTicks = data.history.prices.map((price: number) => {
                    const priceStr = price.toString();
                    return { price, digit: parseInt(priceStr[priceStr.length - 1]) };
                });
                setTicks(historyTicks);
                if (historyTicks.length > 0) {
                    setCurrentPrice(historyTicks[historyTicks.length - 1].price.toFixed(getPrecision(market)));
                }
            }

            if (data.msg_type === 'tick') {
                if (data.subscription?.id && !subscriptionId) {
                    setSubscriptionId(data.subscription.id);
                }
                const newTick = data.tick;
                const price = newTick.quote;
                const priceStr = price.toString();
                const digit = parseInt(priceStr[priceStr.length - 1]);
                
                setCurrentPrice(price.toFixed(getPrecision(market)));
                setTicks(prev => [{ price, digit }, ...prev.slice(0, MAX_TICKS - 1)]);
            }
        };

        api.addEventListener('message', handleMessage);

        return () => {
            api.removeEventListener('message', handleMessage);
            // The forget is now handled at the start of the effect
        };

    }, [api, isConnected, market]);

    const getPrecision = (symbol: string) => {
        const marketInfo = VOLATILITY_MARKETS.find(m => m.symbol === symbol);
        if (marketInfo) {
            if (marketInfo.name.includes('(1s)')) return 3;
            if (marketInfo.symbol === 'R_10' || marketInfo.symbol === 'R_25') return 4;
        }
        return 2; // Default for others like R_50, R_75, R_100
    }

    const handleMarketChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setMarket(e.target.value);
    };

    const analysis = useMemo(() => {
        if (ticks.length === 0) return null;

        const digitCounts = Array(10).fill(0);
        const currentTicks = ticks.slice(0, MAX_TICKS);
        currentTicks.forEach(tick => {
            digitCounts[tick.digit]++;
        });

        const percentages = digitCounts.map(count => (count / currentTicks.length) * 100);

        let maxCount = -1;
        let mostFrequentDigit = -1;
        let highestPercentage = -1;
        let mostVolatileDigit = -1;

        percentages.forEach((p, i) => {
            if (digitCounts[i] > maxCount) {
                maxCount = digitCounts[i];
                mostFrequentDigit = i;
            }
            if (p > highestPercentage) {
                highestPercentage = p;
                mostVolatileDigit = i;
            }
        });

        let evenCount = 0;
        for (let i = 0; i < 10; i += 2) {
            evenCount += digitCounts[i];
        }
        const evenPercentage = (evenCount / currentTicks.length) * 100;
        const oddPercentage = 100 - evenPercentage;

        // Volatility calculations
        const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
        const variance = percentages.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / percentages.length;
        const stdDev = Math.sqrt(variance);

        let overallVol: 'High' | 'Medium' | 'Low';
        if (stdDev > 4.0) overallVol = 'High';
        else if (stdDev > 2.5) overallVol = 'Medium';
        else overallVol = 'Low';

        const range = Math.max(...percentages) - Math.min(...percentages);
        let digitVol: 'High' | 'Medium' | 'Low';
        if (range > 9) digitVol = 'High';
        else if (range > 6) digitVol = 'Medium';
        else digitVol = 'Low';

        const evenOddDiff = Math.abs(evenPercentage - oddPercentage);
        let evenOddVol: 'High' | 'Medium' | 'Low';
        if (evenOddDiff > 8) evenOddVol = 'High';
        else if (evenOddDiff > 4) evenOddVol = 'Medium';
        else evenOddVol = 'Low';
        
        return {
            percentages,
            mostFrequentDigit,
            mostVolatileDigit,
            highestPercentage,
            evenPercentage,
            oddPercentage,
            overallVol,
            digitVol,
            evenOddVol,
            totalTicks: currentTicks.length
        };
    }, [ticks]);

    useEffect(() => {
        if (!analysis || ticks.length === 0) return;

        const currentDigit = ticks[0].digit;
        const activeBox = digitBoxesRef.current[currentDigit];

        if (activeBox) {
            activeBox.classList.add('active-digit');
            const timer = setTimeout(() => {
                activeBox.classList.remove('active-digit');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [ticks, analysis]);


    const getVolClass = (vol: 'High' | 'Medium' | 'Low') => {
        if (vol === 'High') return 'vol-high';
        if (vol === 'Medium') return 'vol-medium';
        return 'vol-low';
    };

    return (
        <>
            <style jsx global>{`
                .analysis-tool-container * {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .analysis-tool-container {
                    background: #0f172a;
                    color: #e2e8f0;
                    padding: 12px;
                    font-size: 14px;
                    border-radius: 10px;
                }
                .analysis-tool-container .container { max-width: 100%; margin: 0 auto; }
                .analysis-tool-container .header { text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #334155; }
                .analysis-tool-container .title { color: #60a5fa; font-size: 1.4rem; font-weight: 600; }
                .analysis-tool-container .subtitle { color: #94a3b8; font-size: .85rem; margin-top: 4px; }
                .analysis-tool-container .main-card { background: #1e293b; border-radius: 10px; padding: 16px; border: 1px solid #334155; margin-bottom: 12px; }
                .analysis-tool-container .card-title { text-align: center; color: #60a5fa; font-weight: 600; margin-bottom: 12px; font-size: 1.1rem; }
                .analysis-tool-container .stats-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; }
                .analysis-tool-container .stat-box { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 8px; text-align: center; }
                .analysis-tool-container .stat-label { font-size: .7rem; color: #94a3b8; margin-top: 2px; }
                .analysis-tool-container .stat-value { font-size: 1rem; color: #60a5fa; font-weight: 700; min-height: 24px; display: flex; align-items: center; justify-content: center; }
                .analysis-tool-container .market-select { width: 100%; background: #0f172a; color: #60a5fa; border: 1px solid #334155; border-radius: 6px; padding: 8px; font-weight: 600; font-size: 0.9rem; }
                .analysis-tool-container .digits-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 14px; }
                .analysis-tool-container .digit-box { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 10px 4px; text-align: center; transition: all 0.3s ease; }
                .analysis-tool-container .digit { font-weight: 700; color: #60a5fa; font-size: 1.1rem; margin-bottom: 4px; }
                .analysis-tool-container .percentage { font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; }
                .analysis-tool-container .bar { height: 4px; background: #334155; border-radius: 3px; margin-top: 4px; overflow: hidden; }
                .analysis-tool-container .fill { height: 100%; border-radius: 3px; }
                .analysis-tool-container .most-frequent { border-color: #22c55e !important; box-shadow: 0 0 6px rgba(34, 197, 94, .4); }
                .analysis-tool-container .active-digit { background: rgba(96, 165, 250, .15); }
                .analysis-tool-container .eo { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
                .analysis-tool-container .even { background: rgba(34, 197, 94, .1); border: 1px solid #22c55e; border-radius: 6px; text-align: center; padding: 12px; }
                .analysis-tool-container .odd { background: rgba(239, 68, 68, .1); border: 1px solid #ef4444; border-radius: 6px; text-align: center; padding: 12px; }
                .analysis-tool-container .even-percentage, .odd-percentage { font-size: 1.3rem; font-weight: bold; margin-bottom: 4px; }
                .analysis-tool-container .even .even-percentage { color: #22c55e; }
                .analysis-tool-container .odd .odd-percentage { color: #ef4444; }
                .analysis-tool-container .volatility-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px; }
                .analysis-tool-container .vol-item { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 10px; text-align: center; }
                .analysis-tool-container .vol-label { font-size: .75rem; color: #94a3b8; margin-bottom: 4px; }
                .analysis-tool-container .vol-value { font-size: 1rem; font-weight: 700; min-height: 24px; display: flex; align-items: center; justify-content: center;}
                .analysis-tool-container .vol-high { color: #ef4444; }
                .analysis-tool-container .vol-medium { color: #eab308; }
                .analysis-tool-container .vol-low { color: #22c55e; }
                .analysis-tool-container .footer { text-align: center; color: #64748b; font-size: .75rem; margin-top: 12px; }

                @media (max-width: 360px) {
                    .analysis-tool-container { padding: 8px; font-size: 13px; }
                    .analysis-tool-container .main-card { padding: 12px; }
                    .analysis-tool-container .stat-value { font-size: 0.9rem; }
                    .analysis-tool-container .digit { font-size: 1rem; }
                    .analysis-tool-container .percentage { font-size: 0.85rem; }
                    .analysis-tool-container .digits-grid { grid-template-columns: repeat(5, 1fr); gap: 6px; }
                    .analysis-tool-container .digit-box { padding: 8px 2px; }
                }
                @media (min-width: 768px) {
                    .analysis-tool-container .volatility-grid { grid-template-columns: repeat(4, 1fr); }
                }
            `}</style>
            <div className="analysis-tool-container">
                <div className="container">
                    <div className="header">
                        <div className="title">Deriv Last Digit Analysis</div>
                        <div className="subtitle">Based on last {MAX_TICKS} ticks</div>
                    </div>
                    
                    <div className="main-card">
                        <div className="card-title">Market Overview</div>
                        <div className="stats-row">
                            <div className="stat-box">
                                <div className="stat-value">{currentPrice}</div>
                                <div className="stat-label">Current Price</div>
                            </div>
                            <div className="stat-box">
                                <select value={market} onChange={handleMarketChange} className="market-select">
                                    <optgroup label="All Markets">
                                        {memoizedVolatilityMarkets.map(m => (
                                            <option key={m.symbol} value={m.symbol}>{m.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <div className="stat-label">Market</div>
                            </div>
                        </div>
                    </div>

                    <div className="main-card">
                        <div className="card-title">Digit Distribution (Last {MAX_TICKS} Ticks)</div>
                        <div className="digits-grid">
                            {Array.from({ length: 10 }).map((_, i) => {
                                const percentage = analysis?.percentages[i] ?? 0;
                                let colorIndex;
                                if (percentage >= 15) colorIndex = 3; // Red
                                else if (percentage >= 11) colorIndex = 2; // Orange
                                else if (percentage >= 9) colorIndex = 1; // Yellow
                                else colorIndex = 0; // Green
                                
                                const isMostFrequent = analysis?.mostFrequentDigit === i;

                                return (
                                    <div key={i} ref={el => digitBoxesRef.current[i] = el} className={`digit-box ${isMostFrequent ? 'most-frequent' : ''}`}>
                                        <div className="digit">{i}</div>
                                        <div className="percentage">{percentage.toFixed(1)}%</div>
                                        <div className="bar">
                                            <div className="fill" style={{ width: `${Math.min(percentage * 3, 100)}%`, background: colors[colorIndex] }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="eo">
                            <div className="even">
                                <div className="even-percentage">{analysis?.evenPercentage.toFixed(1) ?? '0.0'}%</div>
                                <div className="stat-label">Even</div>
                            </div>
                            <div className="odd">
                                <div className="odd-percentage">{analysis?.oddPercentage.toFixed(1) ?? '0.0'}%</div>
                                <div className="stat-label">Odd</div>
                            </div>
                        </div>
                    </div>

                    <div className="main-card">
                        <div className="card-title">Volatility Analysis</div>
                        <div className="volatility-grid">
                            <div className="vol-item">
                                <div className="vol-label">Overall Volatility</div>
                                <div className={`vol-value ${getVolClass(analysis?.overallVol ?? 'Low')}`}>{analysis?.overallVol ?? '--'}</div>
                            </div>
                            <div className="vol-item">
                                <div className="vol-label">Digit Distribution</div>
                                <div className={`vol-value ${getVolClass(analysis?.digitVol ?? 'Low')}`}>{analysis?.digitVol ?? '--'}</div>
                            </div>
                            <div className="vol-item">
                                <div className="vol-label">Even/Odd Volatility</div>
                                <div className={`vol-value ${getVolClass(analysis?.evenOddVol ?? 'Low')}`}>{analysis?.evenOddVol ?? '--'}</div>
                            </div>
                            <div className="vol-item">
                                <div className="vol-label">Most Volatile Digit</div>
                                <div className="vol-value">{analysis ? `${analysis.mostVolatileDigit} (${analysis.highestPercentage.toFixed(1)}%)` : '- (0.0%)'}</div>
                            </div>
                        </div>
                        <div className="stats-row" style={{ marginTop: '12px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div className="stat-box">
                                <div className="stat-value">{analysis?.mostFrequentDigit ?? '-'}</div>
                                <div className="stat-label">Most Frequent</div>
                            </div>
                            <div className="stat-box">
                                <div className="stat-value">{analysis?.totalTicks ?? 0}</div>
                                <div className="stat-label">In Window</div>
                            </div>
                            <div className="stat-box">
                                <div className="stat-value">{analysis?.totalTicks ?? 0}</div>
                                <div className="stat-label">Total Ticks</div>
                            </div>
                        </div>
                    </div>

                    <div className="footer">
                        Live data from Deriv API • Analysis based on last {MAX_TICKS} ticks
                    </div>
                </div>
            </div>
        </>
    );
}
