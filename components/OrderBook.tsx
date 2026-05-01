'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchOrderBook, type OrderBook } from '@/lib/services/clobService';

interface OrderBookProps {
  tokenId?: string | null;
  marketQuestion?: string;
}

export default function OrderBook({ tokenId = null, marketQuestion = '' }: OrderBookProps) {
  const [book, setBook] = useState<OrderBook | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    const data = await fetchOrderBook(id);
    setBook(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!tokenId) {
      setBook(null);
      return;
    }

    void load(tokenId);

    intervalRef.current = setInterval(() => {
      void load(tokenId);
    }, 10_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tokenId, load]);

  const topBids = book ? book.bids.slice(0, 5) : [];
  const topAsks = book ? book.asks.slice(0, 5) : [];

  return (
    <div style={{ backgroundColor: '#111', borderRadius: 0 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
          {'Order Book'} <span style={{ color: '#ff4500' }}>{'// Live'}</span>
        </span>
        {isLoading && (
          <svg
            className="w-3 h-3 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: '#555' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
      </div>

      <div className="p-4">
        {!tokenId ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: '#2a2a2a' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-xs" style={{ color: '#555' }}>
              Select a market to view order book
            </p>
          </div>
        ) : isLoading && !book ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-6 animate-pulse"
                style={{ backgroundColor: '#161616', borderRadius: 0 }}
              />
            ))}
          </div>
        ) : !book ? (
          <p className="text-xs text-center py-6" style={{ color: '#555' }}>
            Order book unavailable
          </p>
        ) : (
          <div className="space-y-4">
            {/* Market question */}
            {marketQuestion && (
              <p className="text-xs line-clamp-1" style={{ color: '#555' }}>
                {marketQuestion}
              </p>
            )}

            {/* Key stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border p-2" style={{ borderColor: 'rgba(255,255,255,0.06)', borderRadius: 0 }}>
                <p className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
                  Best Bid
                </p>
                <p className="text-sm font-terminal font-bold" style={{ color: '#4ade80' }}>
                  {Math.round(book.best_bid * 100)}¢
                </p>
              </div>
              <div className="border p-2" style={{ borderColor: 'rgba(255,255,255,0.06)', borderRadius: 0 }}>
                <p className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
                  Best Ask
                </p>
                <p className="text-sm font-terminal font-bold" style={{ color: '#f87171' }}>
                  {Math.round(book.best_ask * 100)}¢
                </p>
              </div>
              <div className="border p-2" style={{ borderColor: 'rgba(255,255,255,0.06)', borderRadius: 0 }}>
                <p className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
                  Spread
                </p>
                <p className="text-sm font-terminal font-bold" style={{ color: '#a0a0a0' }}>
                  {Math.round(book.spread * 10000)} bps
                </p>
              </div>
            </div>

            {/* Mid price */}
            <div className="flex items-center gap-2">
              <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
                Mid
              </span>
              <span className="font-terminal text-xs font-bold" style={{ color: '#f0f0f0' }}>
                {Math.round(book.mid_price * 100)}¢
              </span>
            </div>

            {/* Bids / Asks table */}
            <div className="grid grid-cols-2 gap-3">
              {/* Bids */}
              <div>
                <p
                  className="font-terminal text-[10px] tracking-widest uppercase mb-1.5"
                  style={{ color: '#4ade80' }}
                >
                  Bids
                </p>
                <div className="space-y-0.5">
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    <span className="font-terminal text-[9px] tracking-widest uppercase" style={{ color: '#444' }}>
                      Price
                    </span>
                    <span
                      className="font-terminal text-[9px] tracking-widest uppercase text-right"
                      style={{ color: '#444' }}
                    >
                      Size
                    </span>
                  </div>
                  {topBids.length === 0 ? (
                    <p className="font-terminal text-[10px]" style={{ color: '#333' }}>
                      —
                    </p>
                  ) : (
                    topBids.map((bid, i) => (
                      <div key={i} className="grid grid-cols-2 gap-1">
                        <span className="font-terminal text-[11px]" style={{ color: '#4ade80' }}>
                          {Math.round(parseFloat(bid.price) * 100)}¢
                        </span>
                        <span
                          className="font-terminal text-[11px] text-right"
                          style={{ color: '#a0a0a0' }}
                        >
                          {parseFloat(bid.size).toFixed(0)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Asks */}
              <div>
                <p
                  className="font-terminal text-[10px] tracking-widest uppercase mb-1.5"
                  style={{ color: '#f87171' }}
                >
                  Asks
                </p>
                <div className="space-y-0.5">
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    <span className="font-terminal text-[9px] tracking-widest uppercase" style={{ color: '#444' }}>
                      Price
                    </span>
                    <span
                      className="font-terminal text-[9px] tracking-widest uppercase text-right"
                      style={{ color: '#444' }}
                    >
                      Size
                    </span>
                  </div>
                  {topAsks.length === 0 ? (
                    <p className="font-terminal text-[10px]" style={{ color: '#333' }}>
                      —
                    </p>
                  ) : (
                    topAsks.map((ask, i) => (
                      <div key={i} className="grid grid-cols-2 gap-1">
                        <span className="font-terminal text-[11px]" style={{ color: '#f87171' }}>
                          {Math.round(parseFloat(ask.price) * 100)}¢
                        </span>
                        <span
                          className="font-terminal text-[11px] text-right"
                          style={{ color: '#a0a0a0' }}
                        >
                          {parseFloat(ask.size).toFixed(0)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
