'use client';

import React from 'react';
import { Button } from './ui/button';
import { useDigitAnalysis } from '@/context/digit-analysis-context';

export const MAX_TICKS = 1000;

export function DigitAnalysisTool() {
    const {
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
    } = useDigitAnalysis();

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
