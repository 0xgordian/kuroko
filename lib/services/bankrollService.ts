/**
 * Bankroll Service — tracks the user's self-reported bankroll and computes
 * position sizing context for every trade.
 *
 * Stored in localStorage. No server-side state.
 */

import { getTradeHistory } from './tradeHistoryService';

const BANKROLL_KEY = 'kuroko_bankroll';

export interface BankrollContext {
  /** User-set bankroll in USD. Null if not set. */
  bankroll: number | null;
  /** Total capital deployed in confirmed paper/live trades */
  totalDeployed: number;
  /** Total deployed by category (keyword-based) */
  deployedByCategory: Record<string, number>;
  /** Unrealised P&L from resolved trades */
  realisedPnl: number;
  /** Number of confirmed trades */
  tradeCount: number;
  /** Win rate 0-1 (resolved trades only) */
  winRate: number | null;
}

export function getBankroll(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BANKROLL_KEY);
    if (!raw) return null;
    const v = parseFloat(raw);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function setBankroll(amount: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BANKROLL_KEY, String(amount));
  } catch {}
}

export function clearBankroll(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BANKROLL_KEY);
  } catch {}
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  elections: ['election', 'vote', 'president', 'senate', 'congress', 'political', 'democrat', 'republican'],
  crypto: ['bitcoin', 'btc', 'eth', 'ethereum', 'crypto', 'defi', 'token', 'blockchain', 'solana'],
  sports: ['nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'championship', 'super bowl'],
  economics: ['fed', 'inflation', 'gdp', 'recession', 'rate', 'economy', 'cpi', 'treasury'],
  tech: ['ai', 'openai', 'apple', 'google', 'microsoft', 'nvidia', 'meta', 'amazon', 'tesla'],
  world: ['war', 'russia', 'ukraine', 'china', 'iran', 'israel', 'nato', 'nuclear'],
};

function categorise(question: string): string {
  const q = question.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) return cat;
  }
  return 'other';
}

export function getBankrollContext(): BankrollContext {
  const bankroll = getBankroll();
  const history = getTradeHistory();
  const confirmed = history.filter((t) => t.status === 'confirmed');

  const totalDeployed = confirmed.reduce((sum, t) => sum + t.totalCost, 0);

  const deployedByCategory: Record<string, number> = {};
  for (const t of confirmed) {
    const cat = categorise(t.marketQuestion);
    deployedByCategory[cat] = (deployedByCategory[cat] ?? 0) + t.totalCost;
  }

  const resolved = confirmed.filter((t) => t.resolvedPnl !== undefined);
  const realisedPnl = resolved.reduce((sum, t) => sum + (t.resolvedPnl ?? 0), 0);
  const wins = resolved.filter((t) => (t.resolvedPnl ?? 0) > 0).length;
  const winRate = resolved.length > 0 ? wins / resolved.length : null;

  return {
    bankroll,
    totalDeployed,
    deployedByCategory,
    realisedPnl,
    tradeCount: confirmed.length,
    winRate,
  };
}

/**
 * Given a proposed trade cost, return sizing context.
 */
export function getSizingContext(proposedCost: number): {
  pctOfBankroll: number | null;
  pctOfDeployed: number | null;
  warning: string | null;
} {
  const ctx = getBankrollContext();

  const pctOfBankroll = ctx.bankroll ? (proposedCost / ctx.bankroll) * 100 : null;
  const pctOfDeployed = ctx.totalDeployed > 0 ? (proposedCost / ctx.totalDeployed) * 100 : null;

  let warning: string | null = null;
  if (pctOfBankroll !== null && pctOfBankroll > 20) {
    warning = `This is ${pctOfBankroll.toFixed(0)}% of your bankroll — consider sizing down`;
  } else if (pctOfBankroll !== null && pctOfBankroll > 10) {
    warning = `This is ${pctOfBankroll.toFixed(0)}% of your bankroll`;
  }

  return { pctOfBankroll, pctOfDeployed, warning };
}
