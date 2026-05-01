/**
 * Order Fill Service — polls the CLOB API after signing to confirm
 * whether an order reached the book and was filled.
 *
 * Polymarket CLOB order states:
 *   OPEN      — in the book, waiting for a match
 *   MATCHED   — matched, pending settlement
 *   FILLED    — fully filled
 *   CANCELLED — cancelled by user or expired
 *   REJECTED  — rejected by the exchange (bad params, insufficient balance, etc.)
 */

const CLOB_PROXY = '/api/clob';
const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 20; // 60s total

export type OrderStatus = 'PENDING' | 'OPEN' | 'MATCHED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'UNKNOWN';

export interface OrderFillResult {
  orderId: string;
  status: OrderStatus;
  /** Size filled so far (0-1 as fraction of total) */
  fillFraction: number;
  /** Average fill price (0-1 decimal) */
  avgFillPrice: number | null;
  /** Raw message from exchange if rejected */
  rejectReason: string | null;
  /** True if polling timed out without a terminal state */
  timedOut: boolean;
}

interface ClobOrderResponse {
  id?: string;
  status?: string;
  size_matched?: string | number;
  original_size?: string | number;
  price?: string | number;
  outcome?: string;
  error?: string;
  message?: string;
}

async function fetchOrderStatus(
  orderId: string,
  signal?: AbortSignal,
): Promise<ClobOrderResponse | null> {
  try {
    const res = await fetch(`${CLOB_PROXY}/orders/${encodeURIComponent(orderId)}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return null;
    return await res.json() as ClobOrderResponse;
  } catch {
    return null;
  }
}

function parseStatus(raw: string | undefined): OrderStatus {
  if (!raw) return 'UNKNOWN';
  const s = raw.toUpperCase();
  if (s === 'OPEN') return 'OPEN';
  if (s === 'MATCHED') return 'MATCHED';
  if (s === 'FILLED' || s === 'COMPLETE') return 'FILLED';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'CANCELLED';
  if (s === 'REJECTED' || s === 'FAILED') return 'REJECTED';
  return 'UNKNOWN';
}

const TERMINAL_STATES: OrderStatus[] = ['FILLED', 'CANCELLED', 'REJECTED'];

/**
 * Abortable sleep — resolves after ms, or rejects early if signal fires.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

/**
 * Poll the CLOB API until the order reaches a terminal state or times out.
 * Calls `onUpdate` on every poll so the UI can show live status.
 *
 * Pass an AbortController signal to stop polling when the component unmounts.
 */
export async function pollOrderFill(
  orderId: string,
  onUpdate: (result: OrderFillResult) => void,
  signal?: AbortSignal,
): Promise<OrderFillResult> {
  let polls = 0;

  const buildResult = (raw: ClobOrderResponse | null, timedOut = false): OrderFillResult => {
    if (!raw) {
      return { orderId, status: 'UNKNOWN', fillFraction: 0, avgFillPrice: null, rejectReason: null, timedOut };
    }
    const status = parseStatus(raw.status);
    const sizeMatched = Number(raw.size_matched ?? 0);
    const originalSize = Number(raw.original_size ?? 0);
    const fillFraction = originalSize > 0 ? Math.min(1, sizeMatched / originalSize) : 0;
    const avgFillPrice = raw.price ? Number(raw.price) : null;
    const rejectReason = status === 'REJECTED'
      ? String(raw.error ?? raw.message ?? 'Order rejected by exchange')
      : null;
    return { orderId, status, fillFraction, avgFillPrice, rejectReason, timedOut };
  };

  // Emit PENDING immediately
  onUpdate({ orderId, status: 'PENDING', fillFraction: 0, avgFillPrice: null, rejectReason: null, timedOut: false });

  // Check abort before starting the polling loop
  if (signal?.aborted) return buildResult(null);

  while (polls < MAX_POLLS) {
    try {
      await sleep(POLL_INTERVAL_MS, signal);
    } catch {
      // Aborted — stop polling silently
      return buildResult(null);
    }

    if (signal?.aborted) return buildResult(null);

    polls++;
    const raw = await fetchOrderStatus(orderId, signal);
    if (signal?.aborted) return buildResult(null);

    const result = buildResult(raw);
    onUpdate(result);

    if (TERMINAL_STATES.includes(result.status)) return result;
  }

  // Timed out
  const raw = await fetchOrderStatus(orderId, signal);
  const final = buildResult(raw, true);
  onUpdate(final);
  return final;
}
