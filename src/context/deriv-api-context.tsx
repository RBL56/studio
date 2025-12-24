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

const APP_ID = 1089; // Default Deriv App ID

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
                setIsConnected(true);
                setBalance(data.authorize.balance);
                setAccountType(data.authorize.is_virtual ? 'demo' : 'real');
                socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
                socket.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));
                resolve();
            } else {
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
  }, []);

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

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
