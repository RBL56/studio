'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';

interface DerivApiContextType {
  isConnected: boolean;
  token: string | null;
  balance: number | null;
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
}

const DerivApiContext = createContext<DerivApiContextType | undefined>(undefined);

const APP_ID = 1089; // Default Deriv App ID

export const DerivApiProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  const connect = useCallback(async (apiToken: string) => {
    if (ws.current) {
        ws.current.close();
    }

    ws.current = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
    const socket = ws.current;

    return new Promise<void>((resolve, reject) => {
        socket.onopen = () => {
            socket.send(JSON.stringify({ authorize: apiToken }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error('Deriv API error:', data.error.message);
                socket.close();
                setToken(null);
                setBalance(null);
                setIsConnected(false);
                reject(new Error(data.error.message));
                return;
            }

            if (data.msg_type === 'authorize') {
                if (data.authorize) {
                    setToken(apiToken);
                    setIsConnected(true);
                    setBalance(data.authorize.balance);
                    // Subscribe to balance updates
                    socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
                    resolve();
                } else {
                    reject(new Error('Authorization failed.'));
                }
            }
            
            if (data.msg_type === 'balance') {
                setBalance(data.balance.balance);
            }
        };

        socket.onclose = () => {
            setIsConnected(false);
            setToken(null);
            setBalance(null);
        };
        
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            reject(new Error('WebSocket connection error.'));
            setIsConnected(false);
        };
    });
  }, []);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setToken(null);
    setBalance(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    // Cleanup WebSocket on component unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return (
    <DerivApiContext.Provider value={{ isConnected, token, balance, connect, disconnect }}>
      {children}
    </DerivApiContext.Provider>
  );
};

export const useDerivApi = () => {
  const context = useContext(DerivApiContext);
  if (context === undefined) {
    throw new Error('useDerivApi must be used within a DerivApiProvider');
  }
  return context;
};
