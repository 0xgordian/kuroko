'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getTradeHistory,
  clearTradeHistory,
  exportTradeHistoryCSV,
  type TradeRecord,
} from '@/lib/services/tradeHistoryService';
import PnlCard from './PnlCard';
import { EmptyState } from '@/components/ui/empty-state';

const MODE_COLORS: Record<TradeRecord['mode'], string> = {
  PAPER_TRADE: '#f59e0b',
  SIGNING_REQUIRED: '#ff4500',
  EXECUTED: '#4ade80',
};

const MODE_LABELS: Record<TradeRecord['mode'], string> = {
  PAPER_TRADE: 'Paper',
  SIGNING_REQUIRED: 'Signing',
  EXECUTED: 'Live',
};

export default function TradeHistory() {
  const [records, setRecords] = useState<TradeRecord[]>([]);
  const [pnlTrade, setPnlTrade] = useState<TradeRecord | null>(null);

  const refresh = useCallback(() => setRecords(getTradeHistory()), []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [refresh]);

  const handleClear = () => {
    if (confirm('Clear all trade history?')) {
      clearTradeHistory();
      refresh();
    }
  };

  // ── Aggregate stats ───────────────────────────────────────────────
  const confirmed = records.filter((r) => r.status === 'confirmed');
  const resolved = confirmed.filter((r) => r.resolvedPnl !== undefined);
  const wins = resolved.filter((r) => (r.resolvedPnl ?? 0) > 0).length;
  const totalPnl = resolved.reduce((s, r) => s + (r.resolvedPnl ?? 0), 0);
  const totalDeployed = confirmed.reduce((s, r) => s + r.totalCost, 0);
  const winRate = resolved.length > 0 ? (wins / resolved.length) * 100 : null;
  const avgReturn = resolved.length > 0
    ? resolved.reduce((s, r) => {
        const ret = r.totalCost > 0 ? ((r.resolvedPnl ?? 0) / r.totalCost) * 100 : 0;
        return s + ret;
      }, 0) / resolved.length
    : null;

  return (
    <div style={{ backgroundColor: '#111', borderRadius: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
          {'Trade History'} <span style={{ color: '#ff4500' }}>{'// All Trades'}</span>
          {records.length > 0 && (
            <span className="ml-2 font-terminal text-[9px]" style={{ color: '#444' }}>
              {records.length}
            </span>
          )}
        </span>
        {records.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTradeHistoryCSV(records)}
              className="font-terminal text-[10px] tracking-widest uppercase px-2 py-1 border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#555', backgroundColor: 'transparent', borderRadius: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#a0a0a0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            >
              ↓ CSV
            </button>
            <button
              onClick={handleClear}
              className="font-terminal text-[10px] tracking-widest uppercase px-2 py-1 border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#444', backgroundColor: 'transparent', borderRadius: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#444'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <EmptyState variant="history" />
      ) : (
        <div className="overflow-x-auto">
          {/* Stats bar */}
          {confirmed.length > 0 && (
            <div className="flex items-center gap-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Trades', value: confirmed.length.toString(), color: '#f0f0f0' },
                { label: 'Deployed', value: `$${totalDeployed.toFixed(0)}`, color: '#f0f0f0' },
                { label: 'Realised P&L', value: resolved.length > 0 ? `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}` : '—', color: resolved.length > 0 ? (totalPnl >= 0 ? '#4ade80' : '#f87171') : '#555' },
                { label: 'Win Rate', value: winRate !== null ? `${winRate.toFixed(0)}%` : '—', color: winRate !== null ? (winRate >= 50 ? '#4ade80' : '#f87171') : '#555' },
                { label: 'Avg Return', value: avgReturn !== null ? `${avgReturn >= 0 ? '+' : ''}${avgReturn.toFixed(0)}%` : '—', color: avgReturn !== null ? (avgReturn >= 0 ? '#4ade80' : '#f87171') : '#555' },
              ].map(({ label, value, color }, i) => (
                <div key={label} className="flex-1 px-4 py-2.5 border-r" style={{ borderColor: 'rgba(255,255,255,0.06)', borderRight: i === 4 ? 'none' : undefined }}>
                  <p className="font-terminal text-[9px] tracking-widest uppercase mb-0.5" style={{ color: '#444' }}>{label}</p>
                  <p className="font-terminal text-xs font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          )}
          {/* Desktop table */}
          <table className="hidden lg:table w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {['Date', 'Market', 'Side', 'Shares', 'Price', 'Cost', 'Mode', 'Status', 'Outcome', ''].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-terminal text-[10px] tracking-widest uppercase"
                    style={{ color: '#444' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#161616')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="px-4 py-2.5 font-terminal text-[10px] whitespace-nowrap" style={{ color: '#555' }}>
                    {new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    <br />
                    <span style={{ color: '#333' }}>
                      {new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 max-w-[240px]">
                    <p className="line-clamp-2 leading-snug" style={{ color: '#a0a0a0' }}>
                      {r.marketQuestion}
                    </p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-terminal text-[10px] font-bold px-1.5 py-0.5 border"
                      style={{
                        color: r.side === 'YES' ? '#4ade80' : '#f87171',
                        borderColor: r.side === 'YES' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)',
                        backgroundColor: r.side === 'YES' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                      }}>
                      {r.side}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-terminal text-[11px]" style={{ color: '#f0f0f0' }}>
                    {r.shares}
                  </td>
                  <td className="px-4 py-2.5 font-terminal text-[11px]" style={{ color: '#f0f0f0' }}>
                    {r.pricePerShare}¢
                  </td>
                  <td className="px-4 py-2.5 font-terminal text-[11px]" style={{ color: '#f0f0f0' }}>
                    ${r.totalCost.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-terminal text-[10px] font-bold"
                      style={{ color: MODE_COLORS[r.mode] }}>
                      {MODE_LABELS[r.mode]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-terminal text-[10px]"
                      style={{ color: r.status === 'confirmed' ? '#4ade80' : r.status === 'failed' ? '#f87171' : '#555' }}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.resolvedPnl !== undefined ? (
                      <span className="font-terminal text-[10px] font-bold"
                        style={{ color: r.resolvedPnl >= 0 ? '#4ade80' : '#f87171' }}>
                        {r.resolvedPnl >= 0 ? '+' : ''}${r.resolvedPnl.toFixed(2)}
                      </span>
                    ) : r.mode === 'PAPER_TRADE' && r.status === 'confirmed' ? (
                      <span className="font-terminal text-[10px]" style={{ color: '#333' }}>pending</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => setPnlTrade(r)}
                      className="font-terminal text-[9px] tracking-widest uppercase px-2 py-1 border transition-colors"
                      style={{ borderColor: 'rgba(255,69,0,0.3)', color: '#ff4500', backgroundColor: 'transparent', borderRadius: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,69,0,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      PnL
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="lg:hidden divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {records.map((r) => (
              <div key={r.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs line-clamp-2 flex-1" style={{ color: '#a0a0a0' }}>
                    {r.marketQuestion}
                  </p>
                  <span className="font-terminal text-[10px] font-bold shrink-0"
                    style={{ color: MODE_COLORS[r.mode] }}>
                    {MODE_LABELS[r.mode]}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-terminal text-[10px]">
                  <span style={{ color: r.side === 'YES' ? '#4ade80' : '#f87171' }}>{r.side}</span>
                  <span style={{ color: '#555' }}>{r.shares} shares @ {r.pricePerShare}¢</span>
                  <span style={{ color: '#555' }}>${r.totalCost.toFixed(2)}</span>
                  <span className="ml-auto" style={{ color: '#444' }}>
                    {new Date(r.timestamp).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => setPnlTrade(r)}
                    className="font-terminal text-[9px] tracking-widest uppercase px-2 py-0.5 border"
                    style={{ borderColor: 'rgba(255,69,0,0.3)', color: '#ff4500', backgroundColor: 'transparent', borderRadius: 0 }}
                  >
                    PnL
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {pnlTrade && (
        <PnlCard
          trade={pnlTrade}
          onClose={() => setPnlTrade(null)}
        />
      )}
    </div>
  );
}
