'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDerivApi } from '@/context/deriv-api-context';
import { VOLATILITY_MARKETS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AnalysisPage() {
  const { api, isConnected: isApiConnected } = useDerivApi();
  const { toast } = useToast();

  const [market, setMarket] = useState('R_100');
  const [ticks, setTicks] = useState<{ price: number; digit: number }[]>([]);
  const [currentPrice, setCurrentPrice] = useState<string>('--');
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const [percentages, setPercentages] = useState<number[]>(Array(10).fill(0));
  const [evenPercentage, setEvenPercentage] = useState(0);
  const [oddPercentage, setOddPercentage] = useState(0);

  const [overallVol, setOverallVol] = useState({ value: '--', className: '' });
  const [digitVol, setDigitVol] = useState({ value: '--', className: '' });
  const [evenOddVol, setEvenOddVol] = useState({ value: '--', className: '' });
  const [mostVolatile, setMostVolatile] = useState('- (0.0%)');
  const [mostFrequent, setMostFrequent] = useState('-');

  const mostRecentDigit = ticks[0]?.digit;

  const digitBoxesRef = useRef<(HTMLDivElement | null)[]>([]);

  const MAX_TICKS = 1000;

  const updateVolatility = useCallback((percentages: number[], evenPercent: number, oddPercent: number) => {
    if (percentages.length === 0 || percentages.every(p => p === 0)) {
        setOverallVol({ value: '--', className: '' });
        setDigitVol({ value: '--', className: '' });
        setEvenOddVol({ value: '--', className: '' });
        setMostVolatile('- (0.0%)');
        return;
    }

    const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const variance = percentages.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / percentages.length;
    const stdDev = Math.sqrt(variance);

    let overallVolValue, overallClass;
    if (stdDev > 4.0) {
        overallVolValue = 'High';
        overallClass = 'vol-high';
    } else if (stdDev > 2.5) {
        overallVolValue = 'Medium';
        overallClass = 'vol-medium';
    } else {
        overallVolValue = 'Low';
        overallClass = 'vol-low';
    }
    setOverallVol({ value: overallVolValue, className: overallClass });

    const range = Math.max(...percentages) - Math.min(...percentages);
    let digitVolValue, digitClass;
    if (range > 9) {
        digitVolValue = 'High';
        digitClass = 'vol-high';
    } else if (range > 6) {
        digitVolValue = 'Medium';
        digitClass = 'vol-medium';
    } else {
        digitVolValue = 'Low';
        digitClass = 'vol-low';
    }
    setDigitVol({ value: digitVolValue, className: digitClass });

    const evenOddDiff = Math.abs(evenPercent - oddPercent);
    let evenOddVolValue, evenOddClass;
    if (evenOddDiff > 8) {
        evenOddVolValue = 'High';
        evenOddClass = 'vol-high';
    } else if (evenOddDiff > 4) {
        evenOddVolValue = 'Medium';
        evenOddClass = 'vol-medium';
    } else {
        evenOddVolValue = 'Low';
        evenOddClass = 'vol-low';
    }
    setEvenOddVol({ value: evenOddVolValue, className: evenOddClass });
  }, []);

  const renderStats = useCallback((currentTicks: { price: number; digit: number }[]) => {
    const digitCounts = Array(10).fill(0);
    currentTicks.forEach(tick => {
        if (tick.digit >= 0 && tick.digit <= 9) {
            digitCounts[tick.digit]++;
        }
    });

    const totalTicksInWindow = currentTicks.length;
    if (totalTicksInWindow === 0) return;

    const newPercentages = digitCounts.map(count => (count / totalTicksInWindow) * 100);
    setPercentages(newPercentages);

    let maxCount = -1;
    let maxDigit = -1;
    let mostVolatileIndex = -1;
    let highestPercentage = -1;

    newPercentages.forEach((p, i) => {
        if (digitCounts[i] > maxCount) {
            maxCount = digitCounts[i];
            maxDigit = i;
        }
        if (p > highestPercentage) {
            highestPercentage = p;
            mostVolatileIndex = i;
        }
    });

    setMostFrequent(maxDigit > -1 ? maxDigit.toString() : '-');
    setMostVolatile(`${mostVolatileIndex > -1 ? mostVolatileIndex : '-'} (${highestPercentage > -1 ? highestPercentage.toFixed(1) : '0.0'}%)`);

    let evenCount = 0;
    for (let i = 0; i < 10; i += 2) {
        evenCount += digitCounts[i];
    }
    const newEvenPercentage = (evenCount / totalTicksInWindow) * 100;
    const newOddPercentage = 100 - newEvenPercentage;

    setEvenPercentage(newEvenPercentage);
    setOddPercentage(newOddPercentage);
    
    updateVolatility(newPercentages, newEvenPercentage, newOddPercentage);
  }, [updateVolatility]);


  useEffect(() => {
    if (!api || !isApiConnected) {
      if(subscriptionId) {
        api?.send(JSON.stringify({ forget: subscriptionId }));
        setSubscriptionId(null);
      }
      return;
    }

    const subscribe = () => {
      setTicks([]); // Clear previous market ticks

      api.send(JSON.stringify({
          ticks_history: market,
          count: MAX_TICKS,
          end: 'latest',
      }));
      api.send(JSON.stringify({
          ticks: market,
          subscribe: 1,
      }));
    }

    if (subscriptionId) {
      api.send(JSON.stringify({ forget: subscriptionId }), () => {
        subscribe();
      });
    } else {
      subscribe();
    }
    
    const handleMessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.error) {
            console.error('Deriv API error:', data.error.message);
            if (data.error.code !== 'AlreadySubscribed' && data.error.code !== 'ForgetInvalid') {
              toast({
                  variant: "destructive",
                  title: "API Error",
                  description: data.error.message,
              });
            }
            return;
        }
        
        if (data.msg_type === 'history') {
          const historyTicks = data.history.prices.map((price: number) => {
            const priceStr = price.toString();
            return { price, digit: parseInt(priceStr[priceStr.length - 1]) };
          });
          setTicks(prev => [...historyTicks, ...prev].slice(0, MAX_TICKS));
        }

        if (data.msg_type === 'tick') {
            if (data.subscription?.id) {
                setSubscriptionId(data.subscription.id);
            }
            const newTick = data.tick;
            const price = newTick.quote;
            const priceStr = price.toString();
            const digit = parseInt(priceStr[priceStr.length - 1]);
            
            setCurrentPrice(price.toFixed(4));
            setTicks(prev => [{ price, digit }, ...prev].slice(0, MAX_TICKS));
        }
    };

    api.addEventListener('message', handleMessage);

    return () => {
        api.removeEventListener('message', handleMessage);
    };
  }, [api, isApiConnected, market, toast]);

  useEffect(() => {
    if (ticks.length > 0) {
      renderStats(ticks);
    }
  }, [ticks, renderStats]);

  const handleMarketChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (subscriptionId) {
        api?.send(JSON.stringify({ forget: subscriptionId }));
        setSubscriptionId(null);
    }
    setTicks([]);
    setCurrentPrice('--');
    setMarket(e.target.value);
  }

  const getBarColor = (percentage: number) => {
      if (percentage >= 15) return "#ef4444"; // Red
      if (percentage >= 11) return "#f97316"; // Orange
      if (percentage >= 9) return "#eab308"; // Yellow
      return "#22c55e"; // Green
  };

  return (
    <>
      <style jsx global>{`
        .analysis-body {
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
            padding: 12px;
            font-size: 14px;
        }
        .analysis-container {
            max-width: 100%;
            margin: 0 auto;
        }
        .analysis-header {
            text-align: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #334155;
        }
        .analysis-title {
            color: #60a5fa;
            font-size: 1.4rem;
            font-weight: 600;
        }
        .analysis-subtitle {
            color: #94a3b8;
            font-size: .85rem;
            margin-top: 4px;
        }
        .main-card {
            background: #1e293b;
            border-radius: 10px;
            padding: 16px;
            border: 1px solid #334155;
            margin-bottom: 12px;
        }
        .card-title {
            text-align: center;
            color: #60a5fa;
            font-weight: 600;
            margin-bottom: 12px;
            font-size: 1.1rem;
        }
        .stats-row {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 12px;
        }
        .stat-box {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 8px;
            text-align: center;
        }
        .stat-label {
            font-size: .7rem;
            color: #94a3b8;
            margin-top: 2px;
        }
        .stat-value {
            font-size: 1rem;
            color: #60a5fa;
            font-weight: 700;
        }
        .market-select {
            width: 100%;
            background: #0f172a;
            color: #60a5fa;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 8px;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .digits-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-top: 14px;
        }
        .digit-box {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 10px 4px;
            text-align: center;
            transition: all 0.3s ease;
        }
        .digit {
            font-weight: 700;
            color: #60a5fa;
            font-size: 1.1rem;
            margin-bottom: 4px;
        }
        .percentage {
            font-weight: 700;
            font-size: 0.95rem;
            margin-bottom: 4px;
        }
        .bar {
            height: 4px;
            background: #334155;
            border-radius: 3px;
            margin-top: 4px;
            overflow: hidden;
        }
        .fill {
            height: 100%;
            border-radius: 3px;
        }
        .most-frequent {
            border-color: #22c55e !important;
            box-shadow: 0 0 6px rgba(34, 197, 94, .4);
        }
        .active-digit {
            background: rgba(96, 165, 250, .15);
        }
        .eo {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 14px;
        }
        .even {
            background: rgba(34, 197, 94, .1);
            border: 1px solid #22c55e;
            border-radius: 6px;
            text-align: center;
            padding: 12px;
        }
        .odd {
            background: rgba(239, 68, 68, .1);
            border: 1px solid #ef4444;
            border-radius: 6px;
            text-align: center;
            padding: 12px;
        }
        .even-percentage, .odd-percentage {
            font-size: 1.3rem;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .even .even-percentage {
            color: #22c55e;
        }
        .odd .odd-percentage {
            color: #ef4444;
        }
        .volatility-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-top: 12px;
        }
        .vol-item {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
        }
        .vol-label {
            font-size: .75rem;
            color: #94a3b8;
            margin-bottom: 4px;
        }
        .vol-value {
            font-size: 1rem;
            font-weight: 700;
        }
        .vol-high { color: #ef4444; }
        .vol-medium { color: #eab308; }
        .vol-low { color: #22c55e; }
        .footer {
            text-align: center;
            color: #64748b;
            font-size: .75rem;
            margin-top: 12px;
        }
        @media (max-width: 360px) {
            .analysis-body { padding: 8px; font-size: 13px; }
            .main-card { padding: 12px; }
            .stat-value { font-size: 0.9rem; }
            .digit { font-size: 1rem; }
            .percentage { font-size: 0.85rem; }
            .digits-grid { grid-template-columns: repeat(5, 1fr); gap: 6px; }
            .digit-box { padding: 8px 2px; }
        }
        @media (min-width: 768px) {
            .volatility-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
      <div className="analysis-body">
        <div className="analysis-container">
            <div className="analysis-header">
                <div className="analysis-title">Deriv Last Digit Analysis</div>
                <div className="analysis-subtitle">Based on last {MAX_TICKS} ticks</div>
            </div>

            {!isApiConnected && (
              <div className="main-card text-center">
                  <h3 className="text-destructive font-semibold mb-2">Not Connected</h3>
                  <p className="text-muted-foreground text-sm">Please connect your Deriv account using your API token to see live data.</p>
              </div>
            )}
            
            <div className="main-card">
                <div className="card-title">Market Overview</div>
                
                <div className="stats-row">
                    <div className="stat-box">
                        <div className="stat-value" id="price">{currentPrice}</div>
                        <div className="stat-label">Current Price</div>
                    </div>
                    
                    <div className="stat-box">
                        <select id="market" className="market-select" value={market} onChange={handleMarketChange}>
                            <optgroup label="All Markets">
                                {VOLATILITY_MARKETS.map(m => (
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
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div
                            key={i}
                            ref={el => digitBoxesRef.current[i] = el}
                            className={`digit-box ${mostFrequent === i.toString() ? 'most-frequent' : ''} ${mostRecentDigit === i ? 'active-digit' : ''}`}
                        >
                            <div className="digit">{i}</div>
                            <div className="percentage">{percentages[i].toFixed(1)}%</div>
                            <div className="bar">
                                <div
                                    className="fill"
                                    style={{ width: `${Math.min(percentages[i] * 3, 100)}%`, background: getBarColor(percentages[i]) }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="eo">
                    <div className="even">
                        <div className="even-percentage">{evenPercentage.toFixed(1)}%</div>
                        <div className="stat-label">Even</div>
                    </div>
                    <div className="odd">
                        <div className="odd-percentage">{oddPercentage.toFixed(1)}%</div>
                        <div className="stat-label">Odd</div>
                    </div>
                </div>
            </div>
            
            <div className="main-card">
                <div className="card-title">Volatility Analysis</div>
                
                <div className="volatility-grid">
                    <div className="vol-item">
                        <div className="vol-label">Overall Volatility</div>
                        <div className={`vol-value ${overallVol.className}`}>{overallVol.value}</div>
                    </div>
                    <div className="vol-item">
                        <div className="vol-label">Digit Distribution</div>
                        <div className={`vol-value ${digitVol.className}`}>{digitVol.value}</div>
                    </div>
                    <div className="vol-item">
                        <div className="vol-label">Even/Odd Volatility</div>
                        <div className={`vol-value ${evenOddVol.className}`}>{evenOddVol.value}</div>
                    </div>
                    <div className="vol-item">
                        <div className="vol-label">Most Volatile Digit</div>
                        <div className="vol-value">{mostVolatile}</div>
                    </div>
                </div>
                
                <div className="stats-row" style={{ marginTop: '12px' }}>
                    <div className="stat-box">
                        <div className="stat-value">{mostFrequent}</div>
                        <div className="stat-label">Most Frequent</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-value">{ticks.length}</div>
                        <div className="stat-label">In Window</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-value">{MAX_TICKS}</div>
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
