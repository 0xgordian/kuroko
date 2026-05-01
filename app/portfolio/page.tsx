'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Icon } from '@iconify/react';
import type { Market } from '@/types';
import { fetchActiveMarkets } from '@/lib/services/marketService';
import { fetchUserPositions, type UserPosition } from '@/lib/services/clobService';
import { checkTradeOutcomes } from '@/lib/services/tradeHistoryService';
import { useAomiAuthAdapter } from '@/lib/aomi-auth-adapter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TopNav from '@/components/TopNav';
import PriceChart from '@/components/PriceChart';
import AlertsPanel from '@/components/AlertsPanel';
import TradeHistory from '@/components/TradeHistory';
import PositionPanel from '@/components/PositionPanel';
import PositionGuardPanel from '@/components/PositionGuardPanel';
import Footer from '@/components/Footer';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';

function MarketSelect({
  markets,
  value,
  onChange,
}: {
  markets: Market[];
  value: Market | null;
  onChange: (m: Market | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const displayLabel = value
    ? `${value.currentProbability}% — ${value.question.slice(0, 40)}${value.question.length > 40 ? '…' : ''}`
    : 'Select a market...';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex-1 flex items-center justify-between gap-2 h-7 px-2.5 text-xs border transition-colors hover:border-white/20 hover:text-[#f0f0f0]"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'rgba(255,255,255,0.12)',
            color: value ? '#f0f0f0' : '#555',
            borderRadius: 0,
            fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
          }}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <Icon icon="solar:alt-arrow-down-linear" className="w-3.5 h-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[min(420px,calc(100vw-32px))] max-h-[320px] overflow-y-auto p-1 border z-[9999]"
        style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 0 }}
      >
        <button
          onClick={() => { onChange(null); setOpen(false); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-[#161616] transition-colors"
          style={{ color: '#555', borderRadius: 0, fontFamily: "var(--font-geist-mono), monospace" }}
        >
          Clear selection
        </button>
        {markets.slice(0, 50).map((m) => (
          <button
            key={m.id}
            onClick={() => { onChange(m); setOpen(false); }}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-[#161616] transition-colors"
            style={{
              color: value?.id === m.id ? '#f0f0f0' : '#a0a0a0',
              backgroundColor: value?.id === m.id ? '#161616' : 'transparent',
              borderRadius: 0,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            <span className="truncate text-left flex-1">{m.question.slice(0, 60)}{m.question.length > 60 ? '…' : ''}</span>
            <span className="shrink-0 font-bold" style={{ color: '#ff4500' }}>{m.currentProbability}%</span>
            {value?.id === m.id && <Icon icon="solar:check-circle-linear" className="w-3.5 h-3.5 shrink-0" style={{ color: '#ff4500' }} />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

type PortfolioTab = 'portfolio' | 'chart' | 'alerts' | 'guards' | 'history';

function PortfolioContent() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [mobileTab, setMobileTab] = useState<PortfolioTab>('portfolio');

  const authAdapter = useAomiAuthAdapter();
  const isWalletConnected = authAdapter.identity.isConnected;
  const walletAddress = authAdapter.identity.address ?? null;
  const hasLiveIntentPath = Boolean(process.env.NEXT_PUBLIC_AOMI_API_KEY);
  const liveModeLabel = hasLiveIntentPath
    ? isWalletConnected ? 'Signing Ready' : 'Connect Wallet'
    : 'Paper Mode';

  const loadMarkets = useCallback(async () => {
    setIsLoadingMarkets(true);
    const { markets: loaded, isFallback: fb } = await fetchActiveMarkets();
    setMarkets(loaded);
    setIsFallback(fb);
    setIsLoadingMarkets(false);
  }, []);

  const loadPositions = useCallback(async () => {
    if (!walletAddress) { setPositions([]); return; }
    setIsLoadingPositions(true);
    const data = await fetchUserPositions(walletAddress);
    setPositions(data);
    setIsLoadingPositions(false);
  }, [walletAddress]);

  useEffect(() => { void loadMarkets(); }, [loadMarkets]);
  useEffect(() => { void loadPositions(); }, [loadPositions]);

  // Default chart to highest-value position once markets load
  useEffect(() => {
    if (!markets.length || selectedMarket) return;
    if (!positions.length) return;
    // Find the market matching the highest-value position
    const topPosition = [...positions].sort((a, b) => (b.size * b.current_price) - (a.size * a.current_price))[0];
    if (!topPosition) return;
    const match = markets.find(
      (m) => m.id === topPosition.market_id ||
        m.question.toLowerCase().includes(topPosition.question.toLowerCase().slice(0, 30))
    );
    if (match) setSelectedMarket(match);
  }, [markets, positions, selectedMarket]);

  // Check paper trade outcomes on load — throttled to once per hour
  useEffect(() => {
    const LAST_CHECK_KEY = 'kuroko_outcomes_last_check';
    const ONE_HOUR = 60 * 60 * 1000;
    try {
      const last = parseInt(localStorage.getItem(LAST_CHECK_KEY) ?? '0', 10);
      if (Date.now() - last > ONE_HOUR) {
        void checkTradeOutcomes();
        localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
      }
    } catch {
      void checkTradeOutcomes(); // fallback if localStorage unavailable
    }
  }, []);

  const totalValue = positions.reduce((sum, p) => sum + p.size * p.current_price, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const pnlPositive = totalPnl >= 0;

  const MOBILE_TABS: { id: PortfolioTab; label: string }[] = [
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'chart', label: 'Chart' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'guards', label: 'Guards' },
    { id: 'history', label: 'History' },
  ];

  const { onTouchStart, onTouchEnd } = useSwipeTabs({
    tabs: MOBILE_TABS.map((t) => t.id),
    currentTab: mobileTab,
    onChange: (tab) => setMobileTab(tab as PortfolioTab),
  });

  const panel = { backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 };

  return (
    <div className="min-h-screen flex flex-col pt-12 pb-16 lg:pb-0" style={{ backgroundColor: '#0d0d0d' }}>
      <TopNav
        isFallback={isFallback}
        isLoadingMarkets={isLoadingMarkets}
        liveModeLabel={liveModeLabel}
        isWalletConnected={isWalletConnected}
        walletAddress={walletAddress}
        onConnectWallet={!isWalletConnected ? () => authAdapter.connect() : undefined}
        onManageWallet={isWalletConnected ? () => authAdapter.manageAccount() : undefined}
      />

      {/* Mobile tab bar */}
      <div
        className="lg:hidden flex-none border-b select-none"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className="flex-1 flex items-center justify-center py-3 font-terminal text-[11px] font-bold tracking-widest uppercase transition-colors"
              style={{
                color: mobileTab === tab.id ? '#ff4500' : '#555',
                borderBottom: mobileTab === tab.id ? '2px solid #ff4500' : '2px solid transparent',
                backgroundColor: 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6">

        {/* Desktop layout */}
        <div className="hidden lg:block space-y-5">
          <div className="grid grid-cols-12 gap-5 items-start">

            {/* Col 1: Summary + Positions */}
            <div className="col-span-3">
              <div className="border panel-bracket p-4 mb-3" style={panel}>
                <p className="t-label mb-3">
                  Portfolio <span className="t-label-accent">{'// Summary'}</span>
                </p>
                {!isWalletConnected ? (
                  <p className="text-xs" style={{ color: '#555' }}>Connect wallet to view portfolio</p>
                ) : isLoadingPositions ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 animate-pulse" style={{ backgroundColor: '#161616', borderRadius: 0 }} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Total Value</p>
                      <p className="text-2xl font-terminal font-bold" style={{ color: '#f0f0f0' }}>${totalValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Unrealized P&L</p>
                      <p className="text-xl font-terminal font-bold" style={{ color: pnlPositive ? '#4ade80' : '#f87171' }}>
                        {pnlPositive ? '+' : ''}${totalPnl.toFixed(2)}
                        <span className="text-sm ml-2" style={{ color: '#555' }}>{positions.length} position{positions.length !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="border panel-bracket" style={panel}>
                <PositionPanel walletAddress={walletAddress} isConnected={isWalletConnected} />
              </div>
            </div>

            {/* Col 2: Chart */}
            <div className="col-span-5">
              <div className="border panel-bracket mb-3 px-4 py-2" style={panel}>
                <div className="flex items-center gap-3">
                  <span className="font-terminal text-[10px] tracking-widest uppercase shrink-0" style={{ color: '#555' }}>Chart Market</span>
                  <MarketSelect markets={markets} value={selectedMarket} onChange={setSelectedMarket} />
                </div>
              </div>
              <div className="border panel-bracket" style={panel}>
                <ErrorBoundary>
                  <PriceChart tokenId={selectedMarket?.clobTokenId ?? null} marketQuestion={selectedMarket?.question ?? ''} />
                </ErrorBoundary>
              </div>
            </div>

            {/* Col 3: Alerts + Guards */}
            <div className="col-span-4 space-y-5">
              <div className="border panel-bracket" style={panel}>
                <ErrorBoundary>
                  <AlertsPanel markets={markets} />
                </ErrorBoundary>
              </div>
              <div className="border panel-bracket" style={panel}>
                <ErrorBoundary>
                  <PositionGuardPanel markets={markets} />
                </ErrorBoundary>
              </div>
            </div>
          </div>

          {/* Trade history */}
          <div className="border panel-bracket" style={panel}>
            <ErrorBoundary>
              <TradeHistory />
            </ErrorBoundary>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden">
          {mobileTab === 'portfolio' && (
            <div className="space-y-3">
              <div className="border panel-bracket p-4" style={panel}>
                <p className="t-label mb-3">Portfolio <span className="t-label-accent">{'// Summary'}</span></p>
                {!isWalletConnected ? (
                  <p className="text-xs" style={{ color: '#555' }}>Connect wallet to view portfolio</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Total Value</p>
                      <p className="text-xl font-terminal font-bold" style={{ color: '#f0f0f0' }}>${totalValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>P&L</p>
                      <p className="text-xl font-terminal font-bold" style={{ color: pnlPositive ? '#4ade80' : '#f87171' }}>
                        {pnlPositive ? '+' : ''}${totalPnl.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="border panel-bracket" style={panel}>
                <PositionPanel walletAddress={walletAddress} isConnected={isWalletConnected} />
              </div>
            </div>
          )}

          {mobileTab === 'chart' && (
            <div className="space-y-3">
              <div className="border panel-bracket px-4 py-2" style={panel}>
                <MarketSelect markets={markets} value={selectedMarket} onChange={setSelectedMarket} />
              </div>
              <div className="border panel-bracket" style={panel}>
                <PriceChart tokenId={selectedMarket?.clobTokenId ?? null} marketQuestion={selectedMarket?.question ?? ''} />
              </div>
            </div>
          )}

          {mobileTab === 'alerts' && (
            <div className="border panel-bracket" style={panel}>
              <AlertsPanel markets={markets} />
            </div>
          )}

          {mobileTab === 'guards' && (
            <div className="border panel-bracket" style={panel}>
              <PositionGuardPanel markets={markets} />
            </div>
          )}

          {mobileTab === 'history' && (
            <div className="border panel-bracket" style={panel}>
              <TradeHistory />
            </div>
          )}
        </div>
      </div>

      <div className="flex-none border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Footer />
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d0d0d' }}>
        <div className="w-6 h-6 border-2 border-[#ff4500]/30 border-t-[#ff4500] rounded-full animate-spin" />
      </div>
    }>
      <PortfolioContent />
    </Suspense>
  );
}
