/**
 * Position Guard Service — automated stop-loss and take-profit monitoring.
 *
 * Traders define rules per position (take-profit %, stop-loss %).
 * The guard polls live market prices every 60s and fires when a threshold is crossed.
 * On trigger: generates a natural-language trade intent and records it.
 *
 * Execution is paper-trade safe by default. With a wallet + API key, the intent
 * routes through aomi → Para signing.
 *
 * Storage: localStorage. No server-side state.
 */

export type GuardAction = 'HOLD' | 'SELL' | 'REDUCE';

export interface PositionGuard {
  id: string;
  marketId: string;
  marketQuestion: string;
  clobTokenId?: string;
  /** Number of YES shares held */
  shares: number;
  /** Entry price in cents (1-99) */
  entryPrice: number;
  /** Take-profit threshold — probability % at which to sell 40% of position */
  takeProfit: number;
  /** Stop-loss threshold — probability % at which to reduce 65% of position */
  stopLoss: number;
  /** Whether this guard is actively monitoring */
  active: boolean;
  createdAt: string;
  /** Last time this guard was evaluated */
  lastCheckedAt?: string;
  /** Last triggered action */
  lastTriggeredAt?: string;
  lastTriggeredAction?: GuardAction;
}

export interface GuardAnalysis {
  guard: PositionGuard;
  currentProbability: number;
  action: GuardAction;
  headline: string;
  rationale: string;
  conditions: Array<{ label: string; passed: boolean }>;
  shareCount: number;
  referencePrice: number;
  tradeIntent: string;
  timestamp: string;
}

const STORAGE_KEY = 'kuroko_position_guards';

// ─── Storage helpers ──────────────────────────────────────────────────────────

function load(): PositionGuard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PositionGuard[]) : [];
  } catch {
    return [];
  }
}

function save(guards: PositionGuard[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guards));
  } catch {}
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function getGuards(): PositionGuard[] {
  return load().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addGuard(
  guard: Omit<PositionGuard, 'id' | 'createdAt' | 'active'>,
): PositionGuard {
  const full: PositionGuard = {
    ...guard,
    id: `guard-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    active: true,
  };
  save([...load(), full]);
  return full;
}

export function updateGuard(id: string, updates: Partial<PositionGuard>): void {
  save(load().map((g) => (g.id === id ? { ...g, ...updates } : g)));
}

export function removeGuard(id: string): void {
  save(load().filter((g) => g.id !== id));
}

export function toggleGuard(id: string): void {
  save(load().map((g) => (g.id === id ? { ...g, active: !g.active } : g)));
}

// ─── Analysis engine ──────────────────────────────────────────────────────────

/**
 * Calculate sensible default thresholds from current probability.
 * Take-profit = min(P + 10, 99), stop-loss = max(P - 10, 1)
 */
export function calculateDefaultThresholds(probability: number): {
  takeProfit: number;
  stopLoss: number;
} {
  return {
    takeProfit: Math.min(Math.round(probability) + 10, 99),
    stopLoss: Math.max(Math.round(probability) - 10, 1),
  };
}

/**
 * Validate that stop-loss < take-profit and both are in range.
 */
export function validateGuardThresholds(
  stopLoss: number,
  takeProfit: number,
): { valid: boolean; error?: string } {
  if (stopLoss >= takeProfit) {
    return { valid: false, error: 'Stop-loss must be below take-profit' };
  }
  if (stopLoss < 1 || stopLoss > 99) {
    return { valid: false, error: 'Stop-loss must be between 1 and 99' };
  }
  if (takeProfit < 1 || takeProfit > 99) {
    return { valid: false, error: 'Take-profit must be between 1 and 99' };
  }
  return { valid: true };
}

/**
 * Analyse a single guard against the current market probability.
 * Pure function — no side effects.
 */
export function analyseGuard(
  guard: PositionGuard,
  currentProbability: number,
): GuardAnalysis {
  const prob = currentProbability;
  const { takeProfit, stopLoss, shares, marketQuestion } = guard;

  let action: GuardAction;
  let shareCount: number;
  let headline: string;
  let rationale: string;

  if (prob >= takeProfit) {
    action = 'SELL';
    shareCount = Math.round(shares * 0.4);
    headline = 'Take-Profit Triggered';
    rationale = `Market probability (${prob}%) has reached your take-profit threshold (${takeProfit}%). Selling 40% of your position (${shareCount} shares) locks in gains while keeping exposure to further upside.`;
  } else if (prob <= stopLoss) {
    action = 'REDUCE';
    shareCount = Math.round(shares * 0.65);
    headline = 'Stop-Loss Triggered';
    rationale = `Market probability (${prob}%) has fallen to your stop-loss threshold (${stopLoss}%). Reducing 65% of your position (${shareCount} shares) limits downside while retaining a small position in case of reversal.`;
  } else {
    action = 'HOLD';
    shareCount = 0;
    headline = 'Position Within Range';
    rationale = `Market probability (${prob}%) is between your stop-loss (${stopLoss}%) and take-profit (${takeProfit}%). No action required — hold your ${shares} shares.`;
  }

  const conditions: Array<{ label: string; passed: boolean }> = [
    {
      label: `Current probability ${prob}% ≥ take-profit ${takeProfit}%`,
      passed: prob >= takeProfit,
    },
    {
      label: `Current probability ${prob}% ≤ stop-loss ${stopLoss}%`,
      passed: prob <= stopLoss,
    },
    {
      label: `Position size ${shares} shares > 0`,
      passed: shares > 0,
    },
    {
      label: `Guard is active`,
      passed: guard.active,
    },
  ];

  const tradeIntent =
    action === 'HOLD'
      ? `Hold position on "${marketQuestion}" — no rule triggered. Current probability: ${prob}%.`
      : `Sell ${shareCount} YES shares on "${marketQuestion}" at ${prob} cents. Reason: ${headline.toLowerCase()}.`;

  return {
    guard,
    currentProbability: prob,
    action,
    headline,
    rationale,
    conditions,
    shareCount,
    referencePrice: prob,
    tradeIntent,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check all active guards against current market probabilities.
 * Returns analyses for guards that have triggered (SELL or REDUCE).
 * Updates lastCheckedAt and lastTriggeredAt in storage.
 */
export function checkGuards(
  marketProbabilities: Record<string, number>,
): GuardAnalysis[] {
  const guards = load();
  const triggered: GuardAnalysis[] = [];
  const now = new Date().toISOString();

  const updated = guards.map((guard) => {
    if (!guard.active) return guard;
    const prob = marketProbabilities[guard.marketId];
    if (prob === undefined) return { ...guard, lastCheckedAt: now };

    const analysis = analyseGuard(guard, prob);

    if (analysis.action !== 'HOLD') {
      triggered.push(analysis);
      return {
        ...guard,
        lastCheckedAt: now,
        lastTriggeredAt: now,
        lastTriggeredAction: analysis.action,
      };
    }

    return { ...guard, lastCheckedAt: now };
  });

  save(updated);
  return triggered;
}
