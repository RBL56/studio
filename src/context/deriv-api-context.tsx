'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface DerivApiContextType {
  isConnected: boolean;
  token: string | null;
  balance: number | null;
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
}

const DerivApiContext = createContext<DerivApiContextType | undefined>(undefined);

// Mock function to simulate API call for balance
const fetchBalance = async (token: string): Promise<number> => {
    console.log('Fetching balance for token:', token);
    // In a real app, you would make an API call to Deriv
    // This is a mock validation. Any non-empty token is "valid".
    if (!token) {
        throw new Error('Invalid token');
    }
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Return a mock balance
    return 10000.00;
};


export const DerivApiProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async (apiToken: string) => {
    try {
      const userBalance = await fetchBalance(apiToken);
      setToken(apiToken);
      setBalance(userBalance);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect to Deriv API:', error);
      // Ensure state is reset on failure
      setToken(null);
      setBalance(null);
      setIsConnected(false);
      throw error; // Re-throw to be caught in the component
    }
  }, []);

  const disconnect = useCallback(() => {
    setToken(null);
    setBalance(null);
    setIsConnected(false);
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
