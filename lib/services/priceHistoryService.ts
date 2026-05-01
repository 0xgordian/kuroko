/**
 * Price History Service — fetches CLOB price history for charts
 */

export type PricePoint = {
  time: number; // unix timestamp (seconds)
  value: number; // probability 0-100
};

export type HistoryInterval = '1d' | '1w' | '1m';

const CLOB_PROXY = '/api/clob';

const INTERVAL_PARAMS: Record<HistoryInterval, { interval: string; fidelity: number }> = {
  '1d': { interval: '1d', fidelity: 60 },
  '1w': { interval: '1w', fidelity: 360 },
  '1m': { interval: '1m', fidelity: 1440 },
};

export async function fetchPriceHistory(
  tokenId: string,
  range: HistoryInterval = '1w',
): Promise<PricePoint[]> {
  try {
    const { interval, fidelity } = INTERVAL_PARAMS[range];
    const url = new URL(`${window.location.origin}${CLOB_PROXY}/prices-history`);
    url.searchParams.set('market', tokenId);
    url.searchParams.set('interval', interval);
    url.searchParams.set('fidelity', String(fidelity));

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return [];

    const data = await res.json();
    const history: Array<{ t: number; p: number }> = Array.isArray(data?.history)
      ? data.history
      : [];

    return history
      .filter((pt) => Number.isFinite(pt.t) && Number.isFinite(pt.p))
      .map((pt) => ({
        time: pt.t,
        value: Math.round(pt.p * 100 * 10) / 10, // 0-100 with 1dp
      }))
      .sort((a, b) => a.time - b.time);
  } catch {
    return [];
  }
}
