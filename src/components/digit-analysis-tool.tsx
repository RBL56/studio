
'use client';

import React from 'react';
import { Button } from './ui/button';
import { useDigitAnalysis } from '@/context/digit-analysis-context';
import { Input } from './ui/input';
import { Label } from './ui/label';

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
        ticksToFetch,
        setTicksToFetch,
        maxTicks
    } = useDigitAnalysis();

    return (
        <div className="digit-analysis-container">
            <div className="digit-analysis-main-card">
                <div className={`digit-analysis-connection-status status-${status}`}>
                    <div className="status-dot"></div>
                    <div>{statusMessage}</div>
                </div>

                {isCollecting && (
                    <div className="collection-info">
                        <div className="loading"></div>Collecting historical ticks... <span>{collectedCount}</span>/{ticksToFetch}
                    </div>
                )}
                
                <div className="digit-analysis-controls">
                    <Button onClick={connect} disabled={status !== 'disconnected'} className="w-full">
                        {status === 'connecting' ? <><div className="loading"></div>Connecting...</> : 'Connect'}
                    </Button>
                    <Button onClick={disconnect} disabled={status === 'disconnected'} variant="destructive" className="w-full">Disconnect</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                    <div className="digit-analysis-stat-box">
                        <div className="digit-analysis-stat-value">{price}</div>
                        <div className="digit-analysis-stat-label">Current Price</div>
                    </div>
                     <div className="digit-analysis-stat-box">
                        <div className="digit-analysis-stat-value">{tickCount}/{ticksToFetch}</div>
                        <div className="digit-analysis-stat-label">Historical Ticks</div>
                    </div>
                </div>

                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${(tickCount / ticksToFetch) * 100}%` }}></div>
                </div>

                <div className="info-note">
                    First collects historical ticks, then continues with real-time updates
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

                <div className="mt-4">
                    <Label htmlFor="ticks-input">Ticks to Fetch (Max: {maxTicks})</Label>
                    <Input
                        id="ticks-input"
                        type="number"
                        value={ticksToFetch}
                        onChange={(e) => setTicksToFetch(Math.min(Number(e.target.value), maxTicks))}
                        className="mt-1"
                        disabled={status !== 'disconnected'}
                    />
                </div>
            </div>
            
            <div className="digit-analysis-main-card">
                <div className="digit-analysis-card-title">Digit Distribution (Last {ticksToFetch} Ticks)</div>
                <div className="digits-grid">
                    {digitStats.map((stat, i) => {
                        const p = parseFloat(stat.percentage);
                        let barColor;
                        if (p >= 12) barColor = '#ef4444';
                        else if (p >= 10.5) barColor = '#f59e0b';
                        else if (p >= 9.5) barColor = '#22c55e';
                        else if (p >= 8) barColor = '#60a5fa';
                        else barColor = '#8b5cf6';

                        let boxClass = '';
                        if (i === Number(analysis.most)) boxClass = 'most-frequent';
                        if (i === Number(analysis.least)) boxClass = 'least-frequent';
                        if (i === Number(analysis.secondMost)) boxClass = 'second-most-frequent';
                        if (i === activeDigit) boxClass += ' active-digit';
                        if (i === 0) boxClass += ' digit-zero';


                        return (
                            <div key={i} className={`digit-box ${boxClass}`}>
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
                        <div className="summary-value" style={{ color: '#22c55e', fontWeight: 'bold' }}>{analysis.most}</div>
                    </div>
                    <div className="summary-box">
                        <div className="summary-label">Least Frequent</div>
                        <div className="summary-value" style={{ color: '#ef4444', fontWeight: 'bold' }}>{analysis.least}</div>
                    </div>
                    <div className="summary-box">
                        <div className="summary-label">Second Most Frequent</div>
                        <div className="summary-value" style={{ color: '#3b82f6', fontWeight: 'bold' }}>{analysis.secondMost}</div>
                    </div>
                    <div className="summary-box">
                        <div className="summary-label">Average %</div>
                        <div className="summary-value">{analysis.avg}</div>
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
                Real-time Deriv API Connection • Analysis based on last {ticksToFetch} historical ticks + real-time updates<br />
                Digit 0 is included in even numbers calculation • Technical Differences Fixed
            </div>
        </div>
    );
}
