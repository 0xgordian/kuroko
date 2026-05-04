'use client';

import { useRouter } from 'next/navigation';
import type { EdgeQueryResult, EdgeOpportunity } from '@/types';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import * as m from 'motion/react-m';

interface EdgeResultsProps {
  result: EdgeQueryResult | null;
  isLoading?: boolean;
  isQuerying?: boolean;
  onProposeBet?: (opportunity: EdgeOpportunity) => void | Promise<void>;
  onAskAomi?: (opportunity: EdgeOpportunity) => void;
  onSetAlert?: (opportunity: EdgeOpportunity) => void;
  /** ID of the market currently fetching CLOB price — shows spinner on that card */
  fetchingBetId?: string | null;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
}

// Strength config — purple only for STRONG, neutral for others
const strengthConfig = {
  STRONG: {
    borderColor: 'rgba(124,58,237,0.6)',
    badgeColor: '#7c3aed',
    badgeBg: 'rgba(124,58,237,0.15)',
    priceColor: '#7c3aed',
    priceGlow: true,
    icon: '▲',
  },
  MODERATE: {
    borderColor: 'rgba(255,255,255,0.18)',
    badgeColor: '#f0f0f0',
    badgeBg: 'rgba(255,255,255,0.08)',
    priceColor: '#f0f0f0',
    priceGlow: false,
    icon: '►',
  },
  WEAK: {
    borderColor: 'rgba(255,255,255,0.10)',
    badgeColor: '#777',
    badgeBg: 'rgba(255,255,255,0.05)',
    priceColor: '#a0a0a0',
    priceGlow: false,
    icon: '—',
  },
};

function OpportunityCard({ opp, onPropose, onAskAomi, onSetAlert, isFetchingBet }: {
  opp: EdgeOpportunity;
  onPropose?: () => void;
  onAskAomi?: () => void;
  onSetAlert?: () => void;
  isFetchingBet?: boolean;
}) {
  const router = useRouter();
  const cfg = strengthConfig[opp.edgeStrength];
  const change = opp.market.probabilityChange24h;
  const hasChange = change !== null && change !== undefined;

  const handleAskAI = () => {
    const change = opp.market.probabilityChange24h;
    const changeStr = change !== null && change !== undefined
      ? ` 24h change: ${change > 0 ? '+' : ''}${change.toFixed(1)}%.` : '';
    const msg = `Analyze this Polymarket opportunity: "${opp.market.question}" — currently at ${opp.market.currentProbability}% YES.${changeStr} Volume: ${(opp.market.volume / 1000).toFixed(0)}K. Edge score: ${opp.edgeScore}/100 (${opp.edgeStrength}) on the ${opp.side} side. Should I trade this? What's the risk/reward?`;
    router.push(`/?q=${encodeURIComponent(msg)}`);
  };

  return (
    <div className={`border panel-bracket p-4 space-y-4${opp.edgeStrength === 'STRONG' ? ' panel-strong' : ''}`}
      style={{ backgroundColor: '#111', borderColor: cfg.borderColor, borderRadius: 12 }}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Strength badge */}
          <div className="flex items-center gap-2">
            <span className="font-terminal text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 border"
              style={{
                color: cfg.badgeColor,
                backgroundColor: cfg.badgeBg,
                borderColor: cfg.borderColor,
                borderRadius: 12,
              }}>
              {cfg.icon} {opp.edgeStrength}
            </span>
            <span className="font-terminal text-[10px]" style={{ color: '#555' }}>
              SCORE {opp.edgeScore}/100
            </span>
          </div>
          {/* Market question — body font, readable size */}
          <p className="text-sm leading-snug" style={{ color: '#f0f0f0' }}>
            {opp.market.question}
          </p>
        </div>

        {/* Price — the most important number, large */}
        <div className="text-right shrink-0">
          <p className="text-2xl font-terminal font-bold"
            style={cfg.priceGlow
              ? { color: '#7c3aed', textShadow: '0 0 16px rgba(124,58,237,0.35)' }
              : { color: cfg.priceColor }}>
            {opp.referencePrice}¢
          </p>
          <p className="font-terminal text-[10px]" style={{ color: '#555' }}>{opp.side}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 font-terminal text-[10px] tracking-wider">
        <span style={{ color: '#555' }}>VOL {formatVolume(opp.market.volume)}</span>
        <span style={{ color: '#555' }}>LIQ {formatVolume(opp.market.liquidity)}</span>
        <span style={{ color: hasChange ? (change! > 0 ? '#4ade80' : '#f87171') : '#444' }}>
          24H {hasChange ? `${change! > 0 ? '+' : ''}${change!.toFixed(1)}%` : '—'}
        </span>
      </div>

      {/* Score breakdown — explains WHY this scored the way it did */}
      {opp.scoreBreakdown && (
        <div className="font-terminal text-[10px] tracking-wider" style={{ color: '#444' }}>
          {opp.scoreBreakdown}
        </div>
      )}

      {/* Reasoning */}
      <p className="text-sm leading-relaxed border-l-2 pl-3"
        style={{ color: '#a0a0a0', borderColor: 'rgba(255,255,255,0.08)' }}>
        {opp.reasoning}
      </p>

      {/* Action buttons — clear hierarchy */}
      <div className="flex gap-2 pt-1">
        {/* Primary: Simulate — full purple fill */}
        <button
          onClick={onPropose}
          disabled={isFetchingBet}
          className="flex-1 py-2.5 text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2"
          style={{ backgroundColor: isFetchingBet ? '#1a1a1a' : '#7c3aed', color: isFetchingBet ? '#555' : '#fff', borderRadius: 12, transition: 'all 0.15s ease' }}
          onMouseEnter={(e) => { if (!isFetchingBet) e.currentTarget.style.backgroundColor = '#8b5cf6'; }}
          onMouseLeave={(e) => { if (!isFetchingBet) e.currentTarget.style.backgroundColor = '#7c3aed'; }}
          onMouseDown={(e) => { if (!isFetchingBet) e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {isFetchingBet ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fetching Price...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Simulate Bet
            </>
          )}
        </button>

        {/* Secondary: Ask AI — navigates to AI page with context */}
        {onAskAomi && (
          <button
            onClick={handleAskAI}
            className="px-4 py-2.5 text-xs font-medium border transition-all flex items-center gap-1.5 whitespace-nowrap"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'rgba(255,255,255,0.15)',
              color: '#a0a0a0',
              borderRadius: 12,
              transition: 'all 0.15s ease',
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Ask AI
          </button>
        )}

        {/* Tertiary: Set Alert — icon-only ghost */}
        {onSetAlert && (
          <button
            onClick={onSetAlert}
            title="Set price alert"
            className="px-3 py-2.5 border transition-all flex items-center justify-center"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'rgba(255,255,255,0.15)',
              color: '#a0a0a0',
              borderRadius: 12,
              transition: 'all 0.15s ease',
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
        )}
      </div>
    </div>
  );
}

export default function EdgeResults({ result, isLoading, isQuerying, onProposeBet, onAskAomi, onSetAlert, fetchingBetId }: EdgeResultsProps) {
  const loading = isLoading ?? isQuerying ?? false;
  
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-3 w-40 animate-pulse" style={{ backgroundColor: '#161616' }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse border panel-bracket"
            style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#2a2a2a' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm" style={{ color: '#555' }}>Run a query to find opportunities</p>
        <p className="text-xs mt-1" style={{ color: '#555' }}>Try: {'"'}election markets{'"'} or {'"'}near 50%{'"'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="border panel-bracket p-3 space-y-1"
        style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
        <p className="font-terminal text-[10px] tracking-wider" style={{ color: '#555' }}>
          QUERY: <span style={{ color: '#a0a0a0' }}>{result.query}</span>
        </p>
        <p className="text-sm" style={{ color: '#a0a0a0' }}>{result.summary}</p>
      </div>

      {result.opportunities.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: '#555' }}>
          No opportunities found — try a different query
        </p>
      ) : (
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user">
            {result.opportunities.map((opp, i) => (
              <m.div
                key={`${opp.market.id}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 9) * 0.04, duration: 0.2, ease: 'easeOut' }}
              >
                <OpportunityCard
                  opp={opp}
                  onPropose={onProposeBet ? () => onProposeBet(opp) : undefined}
                  onAskAomi={onAskAomi ? () => onAskAomi(opp) : undefined}
                  onSetAlert={onSetAlert ? () => onSetAlert(opp) : undefined}
                  isFetchingBet={fetchingBetId === opp.market.id}
                />
              </m.div>
            ))}
          </MotionConfig>
        </LazyMotion>
      )}

      <p className="font-terminal text-[10px] text-right" style={{ color: '#555' }}>
        {new Date(result.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
}
