'use server';

/**
 * @fileOverview AI-powered backtesting flow for trading bot strategies.
 *
 * - backtestWithAI - Analyzes historical data to simulate bot performance and provides win/loss projections.
 * - BacktestWithAIInput - The input type for the backtestWithAI function, including the trading strategy and historical data.
 * - BacktestWithAIOutput - The return type for the backtestWithAI function, providing win/loss projections and strategy insights.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BacktestWithAIInputSchema = z.object({
  tradingStrategy: z
    .string()
    .describe('The trading bot strategy to backtest, described in natural language.'),
  historicalData: z
    .string()
    .describe(
      `Historical trading data in JSON format.  Must be an array of objects with each object representing a single trade.  Objects must have \`open\`, \`high\`, \`low\`, and \`close\` keys.
    Example: [{
      "open": 1.0912,
      "high": 1.0919,
      "low": 1.0911,
      "close": 1.0916
    }, ...]`
    ),
});
export type BacktestWithAIInput = z.infer<typeof BacktestWithAIInputSchema>;

const BacktestWithAIOutputSchema = z.object({
  winLossProjection: z
    .string()
    .describe(
      'An estimated win/loss projection based on the backtesting results, including rationale.'
    ),
  strategyInsights: z
    .string()
    .describe('Insights and recommendations for refining the trading strategy.'),
});
export type BacktestWithAIOutput = z.infer<typeof BacktestWithAIOutputSchema>;

export async function backtestWithAI(input: BacktestWithAIInput): Promise<BacktestWithAIOutput> {
  return backtestWithAIFlow(input);
}

const backtestWithAIPrompt = ai.definePrompt({
  name: 'backtestWithAIPrompt',
  input: {schema: BacktestWithAIInputSchema},
  output: {schema: BacktestWithAIOutputSchema},
  prompt: `You are an AI-powered trading strategy backtesting tool.

  Analyze the provided trading strategy against the historical data and provide a win/loss projection.
  Also, give insights and recommendations for refining the trading strategy to improve its potential profitability.

  Trading Strategy: {{{tradingStrategy}}}
  Historical Data: {{{historicalData}}}

  Focus on accuracy and actionable insights.`,
});

const backtestWithAIFlow = ai.defineFlow(
  {
    name: 'backtestWithAIFlow',
    inputSchema: BacktestWithAIInputSchema,
    outputSchema: BacktestWithAIOutputSchema,
  },
  async input => {
    const {output} = await backtestWithAIPrompt(input);
    return output!;
  }
);
