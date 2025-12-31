'use client';
import { useState, useEffect, useRef } from 'react';

const WS_URL = "ws://localhost:8765";

const LocoSignals = () => {
    const [status, setStatus] = useState({ message: 'Connecting...', class: 'disconnected' });
    const [signals, setSignals] = useState<any[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const notified = useRef(new Set());

    useEffect(() => {
        const savedSoundState = localStorage.getItem("soundEnabled");
        if (savedSoundState === "true") {
            setSoundEnabled(true);
        }

        const sendNotification = (title: string, body: string) => {
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification(title, { body, icon: "https://deriv.com/static/favicons/favicon-32x32.png" });
            }
        }

        const speakSignal = (name: string, type: string) => {
            if (!soundEnabled || !('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            const text = `Strong signal have been found, the ${name} and the trade type ${type}`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
            setTimeout(() => window.speechSynthesis.cancel(), 30000);
        }

        const connectWebSocket = () => {
            ws.current = new WebSocket(WS_URL);
            ws.current.onopen = () => setStatus({ message: '🔴 LIVE - Connected', class: 'connected' });
            ws.current.onclose = () => {
                setStatus({ message: 'Disconnected. Retrying...', class: 'disconnected' });
                setTimeout(connectWebSocket, 3000);
            };
            ws.current.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.data) {
                    const sortedData = msg.data.sort((a: any, b: any) => {
                        const maxA = Math.max(a.over3, a.under6);
                        const maxB = Math.max(b.over3, b.under6);
                        return maxB - maxA;
                    });

                    sortedData.forEach((i: any) => {
                        const strong = i.over3 >= 66 || i.under6 >= 66;
                        if (strong && !notified.current.has(i.symbol)) {
                            const type = i.over3 >= 66 ? "Over" : "Under";
                            sendNotification("🚨 Strong Signal: " + i.name, `Over 3: ${i.over3}% | Under 6: ${i.under6}%`);
                            speakSignal(i.name, type);
                            notified.current.add(i.symbol);
                            setTimeout(() => notified.current.delete(i.symbol), 60000);
                        }
                    });

                    setSignals(sortedData);
                }
            };
        };

        if ("Notification" in window) {
            Notification.requestPermission();
        }

        connectWebSocket();

        return () => ws.current?.close();
    }, [soundEnabled]);

    const handleSoundToggle = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        localStorage.setItem("soundEnabled", String(newState));
    };
    
    const executeTrade = (sym: string, type: 'over' | 'under', name: string) => {
        if (!confirm(`⚠️ Execute ${type.toUpperCase()} trade on ${name}?\n\nREAL trade will be placed.`)) return;
        ws.current?.send(JSON.stringify({ action: "trade", symbol: sym, type, name }));
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', background: '#121212', color: '#e0e0e0', padding: '8px', margin: '0' }}>
            <style jsx global>{`
                .loco-signals-body {
                    font-family: Arial, sans-serif;
                    background: #121212;
                    color: #e0e0e0;
                    margin: 0;
                    padding: 8px;
                }
                .loco-signals h1 { text-align: center; color: #00ffaa; font-size: 1.3em; margin: 8px 0; }
                .loco-signals .status { text-align: center; font-size: .85em; margin-bottom: 12px; padding: 8px; border-radius: 6px; }
                .loco-signals .connected { background: #004400; color: #00ffaa; }
                .loco-signals .disconnected { background: #440000; color: #ff6666; }
                .loco-signals .warning { background: #663300; color: #ffaa00; }
                .loco-signals .container { display: flex; flex-direction: column; gap: 12px; }
                .loco-signals .card { background: #1e1e1e; border-radius: 10px; padding: 12px; border: 1px solid #333; }
                .loco-signals .title { color: #00ffaa; text-align: center; font-size: 1em; margin: 0 0 8px; font-weight: bold; }
                .loco-signals .symbol { font-size: .8em; color: #aaa; }
                .loco-signals .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
                .loco-signals .stat { background: #2a2a2a; padding: 8px; border-radius: 6px; text-align: center; }
                .loco-signals .stat strong { display: block; font-size: 1.4em; }
                .loco-signals .strong { color: #ff4444; }
                .loco-signals .moderate { color: #ffaa00; }
                .loco-signals .weak { color: #ccc; }
                .loco-signals table { width: 100%; border-collapse: collapse; font-size: .85em; margin-top: 8px; }
                .loco-signals td { padding: 6px; text-align: center; border: 1px solid #444; }
                .loco-signals .hot { background: #ff444440 !important; font-weight: bold; animation: pulse 1.5s infinite; }
                .loco-signals .warm { background: #ffaa0040; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: .6; } 100% { opacity: 1; } }
                .loco-signals .alert { background: #ff4444; color: #fff; padding: 8px; border-radius: 6px; text-align: center; font-weight: bold; margin-bottom: 8px; animation: blink 1s infinite alternate; }
                @keyframes blink { from { opacity: 1; } to { opacity: .7; } }
                .loco-signals .conf-high { color: #ff4444; }
                .loco-signals .conf-med { color: #ffaa00; }
                .loco-signals .conf-low { color: #44ff44; }
                .loco-signals .bot-buttons { display: flex; gap: 8px; justify-content: center; margin-top: 10px; }
                .loco-signals .bot-btn { color: #fff; border: none; padding: 10px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; }
                .loco-signals .bot-btn.over { background: #00aa00; }
                .loco-signals .bot-btn.under { background: #aa0000; }
                .loco-signals .update { text-align: center; color: #00ffaa; font-size: .75em; }
                .loco-signals footer { text-align: center; margin: 20px 0 10px; color: #666; font-size: .75em; }
                @media (max-width: 480px) {
                    .loco-signals .stats { grid-template-columns: repeat(2, 1fr); }
                    .loco-signals .bot-buttons { flex-direction: column; }
                    .loco-signals .bot-btn { width: 100%; text-align: center; }
                }
            `}</style>
            <div className="loco-signals">
                <h1>LOCO SIGNALS</h1>
                <div id="status" className={`status ${status.class}`}>{status.message}</div>

                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <label style={{ color: '#00ffaa', cursor: 'pointer', fontSize: '0.9em', background: '#222', padding: '8px 15px', borderRadius: '20px', border: '1px solid #333' }}>
                        <input type="checkbox" id="soundToggle" checked={soundEnabled} onChange={handleSoundToggle} /> 🔊 Enable Voice Alerts
                    </label>
                </div>

                <div className="container" id="container">
                    {signals.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                            <h2>⏳ Waiting for market data...</h2>
                            <p>Connecting to local server. Please ensure your Python signal server is running.</p>
                        </div>
                    ) : (
                        signals.map(i => <SignalCard key={i.symbol} i={i} executeTrade={executeTrade} />)
                    )}
                </div>

                <footer>
                    🤖 Run Bot only on STRONG signals (≥66%) • Sorted: Strong → Moderate → Weak<br />
                    Full risk management • Live 500-tick analysis
                </footer>
            </div>
        </div>
    );
};

const SignalCard = ({ i, executeTrade }: { i: any, executeTrade: (sym: string, type: 'over' | 'under', name: string) => void }) => {
    const strong = i.over3 >= 66 || i.under6 >= 66;

    const calculateConfidence = (i: any) => {
        let s = 0, r = [];
        if (i.over3 >= 66) { s += 35; r.push("Strong Over 3") }
        else if (i.over3 >= 61) s += 15;
        if (i.under6 >= 66) { s += 35; r.push("Strong Under 6") }
        else if (i.under6 >= 61) s += 15;
        if (Math.abs(i.even - 50) >= 6) { s += 20; r.push("Strong Even/Odd") }
        if (i.p_value < .01) { s += 25; r.push("Strong Bias") }
        else if (i.p_value < .05) s += 10;
        const m = Math.max(...i.digits);
        if (m >= 14) { s += 20; r.push(`Hot Digit ${m.toFixed(1)}%`) }
        s = Math.min(100, s);
        let c = "conf-low";
        if (s >= 70) c = "conf-high"; else if (s >= 40) c = "conf-med";
        return { score: s, confClass: c, reasons: r.join(" • ") };
    }

    const signalClass = (v: number, b = 60) => {
        if (b === 60) return v >= 66 ? "strong" : v >= 61 ? "moderate" : "weak";
        const d = Math.abs(v - 50);
        return d >= 6 ? "strong" : d >= 3 ? "moderate" : "weak";
    }

    const conf = calculateConfidence(i);
    let hot = 0;

    return (
        <div className="card">
            {strong && <div className="alert">🚨 STRONG SIGNAL</div>}
            <div className="title">{i.name}<span className="symbol"> ({i.symbol})</span></div>
            <div className="stats">
                <div className="stat"><strong className={signalClass(i.over3)}>{i.over3.toFixed(1)}%</strong>O3</div>
                <div className="stat"><strong className={signalClass(i.under6)}>{i.under6.toFixed(1)}%</strong>U6</div>
                <div className="stat"><strong className={signalClass(i.even, 50)}>{i.even.toFixed(1)}%</strong>E</div>
                <div className="stat"><strong className={signalClass(100 - i.even, 50)}>{(100 - i.even).toFixed(1)}%</strong>O</div>
            </div>
            <div className={`confidence ${conf.confClass}`} style={{textAlign: 'center', marginTop: '4px'}}>📊 Confidence: {conf.score}%</div>
            {conf.score >= 30 && <div style={{ textAlign: 'center', fontSize: '.8em', color: '#aaa' }}>{conf.reasons}</div>}
            <table>
                <tbody>
                    <tr>
                        {i.digits.map((p: number, index: number) => {
                            let cls = "";
                            if (p >= 14) { cls = "hot"; hot++; }
                            else if (p > 11) cls = "warm";
                            return <td key={index} className={cls}>{p.toFixed(1)}%</td>;
                        })}
                    </tr>
                </tbody>
            </table>
            {hot > 0 && <div style={{ textAlign: 'center', color: '#ff4444', fontSize: '.8em' }}>{hot} Hot Digit(s)</div>}
            {strong && (
                <div className="bot-buttons">
                    {i.over3 >= 66 && <button className="bot-btn over" onClick={() => executeTrade(i.symbol, 'over', i.name)}>🤖 RUN OVER BOT</button>}
                    {i.under6 >= 66 && <button className="bot-btn under" onClick={() => executeTrade(i.symbol, 'under', i.name)}>🤖 RUN UNDER BOT</button>}
                </div>
            )}
            <div className="update">Live • {new Date().toLocaleTimeString()}</div>
        </div>
    );
}


export default LocoSignals;
