
'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

// ================= CONFIGURATION =================
const MAX_TICKS_API_LIMIT = 5000;
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

interface DigitAnalysisContextType {
    status: string;
    statusMessage: string;
    isCollecting: boolean;
    collectedCount: number;
    currentMarket: string;
    price: string;
    tickCount: number;
    digitStats: { count: number; percentage: string }[];
    evenOdd: { even: string; odd: string };
    analysis: { most: string; least: string; avg: string; dev: string };
    tickHistory: Tick[];
    activeDigit: number | null;
    connect: () => void;
    disconnect: () => void;
    handleMarketChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    marketConfig: { [key: string]: { decimals: number } };
    ticksToFetch: number;
    setTicksToFetch: (ticks: number) => void;
    maxTicks: number;
}

type Tick = {
    price: number;
    digit: number;
    timestamp: number;
};

const DigitAnalysisContext = createContext<DigitAnalysisContextType | undefined>(undefined);

export const DigitAnalysisProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState('disconnected');
    const [statusMessage, setStatusMessage] = useState('Click Connect to start');
    const [isCollecting, setIsCollecting] = useState(false);
    const [collectedCount, setCollectedCount] = useState(0);
    const [currentMarket, setCurrentMarket] = useState('R_100');
    const [price, setPrice] = useState('--');
    const [tickCount, setTickCount] = useState(0);
    const [ticksToFetch, setTicksToFetch] = useState(1000);
    const [digitStats, setDigitStats] = useState(() => Array(10).fill({ count: 0, percentage: '0.0%' }));
    const [evenOdd, setEvenOdd] = useState({ even: '0.0%', odd: '0.0%' });
    const [analysis, setAnalysis] = useState({ most: '-', least: '-', avg: '10.0%', dev: '0.0%' });
    const [tickHistory, setTickHistory] = useState<Tick[]>([]);
    const [activeDigit, setActiveDigit] = useState<number | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const subscriptionId = useRef<string | null>(null);
    const ticksRef = useRef<Tick[]>([]);
    const digitCountsRef = useRef(Array(10).fill(0));
    const currentIndexRef = useRef(0);
    const totalTicksProcessedRef = useRef(0);

    const updateStatus = (newStatus: string, message: string) => {
        setStatus(newStatus);
        setStatusMessage(message);
    };

    const extractLastDigit = useCallback((price: number, marketSymbol: string) => {
        const config = marketConfig[marketSymbol];
        const decimals = config?.decimals || 2;
        const formattedPrice = price.toFixed(decimals);

        if (decimals === 0) {
            return Math.abs(Math.floor(price)) % 10;
        } else {
            const priceStr = formattedPrice.replace(/[^0-9]/g, '');
            const lastChar = priceStr.slice(-1);
            return parseInt(lastChar);
        }
    }, []);

    const updateDisplay = useCallback(() => {
        const total = Math.min(totalTicksProcessedRef.current, ticksToFetch);
        if (total === 0) return;

        const counts = digitCountsRef.current;
        const percentages = counts.map(count => (count / total) * 100);

        let maxPercentage = -1;
        let maxDigit = 0;
        let minPercentage = 101;
        let minDigit = 0;

        const newDigitStats = percentages.map((p, i) => {
            if (p > maxPercentage) { maxPercentage = p; maxDigit = i; }
            if (p < minPercentage) { minPercentage = p; minDigit = i; }
            return { count: counts[i], percentage: `${p.toFixed(1)}%` };
        });
        
        let evenCount = 0;
        for (let i = 0; i < 10; i += 2) {
            evenCount += counts[i];
        }
        const evenPercentage = (evenCount / total) * 100;
        
        const averagePercentage = 10; // Theoretical average
        const variance = percentages.reduce((acc, val) => acc + Math.pow(val - averagePercentage, 2), 0) / 10;
        const stdDev = Math.sqrt(variance);

        setDigitStats(newDigitStats);
        setEvenOdd({ even: `${evenPercentage.toFixed(1)}%`, odd: `${(100 - evenPercentage).toFixed(1)}%` });
        setAnalysis({
            most: String(maxDigit),
            least: String(minDigit),
            avg: `${averagePercentage.toFixed(1)}%`,
            dev: `${stdDev.toFixed(1)}%`
        });
    }, [ticksToFetch]);

    const processTick = useCallback((tick: Tick, isHistorical: boolean) => {
        const currentTick = ticksRef.current[currentIndexRef.current];
        if (currentTick) {
            digitCountsRef.current[currentTick.digit]--;
        }

        ticksRef.current[currentIndexRef.current] = tick;
        digitCountsRef.current[tick.digit]++;
        
        if (totalTicksProcessedRef.current < ticksToFetch) {
            totalTicksProcessedRef.current++;
        }
        setTickCount(totalTicksProcessedRef.current);
        
        currentIndexRef.current = (currentIndexRef.current + 1) % ticksToFetch;
        
        if (!isHistorical) {
            const config = marketConfig[currentMarket];
            const decimals = config?.decimals || 2;
            setPrice(tick.price.toFixed(decimals));
            setTickHistory(prev => [tick, ...prev.slice(0, MAX_HISTORY - 1)]);
            setActiveDigit(tick.digit);
            setTimeout(() => setActiveDigit(null), 500);
        }
        updateDisplay();
    }, [currentMarket, updateDisplay, ticksToFetch]);
    
    const fetchHistoricalData = useCallback((market: string) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
        setIsCollecting(true);
        updateStatus('collecting', `Collecting historical: 0/${ticksToFetch}`);
        setCollectedCount(0);

        ws.current.send(JSON.stringify({
            ticks_history: market,
            end: "latest",
            count: ticksToFetch,
            style: "ticks",
        }));
    }, [ticksToFetch]);


    const disconnect = useCallback(() => {
        if (ws.current) {
            if (subscriptionId.current) {
                ws.current.send(JSON.stringify({ forget: subscriptionId.current }));
                subscriptionId.current = null;
            }
            ws.current.onmessage = null;
            ws.current.onopen = null;
            ws.current.onclose = null;
            ws.current.onerror = null;
            ws.current.close();
            ws.current = null;
        }
        updateStatus('disconnected', 'Disconnected');
        setIsCollecting(false);
    }, []);

    const resetData = useCallback(() => {
        ticksRef.current = new Array(ticksToFetch);
        digitCountsRef.current = Array(10).fill(0);
        currentIndexRef.current = 0;
        totalTicksProcessedRef.current = 0;
        setTickCount(0);
        setPrice('--');
        setDigitStats(Array(10).fill({ count: 0, percentage: '0.0%' }));
        setEvenOdd({ even: '0.0%', odd: '0.0%' });
        setAnalysis({ most: '-', least: '-', avg: '10.0%', dev: '0.0%' });
        setTickHistory([]);
    }, [ticksToFetch]);

    const connect = useCallback(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            return;
        }

        if (ws.current) {
            disconnect();
        }

        resetData();
        updateStatus('connecting', 'Connecting to Deriv API...');

        ws.current = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
        
        ws.current.onopen = () => {
            fetchHistoricalData(currentMarket);
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.error) {
                if (data.error.code !== 'AlreadySubscribed') {
                    const errorMessage = data.error?.message || 'An unknown API error occurred.';
                    updateStatus('disconnected', `API Error: ${errorMessage}`);
                    disconnect();
                }
                return;
            }

            if (data.history) {
                const { prices } = data.history;
                prices.forEach((price: number) => {
                    const digit = extractLastDigit(price, currentMarket);
                    processTick({ price, digit, timestamp: Date.now() }, true);
                });
                setCollectedCount(prices.length);
                setIsCollecting(false);
                updateStatus('connected', 'Real-time monitoring active');
                ws.current?.send(JSON.stringify({ ticks: currentMarket, subscribe: 1 }));
            } else if (data.tick) {
                const newTick = {
                    price: parseFloat(data.tick.quote),
                    digit: extractLastDigit(parseFloat(data.tick.quote), currentMarket),
                    timestamp: data.tick.epoch * 1000
                };
                processTick(newTick, false);
            } else if (data.subscription) {
                subscriptionId.current = data.subscription.id;
            }
        };

        ws.current.onerror = (error) => {
            updateStatus('disconnected', 'Connection error. Please try again.');
            disconnect();
        };

        ws.current.onclose = () => {
            if (status !== 'disconnected') {
              updateStatus('disconnected', 'Disconnected. Click Connect to start');
            }
            ws.current = null;
        };
    }, [currentMarket, disconnect, extractLastDigit, fetchHistoricalData, processTick, resetData, status]);
    
    const handleMarketChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMarket = e.target.value;
        setCurrentMarket(newMarket);
        if (status !== 'disconnected') {
            disconnect();
            // The user will have to click connect again.
        }
    };
    
    useEffect(() => {
        return () => {
            if (ws.current) {
                disconnect();
            }
        }
    }, [disconnect]);
    
    const value = {
        status,
        statusMessage,
        isCollecting,
        collectedCount,
        currentMarket,
        price,
        tickCount,
        digitStats,
        evenOdd,
        analysis,
        tickHistory,
        activeDigit,
        connect: () => connect(),
        disconnect,
        handleMarketChange,
        marketConfig,
        ticksToFetch,
        setTicksToFetch,
        maxTicks: MAX_TICKS_API_LIMIT
    };

    return (
        <DigitAnalysisContext.Provider value={value}>
            {children}
        </DigitAnalysisContext.Provider>
    );
};

export const useDigitAnalysis = () => {
    const context = useContext(DigitAnalysisContext);
    if (context === undefined) {
        throw new Error('useDigitAnalysis must be used within a DigitAnalysisProvider');
    }
    return context;
};
