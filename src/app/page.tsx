'use client';

import { useState } from 'react';
import type { Strategy } from '@/lib/types';

export default function BotBuilderPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  return (
    <div className="container py-8">
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {/* The "Create Your Trading Bot" card was previously here. */}
        </div>
        <div className="lg:col-span-2">
          {/* Backtest results were previously here */}
        </div>
      </div>
    </div>
  );
}
