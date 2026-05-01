'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, type FC } from 'react';
import { getTradeHistory, addTradeRecord, type TradeRecord } from '@/lib/services/tradeHistoryService';
import toast from 'react-hot-toast';

interface PositionCardProps {}

function isPositionRequest(text: string): boolean {
  const keywords = ['my positions', 'show my', 'my trades', 'portfolio', 'open positions', 'what am i'];
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function parsePositionRequest(text: string): boolean {
  return isPositionRequest(text);
}

export const PositionCard: FC = () => {
  const router = useRouter();
  const [positions, setPositions] = useState<TradeRecord[]>([]);
  const [totalPnl, setTotalPnl] = useState(0);

  useEffect(() => {
    const history = getTradeHistory();
    const open = history.filter((t) => t.status === 'pending' || t.status === 'confirmed');
    setPositions(open.slice(0, 5));
    // Only show resolved P&L — don't fabricate numbers for unresolved trades
    const resolvedPnl = open.reduce((acc, t) => {
      return t.resolvedPnl !== undefined ? acc + t.resolvedPnl : acc;
    }, 0);
    setTotalPnl(resolvedPnl);
  }, []);

  const pnlColor = totalPnl >= 0 ? '#4ade80' : '#f87171';

  if (positions.length === 0) {
    return (
      <div className="my-3 border p-4" style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
        <p className="text-sm font-terminal text-xs tracking-widest uppercase" style={{ color: '#555' }}>Positions</p>
        <p className="text-xs mt-2" style={{ color: '#666' }}>No open positions</p>
        <button
          onClick={() => router.push('/trade')}
          className="mt-3 text-xs font-bold uppercase"
          style={{ color: '#ff4500' }}
        >
          Explore Markets
        </button>
      </div>
    );
  }

  const handleClose = (position: TradeRecord) => {
    // Record a closing paper trade — opposite side at current probability (unknown, use entry price as proxy)
    addTradeRecord({
      marketQuestion: position.marketQuestion,
      marketId: position.marketId,
      side: position.side === 'YES' ? 'NO' : 'YES', // closing trade is opposite side
      shares: position.shares,
      pricePerShare: position.pricePerShare,
      totalCost: position.totalCost,
      mode: 'PAPER_TRADE',
      status: 'confirmed',
    });
    toast.success('Position closed (paper trade)', {
      style: { background: '#111', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 0 },
      iconTheme: { primary: '#4ade80', secondary: '#000' },
    });
    // Refresh positions list
    const history = getTradeHistory();
    const open = history.filter((t) => t.status === 'pending' || t.status === 'confirmed');
    setPositions(open.slice(0, 5));
  };

  return (
    <div className="my-3 border p-4" style={{ backgroundColor: '#111', borderColor: 'rgba(255,69,0,0.2)', borderRadius: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
          Your Positions
        </span>
        <span className="font-terminal text-xs" style={{ color: pnlColor }}>
          {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} P&L
        </span>
      </div>

      <div className="space-y-2">
        {positions.map((pos) => (
          <div
            key={pos.id}
            className="flex items-center justify-between text-xs border-b pb-2"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="flex-1 min-w-0 mr-2">
              <p className="truncate" style={{ color: '#a0a0a0' }}>{pos.marketQuestion}</p>
              <p className="font-terminal" style={{ color: '#666' }}>
                {pos.shares} {pos.side} @ {pos.pricePerShare}c
              </p>
            </div>
            <button
              onClick={() => handleClose(pos)}
              className="px-2 py-1 text-xs font-bold uppercase border shrink-0"
              style={{
                borderColor: 'rgba(255,255,255,0.15)',
                color: '#888',
                borderRadius: 0,
              }}
            >
              Close
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/portfolio')}
        className="mt-3 w-full py-2 text-xs font-bold uppercase border transition-colors"
        style={{
          borderColor: 'rgba(255,69,0,0.3)',
          color: '#ff4500',
          borderRadius: 0,
        }}
      >
        View All Positions
      </button>
    </div>
  );
};