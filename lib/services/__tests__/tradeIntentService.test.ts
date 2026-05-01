import { describe, expect, it } from 'vitest';
import { constructBetIntent, sendTradeIntent } from '../tradeIntentService';
import type { BetProposal } from '@/types';

const proposal: BetProposal = {
  market: {
    id: 'market-1',
    question: 'Will BTC close above $120k this year?',
    currentProbability: 54,
    volume: 1000000,
    liquidity: 500000,
    endDate: '2026-12-31T00:00:00Z',
    active: true,
    probabilityChange24h: 1.5,
  },
  side: 'YES',
  shares: 25,
  pricePerShare: 54,
  totalCost: 13.5,
  estimatedPayout: 25,
  estimatedReturn: 85,
  tradeIntent: '',
  mode: 'PAPER_TRADE',
};

describe('tradeIntentService', () => {
  it('constructs a human-readable trade intent', () => {
    expect(constructBetIntent(proposal)).toContain('Buy 25 YES shares');
  });

  it('falls back to paper trade when no live credentials are present', async () => {
    const result = await sendTradeIntent('Buy 25 YES shares');
    expect(result.mode).toBe('PAPER_TRADE');
    expect(result.success).toBe(true);
  });
});
