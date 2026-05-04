'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Market } from '@/types';
import {
  getGuards,
  addGuard,
  removeGuard,
  toggleGuard,
  analyseGuard,
  calculateDefaultThresholds,
  validateGuardThresholds,
  type PositionGuard,
  type GuardAnalysis,
} from '@/lib/services/positionGuardService';
import { EmptyState } from '@/components/ui/empty-state';

interface PositionGuardPanelProps {
  markets: Market[];
}

const ACTION_COLORS = {
  SELL:   { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.3)'   },
  REDUCE: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
  HOLD:   { color: '#a0a0a0', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
};

export default function PositionGuardPanel({ markets }: PositionGuardPanelProps) {
  const [guards, setGuards] = useState<PositionGuard[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, GuardAnalysis>>({});
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [shares, setShares] = useState('100');
  const [entryPrice, setEntryPrice] = useState('50');
  const [takeProfit, setTakeProfit] = useState('60');
  const [stopLoss, setStopLoss] = useState('40');
  const [validationError, setValidationError] = useState('');

  const refresh = useCallback(() => setGuards(getGuards()), []);

  useEffect(() => { refresh(); }, [refresh]);

  // Run analysis for all active guards against current market prices
  useEffect(() => {
    if (!markets.length || !guards.length) return;
    const probMap: Record<string, number> = {};
    markets.forEach((m) => { probMap[m.id] = m.currentProbability; });

    const newAnalyses: Record<string, GuardAnalysis> = {};
    guards.forEach((g) => {
      if (!g.active) return;
      const prob = probMap[g.marketId];
      if (prob !== undefined) {
        newAnalyses[g.id] = analyseGuard(g, prob);
      }
    });
    setAnalyses(newAnalyses);
  }, [markets, guards]);

  // Pre-fill thresholds when market selected
  useEffect(() => {
    if (!selectedMarket) return;
    const defaults = calculateDefaultThresholds(selectedMarket.currentProbability);
    setTakeProfit(String(defaults.takeProfit));
    setStopLoss(String(defaults.stopLoss));
    setEntryPrice(String(selectedMarket.currentProbability));
  }, [selectedMarket]);

  const filteredMarkets = markets
    .filter((m) => m.question.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  const handleAdd = () => {
    if (!selectedMarket) return;
    const tp = parseInt(takeProfit, 10);
    const sl = parseInt(stopLoss, 10);
    const sh = parseInt(shares, 10);
    const ep = parseInt(entryPrice, 10);

    const validation = validateGuardThresholds(sl, tp);
    if (!validation.valid) { setValidationError(validation.error ?? 'Invalid thresholds'); return; }
    if (sh < 1) { setValidationError('Shares must be at least 1'); return; }

    addGuard({
      marketId: selectedMarket.id,
      marketQuestion: selectedMarket.question,
      clobTokenId: selectedMarket.clobTokenId,
      shares: sh,
      entryPrice: ep,
      takeProfit: tp,
      stopLoss: sl,
    });
    refresh();
    setShowForm(false);
    setSearch('');
    setSelectedMarket(null);
    setValidationError('');
  };

  const triggeredCount = Object.values(analyses).filter((a) => a.action !== 'HOLD').length;

  return (
    <div style={{ backgroundColor: '#111', borderRadius: 12 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
          Position Guard{' '}
          <span style={{ color: '#7c3aed' }}>{'// Auto Rules'}</span>
          {triggeredCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 font-terminal text-[9px]"
              style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
              {triggeredCount} triggered
            </span>
          )}
        </span>
        <button
          onClick={() => { setShowForm((v) => !v); setValidationError(''); }}
          className="font-terminal text-[10px] tracking-widest uppercase px-2 py-1 border transition-colors"
          style={{
            borderColor: showForm ? '#7c3aed' : 'rgba(255,255,255,0.12)',
            color: showForm ? '#7c3aed' : '#555',
            backgroundColor: 'transparent',
            borderRadius: 12,
          }}
        >
          {showForm ? '✕ Cancel' : '+ Add Guard'}
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Add guard form */}
        {showForm && (
          <div className="border p-3 space-y-3"
            style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#0d0d0d', borderRadius: 12 }}>
            <p className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
              New Guard
            </p>

            {/* Market search */}
            <div>
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedMarket(null); }}
                className="w-full px-3 py-2 text-xs border outline-none"
                style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.12)', color: '#f0f0f0', borderRadius: 12 }}
              />
              {search && !selectedMarket && filteredMarkets.length > 0 && (
                <div className="border border-t-0 max-h-40 overflow-y-auto"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#111' }}>
                  {filteredMarkets.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedMarket(m); setSearch(m.question.slice(0, 60)); }}
                      className="w-full text-left px-3 py-2 text-xs border-b transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.05)', color: '#a0a0a0', backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#161616')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span className="font-terminal text-[10px] mr-2" style={{ color: '#7c3aed' }}>
                        {m.currentProbability}%
                      </span>
                      {m.question.slice(0, 70)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inputs grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Shares', value: shares, set: setShares, min: 1 },
                { label: 'Entry Price (¢)', value: entryPrice, set: setEntryPrice, min: 1 },
                { label: 'Take-Profit %', value: takeProfit, set: setTakeProfit, min: 1 },
                { label: 'Stop-Loss %', value: stopLoss, set: setStopLoss, min: 1 },
              ].map(({ label, value, set, min }) => (
                <div key={label}>
                  <p className="font-terminal text-[9px] tracking-widest uppercase mb-1" style={{ color: '#444' }}>{label}</p>
                  <input
                    type="number"
                    min={min}
                    max={99}
                    value={value}
                    onChange={(e) => { set(e.target.value); setValidationError(''); }}
                    className="w-full px-2 py-1.5 text-xs border outline-none font-terminal"
                    style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.12)', color: '#f0f0f0', borderRadius: 12 }}
                  />
                </div>
              ))}
            </div>

            {validationError && (
              <p className="font-terminal text-[10px]" style={{ color: '#f87171' }}>{validationError}</p>
            )}

            <button
              onClick={handleAdd}
              disabled={!selectedMarket}
              className="w-full py-2 text-xs font-bold transition-all font-terminal tracking-widest uppercase"
              style={{
                backgroundColor: selectedMarket ? '#7c3aed' : '#1a1a1a',
                color: selectedMarket ? '#fff' : '#555',
                borderRadius: 12,
              }}
            >
              Save Guard
            </button>
          </div>
        )}

        {/* Guard list */}
        {guards.length === 0 && !showForm ? (
          <div className="py-8 text-center">
            <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#333' }}>No guards set</p>
            <p className="text-xs" style={{ color: '#444' }}>Add a guard to auto-monitor take-profit and stop-loss</p>
          </div>
        ) : (
          <div className="space-y-2">
            {guards.map((guard) => {
              const analysis = analyses[guard.id];
              const actionCfg = analysis ? ACTION_COLORS[analysis.action] : ACTION_COLORS.HOLD;
              const currentProb = analysis?.currentProbability;

              return (
                <div key={guard.id} className="border p-3 space-y-2"
                  style={{
                    borderColor: analysis?.action !== 'HOLD' ? actionCfg.border : 'rgba(255,255,255,0.08)',
                    backgroundColor: analysis?.action !== 'HOLD' ? actionCfg.bg : '#0d0d0d',
                    borderRadius: 12,
                    opacity: guard.active ? 1 : 0.5,
                  }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs line-clamp-2 flex-1" style={{ color: guard.active ? '#a0a0a0' : '#555' }}>
                      {guard.marketQuestion}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {analysis && (
                        <span className="font-terminal text-[9px] tracking-widest uppercase px-1.5 py-0.5 border"
                          style={{ color: actionCfg.color, borderColor: actionCfg.border, backgroundColor: actionCfg.bg, borderRadius: 12 }}>
                          {analysis.action}
                        </span>
                      )}
                      <button
                        onClick={() => { toggleGuard(guard.id); refresh(); }}
                        className="font-terminal text-[9px] tracking-widest uppercase px-1.5 py-0.5 border transition-colors"
                        style={{
                          borderColor: guard.active ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)',
                          color: guard.active ? '#4ade80' : '#555',
                          backgroundColor: 'transparent',
                          borderRadius: 12,
                        }}
                      >
                        {guard.active ? 'On' : 'Off'}
                      </button>
                      <button
                        onClick={() => { removeGuard(guard.id); refresh(); }}
                        className="text-xs transition-colors"
                        style={{ color: '#444' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-terminal text-[10px]" style={{ color: '#555' }}>
                      {guard.shares} shares @ {guard.entryPrice}¢
                    </span>
                    <span className="font-terminal text-[10px]" style={{ color: '#4ade80' }}>
                      TP {guard.takeProfit}%
                    </span>
                    <span className="font-terminal text-[10px]" style={{ color: '#f87171' }}>
                      SL {guard.stopLoss}%
                    </span>
                    {currentProb !== undefined && (
                      <span className="font-terminal text-[10px] ml-auto" style={{ color: '#f0f0f0' }}>
                        Now {currentProb}%
                      </span>
                    )}
                  </div>

                  {analysis && analysis.action !== 'HOLD' && (
                    <p className="text-xs leading-snug" style={{ color: '#a0a0a0' }}>
                      {analysis.rationale}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
