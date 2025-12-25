
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DerivApiContextType {
  isConnected: boolean;
  token: string | null;
  balance: number | null;
  accountType: 'real' | 'demo' | null;
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  api: WebSocket | null;
  subscribeToMessages: (handler: (data: any) => void) => () => void;
}

const DerivApiContext = createContext<DerivApiContextType | undefined>(undefined);

const APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || 1089;

// Simple obfuscation for the token in local storage
const encode = (str: string) => btoa(str);
const decode = (str: string) => atob(str);

export const DerivApiProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [accountType, setAccountType] = useState<'real' | 'demo' | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<Set<(data: any) => void>>(new Set());
  const { toast } = useToast();

  const handleGlobalMessage = (data: any) => {
    if (data.error) {
      if (data.error.code !== 'AlreadySubscribed') {
        console.error('Deriv API error:', data.error.message);
        toast({
          variant: "destructive",
          title: "API Error",
          description: data.error.message,
        });
      }
      return;
    }

    if (data.msg_type === 'balance') {
      setBalance(data.balance.balance);
    }

    messageHandlers.current.forEach(handler => handler(data));
  };
  
  const subscribeToMessages = (handler: (data: any) => void) => {
    messageHandlers.current.add(handler);
    return () => {
      messageHandlers.current.delete(handler);
    };
  };

  const connect = useCallback(async (apiToken: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
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
        
        if (data.msg_type === 'authorize') {
            if (data.authorize) {
                setToken(apiToken);
                localStorage.setItem('deriv_token', encode(apiToken));
                setIsConnected(true);
                setBalance(data.authorize.balance);
                setAccountType(data.authorize.is_virtual ? 'demo' : 'real');
                socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
                socket.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
                resolve();
            } else {
                localStorage.removeItem('deriv_token');
                reject(new Error('Authorization failed.'));
            }
        }
        
        handleGlobalMessage(data);
      };

      socket.onclose = () => {
        setIsConnected(false);
        setToken(null);
        setBalance(null);
        setAccountType(null);
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection error.'));
        setIsConnected(false);
      };
    });
  }, [toast]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    localStorage.removeItem('deriv_token');
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('deriv_token');
    if (storedToken) {
      try {
        const decodedToken = decode(storedToken);
        connect(decodedToken).catch(() => {
          // If connection fails with stored token, remove it.
          localStorage.removeItem('deriv_token');
        });
      } catch (error) {
        // If decoding fails, remove the invalid token.
        localStorage.removeItem('deriv_token');
      }
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return (
    <DerivApiContext.Provider value={{
      isConnected,
      token,
      balance,
      accountType,
      connect,
      disconnect,
      api: ws.current,
      subscribeToMessages
    }}>
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
