'use client';

import type { Market } from '@/types';
import StatusIndicator from './StatusIndicator';

interface MarketFeedProps {
  markets?: Market[];
  isLoading?: boolean;
  isFallback?: boolean;
  statusMessage?: string;
  dataExplanation?: string;
  missing24hCount?: number;
  onRefresh?: () => void;
  onSelectMarket?: (market: Market) => void;
  selectedMarketId?: string | null;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
}

export default function MarketFeed({
  markets = [],
  isLoading = false,
  isFallback = false,
  statusMessage,
  missing24hCount = 0,
  onRefresh,
  onSelectMarket,
  selectedMarketId,
}: MarketFeedProps) {
  return (
    <div className="space-y-4 p-4">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="t-label">
          {'Markets'} <span className="t-label-accent">{'// Live'}</span>
        </span>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1 font-terminal text-[10px] tracking-widest uppercase transition-colors disabled:opacity-30"
          style={{ color: '#555' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#a0a0a0')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
        >
          <svg className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Status */}
      <StatusIndicator isFallback={isFallback} message={statusMessage} />

      {/* Desktop: scrollable list */}
      <div className="hidden lg:flex lg:flex-col lg:gap-1.5 lg:max-h-[580px] lg:overflow-y-auto">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[72px] animate-pulse border"
                style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.05)', borderRadius: 0 }} />
            ))
          : markets.map((market) => {
              const prob = market.currentProbability;
              const change = market.probabilityChange24h;
              const hasChange = change !== null && change !== undefined;
              const isSelected = selectedMarketId === market.id;
              const probColor = prob >= 65 ? '#ff4500' : prob >= 40 ? '#f0f0f0' : '#a0a0a0';
              const changeColor = !hasChange ? '#444' : change! > 0 ? '#4ade80' : '#f87171';
              return (
                <div
                  key={market.id}
                  onClick={() => onSelectMarket?.(market)}
                  className="border panel-bracket p-3 transition-all"
                  style={{
                    backgroundColor: isSelected ? '#1a1a1a' : 'transparent',
                    borderColor: isSelected ? 'rgba(255,69,0,0.4)' : 'rgba(255,255,255,0.08)',
                    borderRadius: 0,
                    cursor: onSelectMarket ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#161616';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }
                  }}
                >
                  <p className="text-xs leading-snug line-clamp-2 mb-2" style={{ color: '#a0a0a0' }}>
                    {market.question}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-terminal font-bold" style={{ color: probColor }}>{prob}%</span>
                    <div className="text-right">
                      <p className="font-terminal text-[11px] font-bold" style={{ color: changeColor }}>
                        {hasChange ? `${change! > 0 ? '+' : ''}${change!.toFixed(1)}%` : '—'}
                      </p>
                      <p className="font-terminal text-[10px]" style={{ color: '#555' }}>{formatVolume(market.volume)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="lg:hidden flex gap-3 overflow-x-auto pb-1">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-none w-44 h-20 animate-pulse border"
                style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.06)', borderRadius: 0 }} />
            ))
          : markets.map((market) => {
              const prob = market.currentProbability;
              const change = market.probabilityChange24h;
              const hasChange = change !== null && change !== undefined;
              const isSelected = selectedMarketId === market.id;
              const probColor = prob >= 65 ? '#ff4500' : prob >= 40 ? '#f0f0f0' : '#a0a0a0';
              const changeColor = !hasChange ? '#444' : change! > 0 ? '#4ade80' : '#f87171';
              return (
                <div
                  key={market.id}
                  onClick={() => onSelectMarket?.(market)}
                  className="flex-none w-44 border panel-bracket p-3 transition-all"
                  style={{
                    backgroundColor: isSelected ? '#1a1a1a' : '#111',
                    borderColor: isSelected ? 'rgba(255,69,0,0.4)' : 'rgba(255,255,255,0.08)',
                    borderRadius: 0,
                    cursor: onSelectMarket ? 'pointer' : 'default',
                  }}
                >
                  <p className="text-xs leading-snug line-clamp-2 mb-2 min-h-[2rem]" style={{ color: '#a0a0a0' }}>
                    {market.question}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-terminal font-bold" style={{ color: probColor }}>{prob}%</span>
                    <p className="font-terminal text-xs font-bold" style={{ color: changeColor }}>
                      {hasChange ? `${change! > 0 ? '+' : ''}${change!.toFixed(1)}%` : '—'}
                    </p>
                  </div>
                </div>
              );
            })}
      </div>

    </div>
  );
}