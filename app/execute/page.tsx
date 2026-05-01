'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import type { Market } from '@/types';
import { fetchActiveMarkets, onMarketsRefresh } from '@/lib/services/marketService';
import { fetchOrderBook, type OrderBook } from '@/lib/services/clobService';
import { analyseMarket, type MarketAnalysis, type MarketSignal } from '@/lib/services/signalEngine';
import { sendLiveOrder } from '@/lib/services/tradeIntentService';
import { addTradeRecord } from '@/lib/services/tradeHistoryService';
import { pollOrderFill, type OrderFillResult, type OrderStatus } from '@/lib/services/orderFillService';
import { getSizingContext, getBankroll, setBankroll } from '@/lib/services/bankrollService';
import { useAomiAuthAdapter } from '@/lib/aomi-auth-adapter';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';

// ─── Signal badge ─────────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: MarketSignal }) {
  const colors: Record<MarketSignal['severity'], { color: string; bg: string; border: string }> = {
    positive: { color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.3)' },
    warning:  { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
    neutral:  { color: '#f0f0f0', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)' },
  };
  const c = colors[signal.severity];
  return (
    <span
      title={signal.detail}
      className="font-terminal text-[10px] tracking-widest uppercase px-2 py-0.5 border cursor-help"
      style={{ color: c.color, backgroundColor: c.bg, borderColor: c.border, borderRadius: 0 }}
    >
      {signal.label}
    </span>
  );
}

// ─── Order book display ───────────────────────────────────────────────────────

function OrderBookPanel({ book, isLoading }: { book: OrderBook | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-5 animate-pulse" style={{ backgroundColor: '#161616', borderRadius: 0 }} />
        ))}
      </div>
    );
  }
  if (!book) return <p className="text-xs" style={{ color: '#555' }}>No order book data</p>;

  const topAsks = [...book.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price)).slice(0, 5);
  const topBids = [...book.bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)).slice(0, 5);
  const maxSize = Math.max(
    ...topAsks.map(a => parseFloat(a.size)),
    ...topBids.map(b => parseFloat(b.size)),
    1,
  );

  return (
    <div className="space-y-0.5">
      <div className="space-y-0.5 mb-1">
        {[...topAsks].reverse().map((ask, i) => {
          const price = parseFloat(ask.price);
          const size = parseFloat(ask.size);
          const pct = (size / maxSize) * 100;
          return (
            <div key={i} className="relative flex items-center justify-between px-2 py-0.5 overflow-hidden" style={{ minHeight: 20 }}>
              <div className="absolute inset-y-0 right-0" style={{ width: `${pct}%`, backgroundColor: 'rgba(248,113,113,0.12)' }} />
              <span className="font-terminal text-[11px] relative z-10" style={{ color: '#f87171' }}>{Math.round(price * 100)}¢</span>
              <span className="font-terminal text-[11px] relative z-10" style={{ color: '#a0a0a0' }}>{size.toFixed(0)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-2 py-1 border-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>Spread</span>
        <span className="font-terminal text-[11px]" style={{ color: '#f0f0f0' }}>
          {Math.round(book.spread * 10000)} bps
        </span>
      </div>
      <div className="space-y-0.5 mt-1">
        {topBids.map((bid, i) => {
          const price = parseFloat(bid.price);
          const size = parseFloat(bid.size);
          const pct = (size / maxSize) * 100;
          return (
            <div key={i} className="relative flex items-center justify-between px-2 py-0.5 overflow-hidden" style={{ minHeight: 20 }}>
              <div className="absolute inset-y-0 right-0" style={{ width: `${pct}%`, backgroundColor: 'rgba(74,222,128,0.12)' }} />
              <span className="font-terminal text-[11px] relative z-10" style={{ color: '#4ade80' }}>{Math.round(price * 100)}¢</span>
              <span className="font-terminal text-[11px] relative z-10" style={{ color: '#a0a0a0' }}>{size.toFixed(0)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fill status panel ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { color: string; label: string; pulse: boolean }> = {
  PENDING:   { color: '#f59e0b', label: 'Pending',   pulse: true  },
  OPEN:      { color: '#ff4500', label: 'In Book',   pulse: true  },
  MATCHED:   { color: '#4ade80', label: 'Matched',   pulse: true  },
  FILLED:    { color: '#4ade80', label: 'Filled',    pulse: false },
  CANCELLED: { color: '#a0a0a0', label: 'Cancelled', pulse: false },
  REJECTED:  { color: '#f87171', label: 'Rejected',  pulse: false },
  UNKNOWN:   { color: '#555',    label: 'Unknown',   pulse: false },
};

function FillStatusPanel({ fill }: { fill: OrderFillResult | null }) {
  if (!fill) return null;
  const cfg = STATUS_CONFIG[fill.status];
  const pct = Math.round(fill.fillFraction * 100);

  return (
    <div className="border panel-bracket p-4 space-y-3" style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
      <div className="flex items-center justify-between">
        <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>Order Status</span>
        <div className="flex items-center gap-2">
          {cfg.pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: cfg.color }} />}
          <span className="font-terminal text-[11px] font-bold tracking-widest uppercase" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>Fill</span>
          <span className="font-terminal text-[11px]" style={{ color: '#f0f0f0' }}>{pct}%</span>
        </div>
        <div className="h-1.5 w-full" style={{ backgroundColor: '#1a1a1a', borderRadius: 0 }}>
          <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cfg.color, borderRadius: 0 }} />
        </div>
      </div>
      {fill.avgFillPrice !== null && (
        <div className="flex items-center justify-between">
          <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>Avg Fill</span>
          <span className="font-terminal text-[11px]" style={{ color: '#f0f0f0' }}>{Math.round(fill.avgFillPrice * 100)}¢</span>
        </div>
      )}
      {fill.rejectReason && <p className="text-xs" style={{ color: '#f87171' }}>{fill.rejectReason}</p>}
      {fill.timedOut && (
        <p className="text-xs" style={{ color: '#f59e0b' }}>Polling timed out — check Polymarket directly for order status</p>
      )}
      <p className="font-terminal text-[10px]" style={{ color: '#444' }}>Order ID: {fill.orderId.slice(0, 16)}...</p>
    </div>
  );
}

// ─── Main Execute Page ────────────────────────────────────────────────────────

type Side = 'YES' | 'NO';

function ExecuteContent() {
  // ── Wallet / auth ─────────────────────────────────────────────────────────
  const authAdapter = useAomiAuthAdapter();
  const isWalletConnected = authAdapter.identity.isConnected;
  const walletAddress = authAdapter.identity.address ?? null;
  const hasLiveIntentPath = Boolean(process.env.NEXT_PUBLIC_AOMI_API_KEY);
  const liveModeLabel = hasLiveIntentPath
    ? isWalletConnected ? 'Signing Ready' : 'Connect Wallet'
    : 'Paper Mode';
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [book, setBook] = useState<OrderBook | null>(null);
  const [loadingBook, setLoadingBook] = useState(false);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);

  // Order form
  const [side, setSide] = useState<Side>('YES');
  const [shares, setShares] = useState('100');
  const [limitPrice, setLimitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fill tracking
  const [fillResult, setFillResult] = useState<OrderFillResult | null>(null);

  // Bankroll
  const [bankroll, setBankrollState] = useState<number | null>(null);
  const [bankrollInput, setBankrollInput] = useState('');
  const [bankrollError, setBankrollError] = useState<string | null>(null);

  const pollRef = useRef<AbortController | null>(null);

  // ── Load markets ──────────────────────────────────────────────────────────
  const loadMarkets = useCallback(async () => {
    setLoadingMarkets(true);
    const { markets: ms, isFallback: fb } = await fetchActiveMarkets();
    setMarkets(ms);
    setIsFallback(fb);
    setLoadingMarkets(false);
  }, []);

  useEffect(() => { void loadMarkets(); }, [loadMarkets]);

  useEffect(() => {
    const unsub = onMarketsRefresh(() => { void loadMarkets(); });
    return unsub;
  }, [loadMarkets]);

  // ── Abort fill polling on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      pollRef.current?.abort();
    };
  }, []);
  // ── Load bankroll from localStorage ──────────────────────────────────────
  useEffect(() => {
    const b = getBankroll();
    setBankrollState(b);
    if (b) setBankrollInput(String(b));
  }, []);

  // ── Load order book + analysis when market selected ───────────────────────
  useEffect(() => {
    if (!selectedMarket) { setBook(null); setAnalysis(null); return; }
    setLoadingBook(true);
    setBook(null);
    setAnalysis(null);
    setFillResult(null);

    const tokenId = selectedMarket.clobTokenId;
    if (!tokenId) {
      setLoadingBook(false);
      setAnalysis(analyseMarket(selectedMarket, null));
      return;
    }

    fetchOrderBook(tokenId).then((b) => {
      setBook(b);
      setAnalysis(analyseMarket(selectedMarket, b));
      // Pre-fill limit price from best bid/ask
      if (b) {
        const defaultPrice = side === 'YES'
          ? Math.round(b.best_ask * 100)
          : Math.round((1 - b.best_bid) * 100);
        setLimitPrice(String(defaultPrice));
      }
    }).finally(() => setLoadingBook(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarket]);

  // ── Update limit price when side changes ─────────────────────────────────
  useEffect(() => {
    if (!book) return;
    const defaultPrice = side === 'YES'
      ? Math.round(book.best_ask * 100)
      : Math.round((1 - book.best_bid) * 100);
    setLimitPrice(String(defaultPrice));
  }, [side, book]);

  // ── Derived order values ──────────────────────────────────────────────────
  const sharesNum = Math.max(0, parseInt(shares) || 0);
  const priceNum = Math.max(1, Math.min(99, parseInt(limitPrice) || 50));
  const totalCost = (sharesNum * priceNum) / 100;
  const payout = sharesNum;
  const returnPct = totalCost > 0 ? ((payout - totalCost) / totalCost) * 100 : 0;
  const sizing = bankroll ? getSizingContext(totalCost) : null;

  // ── Filtered markets ──────────────────────────────────────────────────────
  const filtered = search.trim().length > 1
    ? markets.filter((m) => m.question.toLowerCase().includes(search.toLowerCase())).slice(0, 20)
    : markets.slice(0, 20);

  // ── Submit order ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!selectedMarket || sharesNum <= 0 || submitting) return;

    setSubmitting(true);
    setFillResult(null);

    const tokenId = selectedMarket.clobTokenId;

    // No wallet connected OR no CLOB token → paper trade immediately, no network call
    if (!isWalletConnected || !walletAddress || !tokenId) {
      addTradeRecord({
        marketQuestion: selectedMarket.question,
        marketId: selectedMarket.id,
        side,
        shares: sharesNum,
        pricePerShare: priceNum,
        totalCost,
        mode: 'PAPER_TRADE',
        status: 'confirmed',
      });
      toast.success('Paper trade recorded', {
        style: { background: '#111', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 0 },
        iconTheme: { primary: '#4ade80', secondary: '#111' },
      });
      setSubmitting(false);
      return;
    }

    // Wallet connected — attempt live order via aomi
    try {
      const result = await sendLiveOrder({
        walletAddress,
        tokenId,
        side: 'BUY',
        price: priceNum / 100,
        shares: sharesNum,
        marketQuestion: selectedMarket.question,
        chainId: authAdapter.identity.chainId ?? 137,
      });

      addTradeRecord({
        marketQuestion: selectedMarket.question,
        marketId: selectedMarket.id,
        side,
        shares: sharesNum,
        pricePerShare: priceNum,
        totalCost,
        mode: result.mode,
        status: result.success ? 'confirmed' : 'failed',
        txHash: result.txHash,
      });

      if (result.mode === 'PAPER_TRADE') {
        toast.success('Paper trade recorded', {
          style: { background: '#111', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 0 },
          iconTheme: { primary: '#4ade80', secondary: '#111' },
        });
      } else if (result.orderId) {
        toast.success('Order submitted — tracking fill…');
        pollRef.current = new AbortController();
        pollOrderFill(result.orderId, (update) => setFillResult(update));
      } else if (result.mode === 'SIGNING_REQUIRED') {
        // Open the Para wallet modal so the user can review and sign
        authAdapter.connect();
        toast('Open your wallet to review and sign the order', {
          icon: (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <rect x="1" y="4" width="14" height="10" rx="0" stroke="#ff4500" strokeWidth="1.5"/>
              <path d="M4 4V3a4 4 0 0 1 8 0v1" stroke="#ff4500" strokeWidth="1.5"/>
              <circle cx="8" cy="9" r="1.5" fill="#ff4500"/>
            </svg>
          ),
          style: { background: '#111', color: '#f0f0f0', border: '1px solid rgba(255,69,0,0.4)', borderRadius: 0 },
          duration: 6000,
        });
      } else {
        toast.success('Order submitted');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  }, [selectedMarket, sharesNum, priceNum, totalCost, side, submitting, isWalletConnected, walletAddress]);

  // ── Save bankroll ─────────────────────────────────────────────────────────
  const handleSaveBankroll = () => {
    const v = parseFloat(bankrollInput);
    if (Number.isFinite(v) && v > 0) {
      setBankroll(v);
      setBankrollState(v);
      toast.success(`Bankroll set to $${v.toLocaleString()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-12 pb-16 lg:pb-0" style={{ backgroundColor: '#0d0d0d' }}>
      <TopNav
        isFallback={isFallback}
        isLoadingMarkets={loadingMarkets}
        liveModeLabel={liveModeLabel}
        isWalletConnected={isWalletConnected}
        walletAddress={walletAddress}
        onConnectWallet={!isWalletConnected ? () => authAdapter.connect() : undefined}
        onManageWallet={isWalletConnected ? () => authAdapter.manageAccount() : undefined}
      />

      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="t-label t-label-accent mb-1">Trading Terminal</p>
            <h1 className="font-terminal text-xl font-bold" style={{ color: '#f0f0f0' }}>EXECUTE</h1>
          </div>
          {/* Bankroll input */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="t-label">Bankroll $</span>
            <input
              type="number"
              value={bankrollInput}
              onChange={(e) => setBankrollInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveBankroll()}
              placeholder="1000"
              className="font-terminal text-xs w-24 px-2 py-1 border bg-transparent outline-none"
              style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#f0f0f0', borderRadius: 0 }}
            />
            <button
              onClick={handleSaveBankroll}
              className="font-terminal text-[10px] tracking-widest uppercase px-2 py-1 border"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#a0a0a0', borderRadius: 0 }}
            >
              Set
            </button>
            {bankroll && (
              <span className="font-terminal text-[10px]" style={{ color: '#4ade80' }}>
                ${bankroll.toLocaleString()} set
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── LEFT: Market picker ── */}
          <div className="lg:col-span-4 space-y-3">
            <div className="border panel-bracket" style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="t-label mb-2">Select Market</p>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search markets…"
                  className="w-full font-terminal text-xs px-3 py-2 border bg-transparent outline-none"
                  style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#f0f0f0', borderRadius: 0 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,69,0,0.5)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                />
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                {loadingMarkets ? (
                  <div className="space-y-1 p-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-10 animate-pulse" style={{ backgroundColor: '#161616', borderRadius: 0 }} />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="px-4 py-6 text-xs" style={{ color: '#555' }}>No markets found</p>
                ) : (
                  filtered.map((m) => {
                    const active = selectedMarket?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMarket(m)}
                        className="w-full text-left px-4 py-3 border-b transition-all"
                        style={{
                          borderColor: 'rgba(255,255,255,0.04)',
                          backgroundColor: active ? 'rgba(255,69,0,0.08)' : 'transparent',
                          borderLeft: active ? '3px solid #ff4500' : '3px solid transparent',
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = '#161616'; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <p className="text-xs leading-snug mb-1 line-clamp-2" style={{ color: active ? '#f0f0f0' : '#a0a0a0' }}>
                          {m.question}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="font-terminal text-[10px]" style={{ color: '#4ade80' }}>
                            {m.currentProbability}%
                          </span>
                          <span className="font-terminal text-[10px]" style={{ color: '#555' }}>
                            ${(m.volume / 1000).toFixed(0)}K vol
                          </span>
                          {m.probabilityChange24h != null && Math.abs(m.probabilityChange24h) > 1 && (
                            <span className="font-terminal text-[10px]" style={{ color: m.probabilityChange24h > 0 ? '#4ade80' : '#f87171' }}>
                              {m.probabilityChange24h > 0 ? '+' : ''}{m.probabilityChange24h.toFixed(1)}pp
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── CENTER: Order form + signals ── */}
          <div className="lg:col-span-5 space-y-4">

            {!selectedMarket ? (
              <div className="border panel-bracket flex items-center justify-center" style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0, minHeight: 320 }}>
                <div className="text-center">
                  <p className="font-terminal text-[10px] tracking-widest uppercase mb-2" style={{ color: '#333' }}>← Select a market</p>
                  <p className="text-xs" style={{ color: '#444' }}>Pick a market from the list to start building an order</p>
                </div>
              </div>
            ) : (
              <>
                {/* Market header */}
                <div className="border panel-bracket p-4" style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
                  <p className="text-sm leading-snug mb-3" style={{ color: '#f0f0f0' }}>{selectedMarket.question}</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <p className="t-label mb-0.5">Probability</p>
                      <p className="font-terminal text-lg font-bold" style={{ color: '#4ade80' }}>{selectedMarket.currentProbability}%</p>
                    </div>
                    <div>
                      <p className="t-label mb-0.5">Volume</p>
                      <p className="font-terminal text-sm font-bold" style={{ color: '#f0f0f0' }}>${(selectedMarket.volume / 1000).toFixed(0)}K</p>
                    </div>
                    <div>
                      <p className="t-label mb-0.5">Liquidity</p>
                      <p className="font-terminal text-sm font-bold" style={{ color: '#f0f0f0' }}>${(selectedMarket.liquidity / 1000).toFixed(0)}K</p>
                    </div>
                    {selectedMarket.probabilityChange24h != null && (
                      <div>
                        <p className="t-label mb-0.5">24h Move</p>
                        <p className="font-terminal text-sm font-bold" style={{ color: selectedMarket.probabilityChange24h >= 0 ? '#4ade80' : '#f87171' }}>
                          {selectedMarket.probabilityChange24h >= 0 ? '+' : ''}{selectedMarket.probabilityChange24h.toFixed(1)}pp
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Signals */}
                  {analysis && analysis.signals.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      {analysis.signals.map((s) => <SignalBadge key={s.type} signal={s} />)}
                    </div>
                  )}
                </div>

                {/* Order form */}
                <div className="border panel-bracket p-4 space-y-4" style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
                  <p className="t-label t-label-accent">Build Order</p>

                  {/* Side toggle */}
                  <div>
                    <p className="t-label mb-2">Side</p>
                    <div className="flex gap-0">
                      {(['YES', 'NO'] as Side[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSide(s)}
                          className="flex-1 py-2 font-terminal text-xs font-bold tracking-widest uppercase border transition-all"
                          style={{
                            backgroundColor: side === s
                              ? s === 'YES' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'
                              : 'transparent',
                            borderColor: side === s
                              ? s === 'YES' ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)'
                              : 'rgba(255,255,255,0.08)',
                            color: side === s
                              ? s === 'YES' ? '#4ade80' : '#f87171'
                              : '#555',
                            borderRadius: 0,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shares + price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="t-label mb-1.5">Shares</p>
                      <input
                        type="number"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                        min="1"
                        className="w-full font-terminal text-sm px-3 py-2 border bg-transparent outline-none"
                        style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#f0f0f0', borderRadius: 0 }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,69,0,0.5)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                      />
                    </div>
                    <div>
                      <p className="t-label mb-1.5">Limit Price (¢)</p>
                      <input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        min="1"
                        max="99"
                        className="w-full font-terminal text-sm px-3 py-2 border bg-transparent outline-none"
                        style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#f0f0f0', borderRadius: 0 }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,69,0,0.5)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                      />
                    </div>
                  </div>

                  {/* Order summary */}
                  <div className="border p-3 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
                    <div className="flex justify-between">
                      <span className="t-label">Cost</span>
                      <span className="font-terminal text-xs font-bold" style={{ color: '#f0f0f0' }}>${totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="t-label">Payout if correct</span>
                      <span className="font-terminal text-xs font-bold" style={{ color: '#ff4500' }}>${payout.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="t-label">Return</span>
                      <span className="font-terminal text-xs font-bold" style={{ color: returnPct >= 0 ? '#4ade80' : '#f87171' }}>
                        {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(0)}%
                      </span>
                    </div>
                    {sizing?.warning && (
                      <p className="font-terminal text-[10px] pt-1 border-t" style={{ color: '#f59e0b', borderColor: 'rgba(255,255,255,0.06)' }}>
                        ⚠ {sizing.warning}
                      </p>
                    )}
                    {analysis?.slippageBps != null && (
                      <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <span className="t-label">Est. Slippage</span>
                        <span className="font-terminal text-[10px]" style={{ color: analysis.slippageBps > 200 ? '#f87171' : '#a0a0a0' }}>
                          {analysis.slippageBps} bps
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Wallet status / connect prompt */}
                  {!isWalletConnected && (
                    <div className="border p-3 flex items-center justify-between gap-3"
                      style={{ borderColor: 'rgba(255,69,0,0.25)', backgroundColor: 'rgba(255,69,0,0.05)', borderRadius: 0 }}>
                      <div>
                        <p className="font-terminal text-[10px] tracking-widest uppercase mb-0.5" style={{ color: '#ff4500' }}>
                          Paper Mode
                        </p>
                        <p className="text-xs" style={{ color: '#555' }}>
                          Connect wallet to execute live orders on Polymarket
                        </p>
                      </div>
                      <button
                        onClick={() => authAdapter.connect()}
                        className="shrink-0 font-terminal text-[10px] tracking-widest uppercase px-3 py-1.5 border transition-all"
                        style={{ borderColor: '#ff4500', color: '#ff4500', backgroundColor: 'transparent', borderRadius: 0 }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,69,0,0.15)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        Connect
                      </button>
                    </div>
                  )}

                  {isWalletConnected && walletAddress && (
                    <div className="flex items-center justify-between px-1">
                      <span className="font-terminal text-[10px]" style={{ color: '#555' }}>Wallet</span>
                      <button
                        onClick={() => authAdapter.manageAccount()}
                        className="font-terminal text-[10px] tracking-widest"
                        style={{ color: '#4ade80' }}
                      >
                        ● {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                      </button>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || sharesNum <= 0}
                    className="w-full py-3 font-terminal text-xs font-bold tracking-widest uppercase transition-all"
                    style={{
                      backgroundColor: submitting ? '#333' : '#ff4500',
                      color: submitting ? '#666' : '#000',
                      borderRadius: 0,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submitting
                      ? 'Submitting…'
                      : isWalletConnected
                      ? `Buy ${sharesNum} ${side} @ ${priceNum}¢`
                      : `Paper Trade ${sharesNum} ${side} @ ${priceNum}¢`}
                  </button>
                </div>

                {/* Fill status */}
                <FillStatusPanel fill={fillResult} />
              </>
            )}
          </div>

          {/* ── RIGHT: Order book ── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="border panel-bracket" style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="t-label">Order Book</p>
                {book && (
                  <span className="font-terminal text-[10px]" style={{ color: '#555' }}>
                    mid {Math.round(book.mid_price * 100)}¢
                  </span>
                )}
              </div>
              <div className="p-3">
                <OrderBookPanel book={book} isLoading={loadingBook} />
              </div>
            </div>

            {/* Execution scores */}
            {analysis && (
              <div className="border panel-bracket p-4 space-y-3" style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
                <p className="t-label t-label-accent">Execution Quality</p>
                <div className="space-y-2">
                  {[
                    { label: 'Execution', value: analysis.executionScore, color: analysis.executionScore >= 60 ? '#4ade80' : analysis.executionScore >= 40 ? '#f59e0b' : '#f87171' },
                    { label: 'Activity', value: analysis.activityScore, color: analysis.activityScore >= 60 ? '#4ade80' : analysis.activityScore >= 30 ? '#f59e0b' : '#555' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="t-label">{label}</span>
                        <span className="font-terminal text-[10px]" style={{ color }}>{value}</span>
                      </div>
                      <div className="h-1" style={{ backgroundColor: '#1a1a1a', borderRadius: 0 }}>
                        <div className="h-full transition-all" style={{ width: `${value}%`, backgroundColor: color, borderRadius: 0 }} />
                      </div>
                    </div>
                  ))}
                </div>
                {analysis.daysToClose != null && (
                  <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span className="t-label">Closes in</span>
                    <span className="font-terminal text-[10px]" style={{ color: analysis.daysToClose <= 3 ? '#f59e0b' : '#a0a0a0' }}>
                      {analysis.daysToClose}d
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="flex-none border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Footer />
      </div>
    </div>
  );
}

export default function ExecutePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d0d0d' }}>
        <div className="w-6 h-6 border-2 border-[#ff4500]/30 border-t-[#ff4500] rounded-full animate-spin" />
      </div>
    }>
      <ExecuteContent />
    </Suspense>
  );
}
