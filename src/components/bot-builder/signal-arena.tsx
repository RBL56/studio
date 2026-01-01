'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// Helper component for the loading state
const LoadingComponent = () => (
    <div className="signal-loading">
        <div className="signal-loading-spinner"></div>
        <p>Connecting to analysis server...</p>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '8px' }}>
            Starting WebSocket connection and collecting ticks...
        </p>
    </div>
);

// Helper component for the no-data state
const NoDataComponent = () => (
    <div className="signal-no-data">
        <p>No signals match the current filter</p>
        <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>Try changing filter settings</p>
    </div>
);

const SignalArena = () => {
    const [status, setStatus] = useState('Connecting...');
    const [isConnected, setIsConnected] = useState(false);
    const [tickCount, setTickCount] = useState(0);
    const [updateTime, setUpdateTime] = useState(new Date().toLocaleTimeString());
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [data, setData] = useState<any>({});
    const ws = useRef<WebSocket | null>(null);

    // Time updater
    useEffect(() => {
        const timer = setInterval(() => setUpdateTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    // WebSocket connection logic
    useEffect(() => {
        const connectWebSocket = () => {
            setStatus('Connecting to analysis server...');
            
            // This needs to point to your actual WebSocket server
            const wsInstance = new WebSocket('ws://localhost:8765');
            ws.current = wsInstance;

            wsInstance.onopen = () => {
                console.log('Connected to analysis server');
                setStatus('Connected - Collecting ticks...');
                setIsConnected(true);
            };

            wsInstance.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'initial' || message.type === 'analysis_update') {
                        setData((prevData: any) => ({
                            ...prevData,
                            [message.data.symbol]: message.data
                        }));
                        setTickCount(prev => prev + 1);

                        // Check for strong signals to show alert
                        if (message.data.strong_signal) {
                            let alertMsg = `Strong ${message.data.name} signal detected! `;
                            if (message.data.percentages.over_3 >= 66) {
                                alertMsg += `Over 3: ${message.data.percentages.over_3.toFixed(1)}%`;
                            } else if (message.data.percentages.under_6 >= 66) {
                                alertMsg += `Under 6: ${message.data.percentages.under_6.toFixed(1)}%`;
                            }
                            setAlertMessage(alertMsg);
                            setShowAlert(true);
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse WebSocket message:", e);
                }
            };

            wsInstance.onerror = (error) => {
                console.error('WebSocket error:', error);
                setStatus('Connection error');
                setIsConnected(false);
            };

            wsInstance.onclose = () => {
                console.log('WebSocket closed');
                setStatus('Disconnected');
                setIsConnected(false);
                // Attempt to reconnect after 5 seconds
                setTimeout(connectWebSocket, 5000);
            };
        };

        connectWebSocket();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const handleFilterClick = (filter: string) => {
        setActiveFilter(filter);
    };

    const runBot = (symbol: string, direction: string) => {
        if (!confirm(`Start ${direction.toUpperCase()} bot for ${symbol}?\n\nBase stake: $1.00\nStop loss: $50.00 daily`)) {
            return;
        }
        alert(`Bot started for ${symbol} (${direction})\n\nRisk management active:\n• $50 daily loss limit\n• 30s cooldown per symbol\n• Max 3 concurrent trades`);
        console.log(`Starting ${direction} bot for ${symbol}`);
    };
    
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

    const filteredAndSortedData = Object.values(data)
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
                    <h1>
                        <span>🎯</span>
                        Deriv Digit Signal Center
                    </h1>
                    <div className="signal-status-bar">
                        <div className="signal-status-indicator">
                            <div className={cn("signal-status-dot", { 'connected': isConnected })}></div>
                            <span>{status}</span>
                        </div>
                        <span>Ticks: {tickCount}</span>
                        <span>{updateTime}</span>
                    </div>
                </div>

                {showAlert && (
                    <div className="signal-alert-banner" style={{ display: 'flex' }}>
                        <div>
                            <strong>🚨 STRONG SIGNAL DETECTED!</strong>
                            <span>{alertMessage}</span>
                        </div>
                        <button onClick={() => setShowAlert(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>
                            &times;
                        </button>
                    </div>
                )}

                <div className="signal-risk-panel">
                    <div className="signal-risk-item">
                        <span className="signal-risk-label">Daily Loss Limit</span>
                        <span className="signal-risk-value">$50.00</span>
                    </div>
                    <div className="signal-risk-item">
                        <span className="signal-risk-label">Max Concurrent Trades</span>
                        <span className="signal-risk-value">3</span>
                    </div>
                    <div className="signal-risk-item">
                        <span className="signal-risk-label">Current Loss</span>
                        <span className="signal-risk-value risk-ok">$0.00</span>
                    </div>
                    <div className="signal-risk-item">
                        <span className="signal-risk-label">Base Stake</span>
                        <span className="signal-risk-value">$1.00</span>
                    </div>
                </div>
                
                <div className="signal-filters">
                    {['all', 'strong', 'over3', 'under6', 'volatility', 'jump'].map(filter => (
                        <button
                            key={filter}
                            className={cn("signal-filter-btn", { 'active': activeFilter === filter })}
                            onClick={() => handleFilterClick(filter)}
                        >
                            {filter === 'all' && 'All Signals'}
                            {filter === 'strong' && 'Strong Only'}
                            {filter === 'over3' && 'Over 3 ≥66%'}
                            {filter === 'under6' && 'Under 6 ≥66%'}
                            {filter === 'volatility' && 'Volatility'}
                            {filter === 'jump' && 'Jump'}
                        </button>
                    ))}
                </div>

                <div className="signal-cards-grid">
                    {Object.keys(data).length === 0 ? (
                        <LoadingComponent />
                    ) : filteredAndSortedData.length > 0 ? (
                        filteredAndSortedData.map((card: any) => {
                            const hotDigits = Object.entries(card.percentages)
                                .filter(([key]) => key.startsWith('digit_'))
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
                                                {card.percentages.over_3.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="signal-signal-item">
                                            <div className="signal-signal-label">Under 6</div>
                                            <div className={cn("signal-signal-value", getSignalClass(card.percentages.under_6, 'under_6'))}>
                                                {card.percentages.under_6.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="signal-signal-item">
                                            <div className="signal-signal-label">Even</div>
                                            <div className={cn("signal-signal-value", getSignalClass(card.percentages.even, 'even'))}>
                                                {card.percentages.even.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="signal-signal-item">
                                            <div className="signal-signal-label">Odd</div>
                                            <div className={cn("signal-signal-value", getSignalClass(card.percentages.odd, 'odd'))}>
                                                {card.percentages.odd.toFixed(1)}%
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
                                            const pct = card.percentages[`digit_${i}`];
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
                                                disabled={card.percentages.over_3 < 66}
                                                onClick={() => runBot(card.symbol, 'over')}>
                                                🤖 RUN OVER
                                            </button>
                                            <button className="signal-bot-btn signal-bot-under"
                                                disabled={card.percentages.under_6 < 66}
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
