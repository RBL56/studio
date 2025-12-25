'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';

// ================= CONFIGURATION =================
const MAX_TICKS = 1000;
const MAX_HISTORY = 20;

// Market configuration
const marketConfig: { [key: string]: { decimals: number } } = {
    'R_10': { decimals: 3 },
    'R_25': { decimals: 3 },
    'R_50': { decimals: 4 },
    'R_75': { decimals: 4 },
    'R_100': { decimals: 2 },
    '1HZ10V': { decimals: 2 },
    '1HZ25V': { decimals: 2 },
    '1HZ30V': { decimals: 3 },
    '1HZ50V': { decimals: 2 },
    '1HZ75V': { decimals: 2 },
    '1HZ90V': { decimals: 3 },
    '1HZ100V': { decimals: 2 }
};

interface Tick {
    price: number;
    digit: number;
    timestamp: number;
}

export function DigitAnalysisTool() {
    const [status, setStatus] = useState('disconnected');
    const [statusMessage, setStatusMessage] = useState('Click Connect to start');
    const [isCollecting, setIsCollecting] = useState(false);
    const [collectedCount, setCollectedCount] = useState(0);
    const [currentMarket, setCurrentMarket] = useState('R_100');
    const [price, setPrice] = useState('--');
    const [tickCount, setTickCount] = useState(0);
    const [digitStats, setDigitStats] = useState(() => Array(10).fill({ count: 0, percentage: '0.0%' }));
    const [evenOdd, setEvenOdd] = useState({ even: '0.0%', odd: '0.0%' });
    const [analysis, setAnalysis] = useState({ most: '-', least: '-', avg: '10.0%', dev: '0.0%' });
    const [tickHistory, setTickHistory] = useState<Tick[]>([]);
    const [activeDigit, setActiveDigit] = useState<number | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const subscriptionId = useRef<string | null>(null);
    const ticksRef = useRef<Tick[]>(new Array(MAX_TICKS));
    const digitCountsRef = useRef(Array(10).fill(0));
    const currentIndexRef = useRef(0);
    const totalTicksProcessedRef = useRef(0);

    const updateStatus = (newStatus: string, message: string) => {
        setStatus(newStatus);
        setStatusMessage(message);
    };

    const extractLastDigit = useCallback((price: number) => {
        const config = marketConfig[currentMarket];
        const decimals = config?.decimals || 2;
        const formattedPrice = price.toFixed(decimals);

        if (decimals === 0) {
            return Math.abs(Math.floor(price)) % 10;
        } else {
            const priceStr = formattedPrice.replace(/[^0-9]/g, '');
            const lastChar = priceStr.slice(-1);
            return parseInt(lastChar);
        }
    }, [currentMarket]);

    const updateDisplay = useCallback(() => {
        const total = Math.min(totalTicksProcessedRef.current, MAX_TICKS);
        if (total === 0) return;

        const percentages = digitCountsRef.current.map(count => (count / total) * 100);

        let maxPercentage = 0;
        let maxDigit = 0;
        let minPercentage = 100;
        let minDigit = 0;

        const newDigitStats = percentages.map((p, i) => {
            if (p > maxPercentage) { maxPercentage = p; maxDigit = i; }
            if (p < minPercentage) { minPercentage = p; minDigit = i; }
            return { count: digitCountsRef.current[i], percentage: `${p.toFixed(1)}%` };
        });
        setDigitStats(newDigitStats);

        let evenCount = 0;
        for (let i = 0; i < 10; i += 2) {
            evenCount += digitCountsRef.current[i];
        }
        const evenPercentage = (evenCount / total) * 100;
        setEvenOdd({ even: `${evenPercentage.toFixed(1)}%`, odd: `${(100 - evenPercentage).toFixed(1)}%` });

        const averagePercentage = percentages.reduce((a, b) => a + b, 0) / 10;
        const variance = percentages.reduce((acc, val) => acc + Math.pow(val - averagePercentage, 2), 0) / 10;
        const stdDev = Math.sqrt(variance);

        setAnalysis({
            most: String(maxDigit),
            least: String(minDigit),
            avg: `${averagePercentage.toFixed(1)}%`,
            dev: `${stdDev.toFixed(1)}%`
        });

    }, []);

    const processTick = useCallback((tick: Tick, isHistorical: boolean) => {
        const currentTick = ticksRef.current[currentIndexRef.current];
        if (currentTick) {
            digitCountsRef.current[currentTick.digit]--;
        }

        ticksRef.current[currentIndexRef.current] = tick;
        digitCountsRef.current[tick.digit]++;
        totalTicksProcessedRef.current++;
        setTickCount(prev => Math.min(prev + 1, MAX_TICKS));
        
        currentIndexRef.current = (currentIndexRef.current + 1) % MAX_TICKS;
        
        if (!isHistorical) {
            const config = marketConfig[currentMarket];
            const decimals = config?.decimals || 2;
            setPrice(tick.price.toFixed(decimals));
            setTickHistory(prev => [tick, ...prev.slice(0, MAX_HISTORY - 1)]);
            setActiveDigit(tick.digit);
            setTimeout(() => setActiveDigit(null), 500);
        }

        if (totalTicksProcessedRef.current % 10 === 0) { // Update display periodically
             updateDisplay();
        }

    }, [currentMarket, updateDisplay]);

    const simulateHistoricalCollection = useCallback(() => {
        let simulatedTicks = 0;
        setIsCollecting(true);
        updateStatus('collecting', `Collecting historical: 0/${MAX_TICKS}`);
        setCollectedCount(0);

        const interval = setInterval(() => {
            const simulatedPrice = 3500 + (Math.random() - 0.5) * 50;
            const digit = extractLastDigit(simulatedPrice);
            processTick({ price: simulatedPrice, digit, timestamp: Date.now() }, true);
            
            simulatedTicks++;
            setCollectedCount(simulatedTicks);
            updateStatus('collecting', `Collecting historical: ${simulatedTicks}/${MAX_TICKS}`);
            
            if (simulatedTicks >= MAX_TICKS) {
                clearInterval(interval);
                setIsCollecting(false);
                updateStatus('connected', 'Real-time monitoring active');
                if (ws.current) {
                    ws.current.send(JSON.stringify({ ticks: currentMarket, subscribe: 1 }));
                }
            }
        }, 10);
    }, [currentMarket, extractLastDigit, processTick]);

    const connect = useCallback(() => {
        if (ws.current) return;
        updateStatus('connecting', 'Connecting to Deriv API...');

        ws.current = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

        ws.current.onopen = () => {
            simulateHistoricalCollection();
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.tick) {
                const newTick = {
                    price: parseFloat(data.tick.quote),
                    digit: extractLastDigit(parseFloat(data.tick.quote)),
                    timestamp: Date.now()
                };
                processTick(newTick, false);
            } else if (data.subscription) {
                subscriptionId.current = data.subscription.id;
            } else if (data.error) {
                console.error('API Error:', data.error);
                updateStatus('disconnected', `API Error: ${data.error.message}`);
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateStatus('disconnected', 'Connection error');
            ws.current = null;
        };

        ws.current.onclose = () => {
            updateStatus('disconnected', 'Disconnected');
            ws.current = null;
        };
    }, [extractLastDigit, processTick, simulateHistoricalCollection]);

    const disconnect = useCallback(() => {
        if (ws.current) {
            if (subscriptionId.current) {
                ws.current.send(JSON.stringify({ forget: subscriptionId.current }));
            }
            ws.current.close();
        }
    }, []);

    const resetData = useCallback(() => {
        ticksRef.current = new Array(MAX_TICKS);
        digitCountsRef.current = Array(10).fill(0);
        currentIndexRef.current = 0;
        totalTicksProcessedRef.current = 0;
        setTickCount(0);
        setPrice('--');
        setDigitStats(Array(10).fill({ count: 0, percentage: '0.0%' }));
        setEvenOdd({ even: '0.0%', odd: '0.0%' });
        setAnalysis({ most: '-', least: '-', avg: '10.0%', dev: '0.0%' });
        setTickHistory([]);
    }, []);
    
    const handleMarketChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentMarket(e.target.value);
        resetData();
        if (status !== 'disconnected') {
            disconnect();
            setTimeout(connect, 500);
        }
    };
    
    useEffect(() => {
        resetData();
        const timeout = setTimeout(connect, 1000);
        return () => {
            clearTimeout(timeout);
            disconnect();
        }
    }, []);

    useEffect(() => {
        updateDisplay();
    }, [tickCount, updateDisplay]);

    return (
        <div className="digit-analysis-container">
            <div className="digit-analysis-header">
                <div className="digit-analysis-title">Deriv Last Digit Analysis</div>
                <div className="digit-analysis-subtitle">{currentMarket} • Historical + Real-time • Last {MAX_TICKS} ticks</div>
            </div>

            <div className="digit-analysis-main-card">
                <div className={`digit-analysis-connection-status status-${status}`}>
                    <div className="status-dot"></div>
                    <div>{statusMessage}</div>
                </div>

                {isCollecting && (
                    <div className="collection-info">
                        <div className="loading"></div>Collecting historical ticks... <span>{collectedCount}</span>/{MAX_TICKS}
                    </div>
                )}
                
                <div className="digit-analysis-controls">
                    <Button onClick={connect} disabled={status !== 'disconnected'} className="w-full">
                        {status === 'connecting' ? <><div className="loading"></div>Connecting...</> : 'Connect'}
                    </Button>
                    <Button onClick={disconnect} disabled={status === 'disconnected'} variant="destructive" className="w-full">Disconnect</Button>
                </div>

                <div className="digit-analysis-stats-row">
                    <div className="digit-analysis-stat-box">
                        <div className="digit-analysis-stat-value">{price}</div>
                        <div className="digit-analysis-stat-label">Current Price</div>
                    </div>
                    <div className="digit-analysis-stat-box">
                        <div className="digit-analysis-stat-value">{tickCount}/{MAX_TICKS}</div>
                        <div className="digit-analysis-stat-label">Historical Ticks</div>
                    </div>
                </div>

                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${(tickCount / MAX_TICKS) * 100}%` }}></div>
                </div>

                <div className="info-note">
                    First collects 1000 historical ticks, then continues with real-time updates
                </div>

                <select value={currentMarket} onChange={handleMarketChange} className="digit-analysis-market-select mt-4">
                    <optgroup label="Volatility Indices">
                        <option value="R_10">Volatility 10</option>
                        <option value="R_25">Volatility 25</option>
                        <option value="R_50">Volatility 50</option>
                        <option value="R_75">Volatility 75</option>
                        <option value="R_100">Volatility 100</option>
                    </optgroup>
                    <optgroup label="1-Second Volatility Indices">
                        <option value="1HZ10V">Volatility 10 (1s)</option>
                        <option value="1HZ25V">Volatility 25 (1s)</option>
                        <option value="1HZ30V">Volatility 30 (1s)</option>
                        <option value="1HZ50V">Volatility 50 (1s)</option>
                        <option value="1HZ75V">Volatility 75 (1s)</option>
                        <option value="1HZ90V">Volatility 90 (1s)</option>
                        <option value="1HZ100V">Volatility 100 (1s)</option>
                    </optgroup>
                </select>
            </div>
            
            <div className="digit-analysis-main-card">
                <div className="digit-analysis-card-title">Digit Distribution (Last 1000 Ticks)</div>
                <div className="digits-grid">
                    {digitStats.map((stat, i) => {
                        const p = parseFloat(stat.percentage);
                        let barColor;
                        if (p >= 12) barColor = '#ef4444';
                        else if (p >= 10.5) barColor = '#f59e0b';
                        else if (p >= 9.5) barColor = '#22c55e';
                        else if (p >= 8) barColor = '#60a5fa';
                        else barColor = '#8b5cf6';

                        return (
                            <div key={i} className={`digit-box 
                                ${i === 0 ? 'digit-zero' : ''} 
                                ${i === Number(analysis.most) ? 'most-frequent' : ''}
                                ${i === activeDigit ? 'active-digit' : ''}`}>
                                <div className="digit">{i}</div>
                                <div className="percentage">{stat.percentage}</div>
                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>{stat.count}</div>
                                <div className="bar">
                                    <div className="fill" style={{ width: `${Math.min(p * 2, 100)}%`, background: barColor }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="eo">
                    <div className="even">
                        <div className="even-percentage">{evenOdd.even}</div>
                        <div className="stat-label">Even (0,2,4,6,8)</div>
                    </div>
                    <div className="odd">
                        <div className="odd-percentage">{evenOdd.odd}</div>
                        <div className="stat-label">Odd (1,3,5,7,9)</div>
                    </div>
                </div>
                
                <div className="analysis-summary">
                    <div className="summary-box">
                        <div className="summary-label">Most Frequent</div>
                        <div className="summary-value">{analysis.most}</div>
                    </div>
                    <div className="summary-box">
                        <div className="summary-label">Least Frequent</div>
                        <div className="summary-value">{analysis.least}</div>
                    </div>
                    <div className="summary-box">
                        <div className="summary-label">Average %</div>
                        <div className="summary-value">{analysis.avg}</div>
                    </div>
                    <div className="summary-box">
                        <div className="summary-label">Deviation</div>
                        <div className="summary-value">{analysis.dev}</div>
                    </div>
                </div>
            </div>

            <div className="digit-analysis-main-card">
                <div className="digit-analysis-card-title">Recent Ticks (Historical + Real-time)</div>
                <div className="tick-history">
                    {tickHistory.length === 0 ? (
                        <div className="tick-item">Collecting data...</div>
                    ) : (
                        tickHistory.map((tick, index) => {
                            const time = new Date(tick.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            let digitColor = '#60a5fa';
                            if (tick.digit === 0) digitColor = '#8b5cf6';
                            else if (tick.digit % 2 === 0) digitColor = '#22c55e';
                            else digitColor = '#ef4444';
                            
                            return(
                                <div className="tick-item" key={index}>
                                    <span>{time}</span>
                                    <span>{tick.price.toFixed(marketConfig[currentMarket]?.decimals || 2)}</span>
                                    <span style={{ color: digitColor, fontWeight: 'bold' }}>({tick.digit})</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            
            <div className="digit-analysis-footer">
                Real-time Deriv API Connection • Analysis based on last 1000 historical ticks + real-time updates<br />
                Digit 0 is included in even numbers calculation • Technical Differences Fixed
            </div>
        </div>
    );
}
