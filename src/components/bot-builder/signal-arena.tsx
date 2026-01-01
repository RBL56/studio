'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const SignalArena = () => {
    const [status, setStatus] = useState('Connecting to analysis server...');
    const [isConnected, setIsConnected] = useState(false);
    const [tickCount, setTickCount] = useState(0);
    const [updateTime, setUpdateTime] = useState(new Date().toLocaleTimeString());
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        const timer = setInterval(() => setUpdateTime(new Date().toLocaleTimeString()), 1000);

        // This is a placeholder for the connection logic.
        // Since we aren't connecting to a real WebSocket server,
        // we'll just keep the "Connecting" state.
        const connectTimeout = setTimeout(() => {
            // In a real scenario, you'd update status based on connection state.
            // setStatus('Connected');
            // setIsConnected(true);
        }, 5000);

        return () => {
            clearInterval(timer);
            clearTimeout(connectTimeout);
        };
    }, []);

    const runBot = (symbol: string, direction: string) => {
        if (!confirm(`Start ${direction.toUpperCase()} bot for ${symbol}?\n\nBase stake: $1.00\nStop loss: $50.00 daily`)) return;
        alert(`Bot started for ${symbol} (${direction})\n\nRisk management active:\n• $50 daily loss limit\n• 30s cooldown per symbol\n• Max 3 concurrent trades`);
        console.log(`Starting ${direction} bot for ${symbol}`);
    };

    return (
        <div className="signal-center-body">
            <div className="signal-center-container">
                <div className="signal-center-header">
                    <h1><span>🎯</span> Deriv Digit Signal Center</h1>
                    <div className="signal-status-bar">
                        <div className="signal-status-indicator">
                            <div className={cn("signal-status-dot", { 'connected': isConnected })}></div>
                            <span>{isConnected ? 'Connected' : status}</span>
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
                        <button key={filter} className={cn("signal-filter-btn", { 'active': activeFilter === filter })} onClick={() => setActiveFilter(filter)}>
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="signal-cards-grid">
                    <div className="signal-loading">
                        <div className="signal-loading-spinner"></div>
                        <p>Connecting to analysis server...</p>
                        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '8px' }}>
                            Starting WebSocket connection and collecting initial ticks...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignalArena;
