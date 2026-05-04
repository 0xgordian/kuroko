'use client';

import type { Market } from '@/types';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import * as m from 'motion/react-m';

interface TrendingMarketsProps {
  markets?: Market[];
  isLoading?: boolean;
  onSelectMarket?: (market: Market) => void;
  selectedMarketId?: string | null;
}

function trendingScore(m: Market): number {
  const volScore = Math.min(m.volume / 1_000_000, 1) * 40;
  const changeScore = Math.abs(m.probabilityChange24h ?? 0) * 2;
  const nearFifty = 20 - Math.abs(m.currentProbability - 50) * 0.4;
  return volScore + changeScore + nearFifty;
}

export default function TrendingMarkets({
  markets = [],
  isLoading = false,
  onSelectMarket,
  selectedMarketId = null,
}: TrendingMarketsProps) {
  const top5 = [...markets]
    .sort((a, b) => trendingScore(b) - trendingScore(a))
    .slice(0, 5);

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <span className="t-label">
        Trending <span className="t-label-accent">{'// Hot Markets'}</span>
      </span>

      {/* Rows */}
      <div className="space-y-1.5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse border"
                style={{ backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12 }}
              />
            ))
          : top5.length === 0
            ? (
              <p className="text-xs py-4 text-center" style={{ color: '#555' }}>
                Loading markets...
              </p>
            )
            : (
              <LazyMotion features={domAnimation}>
                <MotionConfig reducedMotion="user">
                  {top5.map((market, rank) => {
                    const prob = market.currentProbability;
                    const change = market.probabilityChange24h;
                    const hasChange = change !== null && change !== undefined;
                    const isSelected = selectedMarketId === market.id;
                    const probColor = prob >= 65 ? '#7c3aed' : prob >= 40 ? '#f0f0f0' : '#a0a0a0';
                    const changeColor = !hasChange ? '#444' : change! > 0 ? '#4ade80' : '#f87171';

                    return (
                      <m.div
                        key={market.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(rank, 9) * 0.04, duration: 0.2, ease: 'easeOut' }}
                      >
                        <div
                          onClick={() => onSelectMarket?.(market)}
                          className="flex items-center gap-3 p-2.5 border transition-all cursor-pointer"
                          style={{
                            backgroundColor: isSelected ? 'rgba(124,58,237,0.1)' : 'transparent',
                            borderColor: isSelected ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)',
                            borderRadius: 12,
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
                          {/* Rank indicator */}
                          <span className="font-terminal text-[10px] shrink-0 w-4 text-center" style={{ color: rank === 0 ? '#7c3aed' : '#444' }}>
                            {rank + 1}
                          </span>

                          {/* Question */}
                          <p className="flex-1 text-xs leading-snug line-clamp-2" style={{ color: '#a0a0a0' }}>
                            {market.question}
                          </p>

                          {/* Right: prob + change */}
                          <div className="text-right shrink-0">
                            <p className="font-terminal text-sm font-bold" style={{ color: probColor }}>
                              {prob}%
                            </p>
                            <p className="font-terminal text-[10px]" style={{ color: changeColor }}>
                              {hasChange ? `${change! > 0 ? '+' : ''}${change!.toFixed(1)}%` : '—'}
                            </p>
                          </div>
                        </div>
                      </m.div>
                    );
                  })}
                </MotionConfig>
              </LazyMotion>
            )}
      </div>
    </div>
  );
}
