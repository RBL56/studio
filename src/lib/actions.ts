'use server';

import { backtestWithAI } from '@/ai/flows/backtest-with-ai';
import { MOCK_HISTORICAL_DATA } from '@/lib/constants';

interface RunBacktestActionInput {
  tradingStrategy: string;
}

export async function runBacktestAction(input: RunBacktestActionInput) {
  try {
    const result = await backtestWithAI({
      tradingStrategy: input.tradingStrategy,
      historicalData: JSON.stringify(MOCK_HISTORICAL_DATA),
    });
    return result;
  } catch (error) {
    console.error('Error in backtestWithAI flow:', error);
    throw new Error('Failed to get analysis from AI. Please try again.');
  }
}
