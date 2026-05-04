'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchPriceHistory, type HistoryInterval, type PricePoint } from '@/lib/services/priceHistoryService';

interface PriceChartProps {
  tokenId: string | null;
  marketQuestion: string;
}

const RANGES: { label: string; value: HistoryInterval }[] = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
];

export default function PriceChart({ tokenId, marketQuestion }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null);
  const seriesRef = useRef<ReturnType<import('lightweight-charts').IChartApi['addSeries']> | null>(null);
  const [range, setRange] = useState<HistoryInterval>('1w');
  const [isLoading, setIsLoading] = useState(false);
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  // Init chart once
  useEffect(() => {
    if (!containerRef.current) return;

    let chart: ReturnType<typeof import('lightweight-charts').createChart> | null = null;

    import('lightweight-charts').then(({ createChart, LineStyle }) => {
      if (!containerRef.current) return;

      chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 220,
        layout: {
          background: { color: '#111' },
          textColor: '#555',
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        crosshair: {
          vertLine: { color: 'rgba(124,58,237,0.4)', style: LineStyle.Dashed },
          horzLine: { color: 'rgba(124,58,237,0.4)', style: LineStyle.Dashed },
        },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.08)',
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.08)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: true,
        handleScale: true,
      });

const series = chart.addSeries('Area' as unknown as Parameters<typeof chart.addSeries>[0], {
        lineColor: '#7c3aed',
        topColor: 'rgba(124,58,237,0.18)',
        bottomColor: 'rgba(124,58,237,0.01)',
        lineWidth: 2,
      });

      chartRef.current = chart;
      seriesRef.current = series;

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
      };
    });

    return () => {
      if (chart) {
        chart.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  const loadData = useCallback(async (id: string, r: HistoryInterval) => {
    setIsLoading(true);
    const data = await fetchPriceHistory(id, r);
    setPoints(data);

    if (data.length > 0) {
      const last = data[data.length - 1].value;
      const first = data[0].value;
      setCurrentPrice(last);
      setPriceChange(last - first);
    } else {
      setCurrentPrice(null);
      setPriceChange(null);
    }

    // Wait for chart to be ready (dynamic import may still be in progress)
    const applyData = (retries = 0) => {
      if (seriesRef.current) {
        if (data.length > 0) {
          seriesRef.current.setData(
            data.map((pt) => ({ time: pt.time as import('lightweight-charts').Time, value: pt.value })),
          );
          chartRef.current?.timeScale().fitContent();
        } else {
          seriesRef.current.setData([]);
        }
      } else if (retries < 10) {
        // Chart still initializing — retry after 100ms
        setTimeout(() => applyData(retries + 1), 100);
      }
    };
    applyData();

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (tokenId) {
      void loadData(tokenId, range);
    } else {
      setPoints([]);
      setCurrentPrice(null);
      setPriceChange(null);
      seriesRef.current?.setData([]);
    }
  }, [tokenId, range, loadData]);

  const changePositive = priceChange !== null && priceChange >= 0;

  return (
    <div style={{ backgroundColor: '#111', borderRadius: 12 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
          {'Price History'} <span style={{ color: '#a78bfa' }}>{'// Chart'}</span>
        </span>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className="font-terminal text-[10px] tracking-widest uppercase px-2 py-1 transition-colors"
              style={{
                color: range === r.value ? '#7c3aed' : '#555',
                backgroundColor: range === r.value ? 'rgba(124,58,237,0.1)' : 'transparent',
                borderRadius: 8,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price summary */}
      {currentPrice !== null && (
        <div className="flex items-center gap-4 px-4 pt-3">
          <span className="text-2xl font-terminal font-bold"
            style={{ color: '#7c3aed', textShadow: '0 0 12px rgba(124,58,237,0.3)' }}>
            {currentPrice.toFixed(1)}%
          </span>
          {priceChange !== null && (
            <span className="font-terminal text-xs font-bold"
              style={{ color: changePositive ? '#4ade80' : '#f87171' }}>
              {changePositive ? '+' : ''}{priceChange.toFixed(1)}pp
            </span>
          )}
          {isLoading && (
            <svg className="w-3 h-3 animate-spin ml-auto" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" style={{ color: '#555' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </div>
      )}

      {marketQuestion && (
        <p className="px-4 pt-1 pb-2 text-xs line-clamp-1" style={{ color: '#555' }}>
          {marketQuestion}
        </p>
      )}

      {/* Chart container */}
      <div className="px-2 pb-3">
        {!tokenId ? (
          <div className="flex flex-col items-center justify-center h-[220px] gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: '#2a2a2a' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p className="text-xs" style={{ color: '#555' }}>Select a market to view chart</p>
          </div>
        ) : points.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-[220px]">
            <p className="text-xs" style={{ color: '#555' }}>No price history available</p>
          </div>
        ) : (
          <div ref={containerRef} style={{ width: '100%', height: '220px' }} />
        )}
      </div>
    </div>
  );
}
