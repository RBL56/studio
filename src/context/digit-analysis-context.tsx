
'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

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
}

const DigitAnalysisContext = createContext<DigitAnalysisContextType | undefined>(undefined);

export const DigitAnalysisProvider = ({ children }: { children: ReactNode }) => {
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

    }, [currentMarket]);

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
            
            if (simulatedTicks >= MAX_TICKS) {
                clearInterval(interval);
                setIsCollecting(false);
                updateStatus('connected', 'Real-time monitoring active');
                if (ws.current) {
                    ws.current.send(JSON.stringify({ ticks: currentMarket, subscribe: 1 }));
                }
            } else {
                 updateStatus('collecting', `Collecting historical: ${simulatedTicks}/${MAX_TICKS}`);
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
                const errorMessage = data.error?.message || 'An unknown API error occurred.';
                updateStatus('disconnected', `API Error: ${errorMessage}`);
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
        const timeout = setTimeout(() => {
            if (status === 'disconnected') {
                connect();
            }
        }, 1000);
        return () => {
            clearTimeout(timeout);
            disconnect();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (totalTicksProcessedRef.current % 10 === 0 || tickCount < 100) {
            updateDisplay();
        }
    }, [tickCount, updateDisplay]);
    
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
        connect,
        disconnect,
        handleMarketChange,
        marketConfig,
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

    
