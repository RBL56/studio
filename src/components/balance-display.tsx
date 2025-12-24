'use client';

import { useDerivApi } from '@/context/deriv-api-context';
import { Wallet, CheckCircle } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export function BalanceDisplay() {
  const { balance, isConnected } = useDerivApi();

  if (!isConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-green-600 border border-green-200 bg-green-50 rounded-md px-3 py-1.5">
      <Wallet className="h-5 w-5" />
      {balance === null ? (
        <Skeleton className="h-5 w-24" />
      ) : (
        <span>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balance)}
        </span>
      )}
    </div>
  );
}
