'use client';

import React, { useState, useEffect, useRef } from 'react';

// Interfaces for data structures
interface SignalData {
    symbol: string;
    name: string;
    over3: number;
    under6: number;
    p_value: number;
    digits: number[];
    even: number;
}

interface Confidence {
    score: number;
    confClass: string;
    reasons: string;
}

const LocoSignals: React.FC = () => {
    const [signals, setSignals] = useState<SignalData[]>([]);
    const [status, setStatus] = useState({ text: 'Connecting...', className: 'disconnected' });
    const [isSoundEnabled, setIsSoundEnabled] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const notified = useRef(new Set<string>());

    useEffect(() => {
        // Load sound preference from local storage
        const soundPref = localStorage.getItem('soundEnabled') === 'true';
        setIsSoundEnabled(soundPref);

        // Notification permission
        if ('Notification' in window) {
            Notification.requestPermission();
        }

        const connectWebSocket = () => {
            ws.current = new WebSocket("ws://localhost:8765");

            ws.current.onopen = () => {
                setStatus({ text: '🔴 LIVE - Connected', className: 'connected' });
            };

            ws.current.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.data) {
                        setSignals(msg.data);
                    }
                } catch (error) {
                    console.error("Failed to parse WebSocket message:", error);
                }
            };

            ws.current.onclose = () => {
                setStatus({ text: 'Disconnected. Reconnecting...', className: 'disconnected' });
                setTimeout(connectWebSocket, 3000);
            };

            ws.current.onerror = () => {
                setStatus({ text: 'Connection Error', className: 'disconnected' });
                ws.current?.close();
            };
        };

        connectWebSocket();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const handleSoundToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        setIsSoundEnabled(checked);
        localStorage.setItem('soundEnabled', String(checked));
    };
    
    const sendNotification = (title: string, body: string) => {
        if ('Notification' in window && Notification.permission === "granted") {
            new Notification(title, { body, icon: "https://deriv.com/static/favicons/favicon-32x32.png" });
        }
    };

    const speakSignal = (name: string, type: string) => {
        if (!isSoundEnabled || !('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();
        const text = `Strong signal found on ${name}. Trade type: ${type}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);

        setTimeout(() => window.speechSynthesis.cancel(), 30000);
    };
    
    const signalClass = (value: number, base: number = 60): string => {
        if (base === 60) { // For Over/Under
            return value >= 66 ? "strong" : value >= 61 ? "moderate" : "weak";
        }
        // For Even/Odd
        const diff = Math.abs(value - 50);
        return diff >= 6 ? "strong" : diff >= 3 ? "moderate" : "weak";
    };
    
    const getPValueInterpretation = (p: number) => {
        if (p < 0.01) return 'Strong Bias';
        if (p < 0.05) return 'Bias Detected';
        return 'Fair (Uniform)';
    };

    const calculateConfidence = (i: SignalData): Confidence => {
        let score = 0;
        const reasons: string[] = [];

        if (i.over3 >= 66) { score += 35; reasons.push("Strong Over 3"); }
        else if (i.over3 >= 61) score += 15;

        if (i.under6 >= 66) { score += 35; reasons.push("Strong Under 6"); }
        else if (i.under6 >= 61) score += 15;

        if (Math.abs(i.even - 50) >= 6) { score += 20; reasons.push("Strong Even/Odd"); }

        if (i.p_value < 0.01) { score += 25; reasons.push("Strong Bias"); }
        else if (i.p_value < 0.05) score += 10;
        
        const hotDigit = i.digits.some(d => d >= 14);
        if (hotDigit) { score += 20; reasons.push(`Hot Digit`); }

        score = Math.min(100, score);

        let confClass = "conf-low"; // green
        if (score >= 70) confClass = "conf-high"; // red
        else if (score >= 40) confClass = "conf-med"; // orange

        return { score, confClass, reasons: reasons.join(" • ") };
    };

    const executeTrade = (symbol: string, type: string, name: string) => {
        if (confirm(`⚠️ Execute ${type.toUpperCase()} trade on ${name}?\n\nThis will send a command to your local bot.`)) {
            ws.current?.send(JSON.stringify({ action: "trade", symbol, type, name }));
        }
    };
    
    const sortedSignals = [...signals].sort((a, b) => {
        const maxA = Math.max(a.over3, a.under6);
        const maxB = Math.max(b.over3, b.under6);
        return maxB - maxA;
    });

    const renderCard = (i: SignalData) => {
        const isStrongSignal = i.over3 >= 66 || i.under6 >= 66;
        if (isStrongSignal && !notified.current.has(i.symbol)) {
            const type = i.over3 >= 66 ? "Over" : "Under";
            sendNotification(`🚨 Strong Signal: ${i.name}`, `Over 3: ${i.over3}% | Under 6: ${i.under6}%`);
            speakSignal(i.name, type);
            notified.current.add(i.symbol);
            setTimeout(() => notified.current.delete(i.symbol), 60000);
        }

        const confidence = calculateConfidence(i);
        const hotDigitsCount = i.digits.filter(p => p >= 14).length;
        const pValueInterpretation = getPValueInterpretation(i.p_value);

        return (
            <div className="card" key={i.symbol}>
                {isStrongSignal && <div className="alert">🚨 STRONG SIGNAL</div>}
                <div className="title">{i.name}<span className="symbol"> ({i.symbol})</span></div>
                
                <div className="stats">
                    <div className="stat"><strong className={signalClass(i.over3)}>{i.over3.toFixed(1)}%</strong>O3</div>
                    <div className="stat"><strong className={signalClass(i.under6)}>{i.under6.toFixed(1)}%</strong>U6</div>
                    <div className="stat"><strong className={signalClass(i.even, 50)}>{i.even.toFixed(1)}%</strong>E</div>
                    <div className="stat"><strong className={signalClass(100 - i.even, 50)}>{(100 - i.even).toFixed(1)}%</strong>O</div>
                </div>

                <div className={`confidence ${confidence.confClass}`}>
                    📊 Confidence: {confidence.score}%
                </div>
                {confidence.score >= 30 && <div className="reasons">{confidence.reasons}</div>}
                
                <div className="bias-info">
                   p-value: {i.p_value.toFixed(4)} ({pValueInterpretation})
                </div>

                <table>
                    <tbody>
                        <tr>
                            {i.digits.map((p, index) => {
                                let cls = "";
                                if (p >= 14) cls = "hot";
                                else if (p > 11) cls = "warm";
                                return <td key={index} className={cls}>{p.toFixed(1)}%</td>;
                            })}
                        </tr>
                    </tbody>
                </table>
                {hotDigitsCount > 0 && <div className="hot-digit-count">{hotDigitsCount} Hot Digit(s)</div>}
                
                {isStrongSignal && (
                     <div className="bot-buttons">
                        {i.over3 >= 66 && <button className="bot-btn over" onClick={() => executeTrade(i.symbol, 'over', i.name)}>🤖 RUN OVER BOT</button>}
                        {i.under6 >= 66 && <button className="bot-btn under" onClick={() => executeTrade(i.symbol, 'under', i.name)}>🤖 RUN UNDER BOT</button>}
                    </div>
                )}
               
                <div className="update">Live • {new Date().toLocaleTimeString()}</div>
            </div>
        );
    };

    return (
        <>
            <style jsx global>{`
                .loco-signals-body {
                    font-family: Arial, sans-serif;
                    background: #121212;
                    color: #e0e0e0;
                    margin: 0;
                    padding: 8px;
                }
                .loco-signals-h1 {
                    text-align: center;
                    color: #00ffaa;
                    font-size: 1.3em;
                    margin: 8px 0;
                }
                .status-header {
                    text-align: center;
                    font-size: .85em;
                    margin-bottom: 12px;
                    padding: 8px;
                    border-radius: 6px;
                }
                .status-header.connected { background: #004400; color: #00ffaa; }
                .status-header.disconnected { background: #440000; color: #ff6666; }
                
                .sound-toggle-label {
                    color: #00ffaa;
                    cursor: pointer;
                    font-size: 0.9em;
                    background: #222;
                    padding: 8px 15px;
                    border-radius: 20px;
                    border: 1px solid #333;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .loco-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 12px;
                }
                .card {
                    background: #1e1e1e;
                    border-radius: 10px;
                    padding: 12px;
                    border: 1px solid #333;
                }
                .title {
                    color: #00ffaa;
                    text-align: center;
                    font-size: 1em;
                    margin: 0 0 8px;
                    font-weight: bold;
                }
                .symbol { font-size: .8em; color: #aaa; }
                .stats {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 6px;
                }
                .stat {
                    background: #2a2a2a;
                    padding: 8px;
                    border-radius: 6px;
                    text-align: center;
                }
                .stat strong { display: block; font-size: 1.4em; }
                .strong { color: #ff4444; }
                .moderate { color: #ffaa00; }
                .weak { color: #ccc; }
                
                .loco-signals-body table { width: 100%; border-collapse: collapse; font-size: .85em; margin-top: 8px; }
                .loco-signals-body td { padding: 6px; text-align: center; border: 1px solid #444; }
                .hot { background: #ff444440 !important; font-weight: bold; animation: pulse 1.5s infinite; }
                .warm { background: #ffaa0040; }
                
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: .6; } 100% { opacity: 1; } }
                
                .alert { background: #ff4444; color: #fff; padding: 8px; border-radius: 6px; text-align: center; font-weight: bold; margin-bottom: 8px; animation: blink 1s infinite alternate; }
                
                @keyframes blink { from { opacity: 1; } to { opacity: .7; } }
                
                .confidence { font-size: .9em; text-align: center; font-weight: bold; margin-top: 8px; }
                .reasons { text-align: center; font-size: .8em; color: #aaa; margin-top: 4px; }
                .bias-info { text-align: center; font-size: .8em; color: #00ffaa; margin-top: 4px; }
                .hot-digit-count { text-align:center; color:#ff4444; font-size:.8em; margin-top: 4px; }
                
                .conf-high { color: #ff4444; }
                .conf-med { color: #ffaa00; }
                .conf-low { color: #44ff44; }
                
                .bot-buttons { display: flex; gap: 8px; justify-content: center; margin-top: 10px; }
                .bot-btn { color: #fff; border: none; padding: 10px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; flex-grow: 1; }
                .bot-btn.over { background: #00aa00; }
                .bot-btn.under { background: #aa0000; }
                
                .update { text-align: center; color: #00ffaa; font-size: .75em; margin-top: 8px; }
                
                .loco-signals-footer { text-align: center; margin: 20px 0 10px; color: #666; font-size: .75em; }

                /* Responsive */
                @media (max-width: 480px) {
                    .stats { grid-template-columns: repeat(2, 1fr); }
                    .bot-buttons { flex-direction: column; }
                }
            `}</style>
            <div className="loco-signals-body">
                <h1 className="loco-signals-h1">LOCO SIGNALS</h1>
                <div id="status" className={`status-header ${status.className}`}>{status.text}</div>

                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <label className="sound-toggle-label">
                        <input type="checkbox" checked={isSoundEnabled} onChange={handleSoundToggle} />
                        🔊 Enable Voice Alerts
                    </label>
                </div>

                <div className="loco-container" id="container">
                    {sortedSignals.length > 0 ? (
                        sortedSignals.map(signal => renderCard(signal))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666', gridColumn: '1 / -1' }}>
                            <h2>⏳ Waiting for market data...</h2>
                            <p>Collecting ticks from local server... Please ensure your Python script is running.</p>
                        </div>
                    )}
                </div>

                <footer className="loco-signals-footer">
                    🤖 Run Bot only on STRONG signals (≥66%) • Sorted: Strong → Moderate → Weak<br />
                    Full risk management • Live 500-tick analysis
                </footer>
            </div>
        </>
    );
};

export default LocoSignals;
