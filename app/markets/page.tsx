'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import type { Market } from '@/types';
import { fetchActiveMarkets } from '@/lib/services/marketService';
import { addAlert } from '@/lib/services/alertService';
import { useAomiAuthAdapter } from '@/lib/aomi-auth-adapter';
import { useAppStore } from '@/lib/stores/appStore';
import toast from 'react-hot-toast';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import CategoryFilter, { filterByCategory, type MarketCategory } from '@/components/CategoryFilter';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type SortKey = 'volume_desc' | 'prob_asc' | 'prob_desc' | 'change_desc' | 'change7d_desc' | 'change30d_desc' | 'expiry_asc';
type VolumeFilter = 'all' | '10k' | '100k' | '1m';

const VOLUME_OPTIONS: { value: VolumeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '10k', label: '>$10K' },
  { value: '100k', label: '>$100K' },
  { value: '1m', label: '>$1M' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'volume_desc', label: 'Volume ↓' },
  { value: 'prob_asc', label: 'Probability ↑' },
  { value: 'prob_desc', label: 'Probability ↓' },
  { value: 'change_desc', label: '24h Change ↓' },
  { value: 'change7d_desc', label: '7d Change ↓' },
  { value: 'change30d_desc', label: '30d Change ↓' },
  { value: 'expiry_asc', label: 'Expiry ↑' },
];

const MONO_FONT = "var(--font-geist-mono), 'JetBrains Mono', monospace";

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full flex items-center justify-between gap-2 h-7 px-2.5 text-xs border transition-colors hover:border-white/20 hover:text-[#f0f0f0]"
          style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.12)', color: '#a0a0a0', borderRadius: 0, fontFamily: MONO_FONT }}
        >
          <span className="truncate">{current?.label ?? value}</span>
          <Icon icon="solar:alt-arrow-down-linear" className="w-3 h-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[160px] p-1 border z-[9999]"
        style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 0 }}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { onChange(opt.value); setOpen(false); }}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-[#161616] transition-colors"
            style={{
              color: value === opt.value ? '#f0f0f0' : '#a0a0a0',
              backgroundColor: value === opt.value ? '#161616' : 'transparent',
              borderRadius: 0,
              fontFamily: MONO_FONT,
            }}
          >
            <span>{opt.label}</span>
            {value === opt.value && <Icon icon="solar:check-circle-linear" className="w-3 h-3 shrink-0" style={{ color: '#ff4500' }} />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
}

function SkeletonCard() {
  return (
    <div
      className="border p-4 space-y-3 animate-pulse"
      style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}
    >
      <div className="h-3 w-3/4" style={{ backgroundColor: '#161616' }} />
      <div className="h-3 w-1/2" style={{ backgroundColor: '#161616' }} />
      <div className="h-8 w-16" style={{ backgroundColor: '#161616' }} />
      <div className="flex gap-2">
        <div className="h-7 flex-1" style={{ backgroundColor: '#161616' }} />
        <div className="h-7 flex-1" style={{ backgroundColor: '#161616' }} />
      </div>
    </div>
  );
}

function MarketsContent() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [activeCategory, setActiveCategory] = useState<MarketCategory>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('markets_activeCategory') as MarketCategory) ?? 'all';
    }
    return 'all';
  });
  const [search, setSearch] = useState('');
  const [minProb, setMinProb] = useState(1);
  const [maxProb, setMaxProb] = useState(99);
  const [volumeFilter, setVolumeFilter] = useState<VolumeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('volume_desc');

  // Persist category across navigations
  useEffect(() => {
    localStorage.setItem('markets_activeCategory', activeCategory);
  }, [activeCategory]);

  const authAdapter = useAomiAuthAdapter();
  const isWalletConnected = authAdapter.identity.isConnected;
  const hasLiveIntentPath = Boolean(process.env.NEXT_PUBLIC_AOMI_API_KEY);
  const liveModeLabel = hasLiveIntentPath
    ? isWalletConnected ? 'Signing Ready' : 'Connect Wallet'
    : 'Paper Mode';

  const setStoreMarkets = useAppStore((s) => s.setMarkets);

  const loadMarkets = useCallback(async () => {
    setIsLoading(true);
    const { markets: loaded, isFallback: fb } = await fetchActiveMarkets();
    setMarkets(loaded);
    setStoreMarkets(loaded);
    setIsFallback(fb);
    setIsLoading(false);
  }, [setStoreMarkets]);

  useEffect(() => { void loadMarkets(); }, [loadMarkets]);

  const filtered = useMemo(() => {
    let result = filterByCategory(markets, activeCategory).filter((m) => {
      if (search && !m.question.toLowerCase().includes(search.toLowerCase())) return false;
      if (m.currentProbability < minProb || m.currentProbability > maxProb) return false;
      if (volumeFilter === '10k' && m.volume < 10_000) return false;
      if (volumeFilter === '100k' && m.volume < 100_000) return false;
      if (volumeFilter === '1m' && m.volume < 1_000_000) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case 'volume_desc': return b.volume - a.volume;
        case 'prob_asc': return a.currentProbability - b.currentProbability;
        case 'prob_desc': return b.currentProbability - a.currentProbability;
        case 'change_desc': return Math.abs(b.probabilityChange24h ?? 0) - Math.abs(a.probabilityChange24h ?? 0);
        case 'change7d_desc': return Math.abs(b.probabilityChange7d ?? 0) - Math.abs(a.probabilityChange7d ?? 0);
        case 'change30d_desc': return Math.abs(b.probabilityChange30d ?? 0) - Math.abs(a.probabilityChange30d ?? 0);
        case 'expiry_asc': return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        default: return 0;
      }
    });

    return result;
  }, [markets, search, minProb, maxProb, volumeFilter, sortKey, activeCategory]);

  const resetFilters = () => {
    setActiveCategory('all');
    setSearch('');
    setMinProb(1);
    setMaxProb(99);
    setVolumeFilter('all');
    setSortKey('volume_desc');
  };

  const handleSetAlert = useCallback((market: Market) => {
    addAlert({
      marketId: market.id,
      marketQuestion: market.question,
      tokenId: market.clobTokenId,
      condition: market.currentProbability >= 50 ? 'above' : 'below',
      threshold: market.currentProbability,
    });
    toast.success(`Alert set: ${market.question.slice(0, 50)}…`, {
      style: { background: '#111', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 0 },
      iconTheme: { primary: '#ff4500', secondary: '#000' },
    });
  }, []);

  const filterSidebar = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="t-label">
          Filters <span className="t-label-accent">{'// Markets'}</span>
        </span>
        <button
          onClick={resetFilters}
          className="font-terminal text-[10px] tracking-widest uppercase transition-colors"
          style={{ color: '#555' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#a0a0a0')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
        >
          Reset
        </button>
      </div>

      {/* Category */}
      <div>
        <p className="font-terminal text-[10px] tracking-widest uppercase mb-1.5" style={{ color: '#555' }}>
          Category
        </p>
        <div className="flex flex-col gap-1">
          {['all', 'elections', 'crypto', 'sports', 'economics', 'tech', 'world'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as MarketCategory)}
              className="text-left px-2 py-1.5 border font-terminal text-[10px] tracking-widest uppercase transition-all"
              style={{
                backgroundColor: activeCategory === cat ? 'rgba(255,69,0,0.12)' : 'transparent',
                borderColor: activeCategory === cat ? '#ff4500' : 'rgba(255,255,255,0.08)',
                color: activeCategory === cat ? '#ff4500' : '#555',
                borderRadius: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div>
        <p className="font-terminal text-[10px] tracking-widest uppercase mb-1.5" style={{ color: '#555' }}>
          Search
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter markets..."
          className="w-full text-xs px-3 py-2 border outline-none"
          style={{
            backgroundColor: '#0d0d0d',
            borderColor: 'rgba(255,255,255,0.12)',
            color: '#f0f0f0',
            borderRadius: 0,
          }}
        />
      </div>

      {/* Probability range */}
      <div>
        <p className="font-terminal text-[10px] tracking-widest uppercase mb-1.5" style={{ color: '#555' }}>
          Probability Range
        </p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={1}
            max={99}
            value={minProb}
            onChange={(e) => setMinProb(Number(e.target.value))}
            className="w-full text-xs px-2 py-2 border outline-none font-terminal"
            style={{
              backgroundColor: '#0d0d0d',
              borderColor: 'rgba(255,255,255,0.12)',
              color: '#f0f0f0',
              borderRadius: 0,
            }}
            placeholder="Min %"
          />
          <span className="font-terminal text-[10px]" style={{ color: '#555' }}>—</span>
          <input
            type="number"
            min={1}
            max={99}
            value={maxProb}
            onChange={(e) => setMaxProb(Number(e.target.value))}
            className="w-full text-xs px-2 py-2 border outline-none font-terminal"
            style={{
              backgroundColor: '#0d0d0d',
              borderColor: 'rgba(255,255,255,0.12)',
              color: '#f0f0f0',
              borderRadius: 0,
            }}
            placeholder="Max %"
          />
        </div>
      </div>

      {/* Volume filter */}
      <div>
        <p className="font-terminal text-[10px] tracking-widest uppercase mb-1.5" style={{ color: '#555' }}>
          Volume
        </p>
        <FilterSelect<VolumeFilter>
          value={volumeFilter}
          onChange={setVolumeFilter}
          options={VOLUME_OPTIONS}
        />
      </div>

      {/* Sort */}
      <div>
        <p className="font-terminal text-[10px] tracking-widest uppercase mb-1.5" style={{ color: '#555' }}>
          Sort
        </p>
        <FilterSelect<SortKey>
          value={sortKey}
          onChange={setSortKey}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Count */}
      <p className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
        {isLoading ? '...' : `${filtered.length} markets`}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col pt-12 pb-16 lg:pb-0" style={{ backgroundColor: '#0d0d0d' }}>
      <TopNav
        isFallback={isFallback}
        isLoadingMarkets={isLoading}
        liveModeLabel={liveModeLabel}
        isWalletConnected={isWalletConnected}
        walletAddress={authAdapter.identity.address}
        rightSlot={null}
        onConnectWallet={!isWalletConnected ? () => authAdapter.connect() : undefined}
        onManageWallet={isWalletConnected ? () => authAdapter.manageAccount() : undefined}
      />

      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6">

        {/* Mobile: filter toggle */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="w-full py-2.5 border font-terminal text-[11px] tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'rgba(255,255,255,0.15)',
              color: '#a0a0a0',
              borderRadius: 0,
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            {filtersOpen ? 'Hide Filters' : 'Filters'}
            {!isLoading && (
              <span style={{ color: '#555' }}>({filtered.length})</span>
            )}
          </button>
          {filtersOpen && (
            <div className="border panel-bracket p-4 mt-2"
              style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
              {filterSidebar}
            </div>
          )}
        </div>

        {/* Desktop: 2-column layout */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-5 items-start">

          {/* Filter sidebar */}
          <div className="lg:col-span-3 lg:sticky lg:top-4">
            <div className="border panel-bracket p-4"
              style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
              {filterSidebar}
            </div>
          </div>

          {/* Market grid */}
          <div className="lg:col-span-9 space-y-3">
            {/* Category strip above grid on desktop */}
            <CategoryFilter
              value={activeCategory}
              onChange={setActiveCategory}
              markets={markets}
              showCounts
            />
            <MarketGrid
              markets={filtered}
              isLoading={isLoading}
              onSetAlert={handleSetAlert}
            />
          </div>
        </div>

        {/* Mobile: market grid */}
        <div className="lg:hidden space-y-3">
          <CategoryFilter
            value={activeCategory}
            onChange={setActiveCategory}
            markets={markets}
            showCounts
          />
          <MarketGrid
            markets={filtered}
            isLoading={isLoading}
            onSetAlert={handleSetAlert}
          />
        </div>

      </div>

      <div className="flex-none border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Footer />
      </div>
    </div>
  );
}

function MarketGrid({
  markets,
  isLoading,
  onSetAlert,
}: {
  markets: Market[];
  isLoading: boolean;
  onSetAlert: (market: Market) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(48);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#2a2a2a' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm" style={{ color: '#555' }}>No markets match your filters</p>
      </div>
    );
  }

  const visible = markets.slice(0, visibleCount);
  const hasMore = visibleCount < markets.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visible.map((market) => (
          <MarketCard key={market.id} market={market} onSetAlert={onSetAlert} />
        ))}
      </div>
      {hasMore && (
        <div className="flex items-center justify-center pt-2">
          <button
            onClick={() => setVisibleCount((c) => c + 48)}
            className="font-terminal text-[10px] tracking-widest uppercase px-6 py-2.5 border transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#a0a0a0', backgroundColor: 'transparent', borderRadius: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#f0f0f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#a0a0a0'; }}
          >
            Load More ({markets.length - visibleCount} remaining)
          </button>
        </div>
      )}
      <p className="font-terminal text-[10px] text-center" style={{ color: '#333' }}>
        Showing {visible.length} of {markets.length} markets
      </p>
    </div>
  );
}

function MarketCard({ market, onSetAlert }: { market: Market; onSetAlert: (m: Market) => void }) {
  const prob = market.currentProbability;
  const change = market.probabilityChange24h;
  const change7d = market.probabilityChange7d;
  const change30d = market.probabilityChange30d;
  const hasChange = change !== null && change !== undefined;
  const probColor = prob >= 65 ? '#ff4500' : prob >= 40 ? '#f0f0f0' : '#a0a0a0';
  const endDate = new Date(market.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const fmtChange = (v: number | null | undefined, label: string) => {
    if (v == null) return null;
    const color = v > 0 ? '#4ade80' : '#f87171';
    const bg = v > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)';
    return (
      <span key={label} className="font-terminal text-[10px] font-bold px-1.5 py-0.5"
        style={{ color, backgroundColor: bg, borderRadius: 0 }}>
        {label} {v > 0 ? '+' : ''}{v.toFixed(1)}%
      </span>
    );
  };

  return (
    <div
      className="border p-4 space-y-3 transition-all"
      style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#161616';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#111';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {/* Question */}
      <p className="text-sm leading-snug line-clamp-3" style={{ color: '#f0f0f0' }}>
        {market.question}
      </p>

      {/* Probability + change */}
      <div className="flex items-end gap-2 flex-wrap">
        <p
          className="text-2xl font-terminal font-bold"
          style={prob >= 65
            ? { color: '#ff4500', textShadow: '0 0 12px rgba(255,69,0,0.35)' }
            : { color: probColor }}
        >
          {prob}%
        </p>
        {hasChange && fmtChange(change!, '24h')}
        {fmtChange(change7d, '7d')}
        {fmtChange(change30d, '30d')}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 font-terminal text-[10px] tracking-wider">
        <span style={{ color: '#555' }}>VOL {formatVolume(market.volume)}</span>
        <span style={{ color: '#555' }}>LIQ {formatVolume(market.liquidity)}</span>
        <span style={{ color: '#555' }}>EXP {endDate}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Link
          href={`/trade?q=${encodeURIComponent(market.question)}`}
          className="flex-1 py-2 text-xs font-bold text-center transition-all"
          style={{ backgroundColor: '#ff4500', color: '#000', borderRadius: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ff6b35')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff4500')}
        >
          Analyze
        </Link>
        <button
          onClick={() => onSetAlert(market)}
          title="Set price alert"
          className="px-3 py-2 border transition-all flex items-center justify-center"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'rgba(255,255,255,0.15)',
            color: '#a0a0a0',
            borderRadius: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.30)';
            e.currentTarget.style.color = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.color = '#a0a0a0';
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d0d0d' }}>
        <div className="w-6 h-6 border-2 border-[#ff4500]/30 border-t-[#ff4500] rounded-full animate-spin" />
      </div>
    }>
      <MarketsContent />
    </Suspense>
  );
}
