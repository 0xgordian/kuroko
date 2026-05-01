'use client';

import { useRef, useCallback } from 'react';
import type { TradeRecord } from '@/lib/services/tradeHistoryService';

interface PnlCardProps {
  trade: TradeRecord;
  onClose: () => void;
}

export default function PnlCard({ trade: record, onClose }: PnlCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const estimatedPayout = record.shares; // 1 share =  if correct
  const estimatedReturn = record.totalCost > 0
    ? ((estimatedPayout - record.totalCost) / record.totalCost) * 100
    : 0;
  const isProfit = estimatedReturn > 0;

  const modeLabel = record.mode === 'EXECUTED' ? 'LIVE TRADE' : record.mode === 'SIGNING_REQUIRED' ? 'SIGNED' : 'PAPER TRADE';
  const modeColor = record.mode === 'EXECUTED' ? '#4ade80' : record.mode === 'SIGNING_REQUIRED' ? '#ff4500' : '#f59e0b';

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      // Use html2canvas if available, otherwise just trigger print
      const html2canvas = (await import('html2canvas').catch(() => null))?.default;
      if (html2canvas) {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: '#111',
          scale: 2,
        });
        const link = document.createElement('a');
        link.download = `kuroko-trade-${record.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  }, [record.id]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>

      <div className="w-full max-w-sm space-y-3">
        {/* The card itself */}
        <div
          ref={cardRef}
          className="border panel-bracket p-6 space-y-5"
          style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#ff4500' }}>
                KUROKO
              </p>
              <p className="font-terminal text-[10px] tracking-widest uppercase mt-0.5" style={{ color: '#444' }}>
                Trade Record
              </p>
            </div>
            <span
              className="font-terminal text-[10px] font-bold tracking-widest uppercase px-2 py-1 border"
              style={{ color: modeColor, borderColor: modeColor, backgroundColor: `${modeColor}15`, borderRadius: 0 }}
            >
              {modeLabel}
            </span>
          </div>

          {/* Market */}
          <div className="border-l-2 pl-3" style={{ borderColor: 'rgba(255,69,0,0.4)' }}>
            <p className="text-sm leading-snug" style={{ color: '#f0f0f0' }}>
              {record.marketQuestion}
            </p>
          </div>

          {/* Trade details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Side</p>
              <p className="text-lg font-terminal font-bold"
                style={{ color: record.side === 'YES' ? '#4ade80' : '#f87171' }}>
                {record.side}
              </p>
            </div>
            <div>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Shares</p>
              <p className="text-lg font-terminal font-bold" style={{ color: '#f0f0f0' }}>
                {record.shares}
              </p>
            </div>
            <div>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Entry Price</p>
              <p className="text-lg font-terminal font-bold" style={{ color: '#f0f0f0' }}>
                {record.pricePerShare}¢
              </p>
            </div>
            <div>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Cost</p>
              <p className="text-lg font-terminal font-bold" style={{ color: '#f0f0f0' }}>
                ${record.totalCost.toFixed(2)}
              </p>
            </div>
          </div>

          {/* P&L highlight */}
          <div className="border p-4"
            style={{ backgroundColor: '#0d0d0d', borderColor: isProfit ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)', borderRadius: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>
                  If Correct
                </p>
                <p className="text-3xl font-terminal font-bold"
                  style={{ color: '#ff4500', textShadow: '0 0 16px rgba(255,69,0,0.35)' }}>
                  ${estimatedPayout.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>
                  Return
                </p>
                <p className="text-3xl font-terminal font-bold"
                  style={{ color: isProfit ? '#4ade80' : '#f87171' }}>
                  {isProfit ? '+' : ''}{estimatedReturn.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="font-terminal text-[10px]" style={{ color: '#333' }}>
              {new Date(record.timestamp).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
            <p className="font-terminal text-[10px]" style={{ color: '#333' }}>
              kuroko
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 text-xs font-terminal font-bold tracking-widest uppercase transition-all"
            style={{ backgroundColor: '#ff4500', color: '#000', borderRadius: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ff6b35')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff4500')}
          >
            ↓ Save Image
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-terminal font-medium border transition-all"
            style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#a0a0a0', borderRadius: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#a0a0a0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
