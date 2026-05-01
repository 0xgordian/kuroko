'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchUserPositions, type UserPosition } from '@/lib/services/clobService';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, WalletConnectPrompt } from '@/components/ui/empty-state';

interface PositionPanelProps {
  walletAddress?: string | null;
  isConnected?: boolean;
  compact?: boolean;
}

export default function PositionPanel({ walletAddress = null, isConnected = false, compact = false }: PositionPanelProps) {
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUserPositions(walletAddress);
      setPositions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (isConnected && walletAddress) {
      void load();
    } else {
      setPositions([]);
    }
  }, [isConnected, walletAddress, load]);

  return (
    <div style={{ backgroundColor: '#111', borderRadius: 0 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
          {'Positions'} <span style={{ color: '#ff4500' }}>{'// Open'}</span>
        </span>
        {isConnected && (
          <button
            onClick={load}
            disabled={isLoading}
            className="flex items-center gap-1 font-terminal text-[10px] tracking-widest uppercase transition-colors disabled:opacity-30"
            style={{ color: '#555' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#a0a0a0')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
          >
            <svg
              className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {!isConnected ? (
          <WalletConnectPrompt />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} style={{ height: 64 }} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            variant="positions"
            title="Failed to load positions"
            description={error}
            action={
              <button
                onClick={load}
                className="font-terminal text-[10px] tracking-widest uppercase px-3 py-1.5 border transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#a0a0a0', backgroundColor: 'transparent', borderRadius: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f0f0f0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#a0a0a0'; }}
              >
                Retry
              </button>
            }
          />
        ) : positions.length === 0 ? (
          <EmptyState variant="positions" />
        ) : (
          <div className="space-y-2">
            {positions.map((pos, i) => {
              const pnlPositive = pos.pnl >= 0;
              const pnlColor = pnlPositive ? '#4ade80' : '#f87171';
              const outcomeColor = pos.outcome === 'YES' ? '#4ade80' : '#f87171';

              return (
                <div
                  key={`${pos.market_id}-${i}`}
                  className="border p-3 space-y-2"
                  style={{
                    backgroundColor: '#0d0d0d',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 0,
                  }}
                >
                  {/* Question + outcome badge */}
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-xs leading-snug line-clamp-2 flex-1"
                      style={{ color: '#a0a0a0' }}
                    >
                      {pos.question}
                    </p>
                    <span
                      className="font-terminal text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 border shrink-0"
                      style={{
                        color: outcomeColor,
                        borderColor: outcomeColor,
                        backgroundColor: `${outcomeColor}18`,
                        borderRadius: 0,
                      }}
                    >
                      {pos.outcome}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <p
                        className="font-terminal text-[10px] tracking-widest uppercase"
                        style={{ color: '#555' }}
                      >
                        Size
                      </p>
                      <p className="text-xs font-terminal" style={{ color: '#f0f0f0' }}>
                        {pos.size.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p
                        className="font-terminal text-[10px] tracking-widest uppercase"
                        style={{ color: '#555' }}
                      >
                        Avg
                      </p>
                      <p className="text-xs font-terminal" style={{ color: '#f0f0f0' }}>
                        {Math.round(pos.avg_price * 100)}¢
                      </p>
                    </div>
                    <div>
                      <p
                        className="font-terminal text-[10px] tracking-widest uppercase"
                        style={{ color: '#555' }}
                      >
                        Cur
                      </p>
                      <p className="text-xs font-terminal" style={{ color: '#f0f0f0' }}>
                        {Math.round(pos.current_price * 100)}¢
                      </p>
                    </div>
                    <div>
                      <p
                        className="font-terminal text-[10px] tracking-widest uppercase"
                        style={{ color: '#555' }}
                      >
                        P&amp;L
                      </p>
                      <p className="text-xs font-terminal font-bold" style={{ color: pnlColor }}>
                        {pnlPositive ? '+' : ''}${pos.pnl.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
