'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import type { Market, BetProposal } from '@/types';
import { fetchActiveMarkets, onMarketsRefresh } from '@/lib/services/marketService';
import { findEdges } from '@/lib/services/edgeEngine';
import { constructBetIntent } from '@/lib/services/tradeIntentService';
import { addAlert } from '@/lib/services/alertService';
import toast from 'react-hot-toast';
import type { EdgeOpportunity } from '@/types';

import TopNav from '@/components/TopNav';
import AomiWidget from '@/components/AomiWidget';
import QueryBar from '@/components/QueryBar';
import MarketFeed from '@/components/MarketFeed';
import EdgeResults from '@/components/EdgeResults';
import BetSimulation from '@/components/BetSimulation';
import Footer from '@/components/Footer';
import PositionPanel from '@/components/PositionPanel';
import TrendingMarkets from '@/components/TrendingMarkets';
import { useAomiAuthAdapter } from '@/lib/aomi-auth-adapter';
import { useAppStore } from '@/lib/stores/appStore';
import CategoryFilter, { filterByCategory, type MarketCategory } from '@/components/CategoryFilter';

type MobileTab = 'markets' | 'trending' | 'analysis' | 'ai';

function HomeContent() {
  const searchParams = useSearchParams();
  const storeMarkets = useAppStore((s) => s.markets);
  const setStoreMarkets = useAppStore((s) => s.setMarkets);
  const [markets, setLocalMarkets] = useState<Market[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const queryResult = useAppStore((s) => s.queryResult);
  const setQueryResult = useAppStore((s) => s.setQueryResult);
  const [isQuerying, setIsQuerying] = useState(false);
  const activeBet = useAppStore((s) => s.activeSimulation);
  const openSimulation = useAppStore((s) => s.openSimulation);
  const closeSimulation = useAppStore((s) => s.closeSimulation);
  const [mobileTab, setMobileTab] = useState<MobileTab>('markets');
  // Track which opportunity is currently fetching CLOB price
  const [fetchingBetId, setFetchingBetId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<MarketCategory>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('trade_activeCategory') as MarketCategory) ?? 'all';
    }
    return 'all';
  });
  const [aiPanelOpen, setAiPanelOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trade_aiPanelOpen');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  // Persist category + AI panel state
  useEffect(() => {
    localStorage.setItem('trade_activeCategory', activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    localStorage.setItem('trade_aiPanelOpen', String(aiPanelOpen));
  }, [aiPanelOpen]);
  const authAdapter = useAomiAuthAdapter();
  const hasLiveIntentPath = Boolean(process.env.NEXT_PUBLIC_AOMI_API_KEY);
  const isWalletConnected = authAdapter.identity.isConnected;
  const visibleMarkets = storeMarkets.length > 0 ? storeMarkets : markets;
  const categoryFilteredMarkets = filterByCategory(visibleMarkets, activeCategory);
  const liveModeLabel = hasLiveIntentPath ? (isWalletConnected ? 'Signing Ready' : 'Connect Wallet') : 'Paper Mode';

  const loadMarkets = useCallback(async () => {
    setIsLoadingMarkets(true);
    const { markets: loaded, isFallback: fallback } = await fetchActiveMarkets();
    setLocalMarkets(loaded);
    setStoreMarkets(loaded);
    setIsFallback(fallback);
    setIsLoadingMarkets(false);
  }, [setStoreMarkets]);

  useEffect(() => { loadMarkets(); }, [loadMarkets]);

  useEffect(() => {
    const unsub = onMarketsRefresh(() => { void loadMarkets(); });
    return unsub;
  }, [loadMarkets]);

  useEffect(() => {
    const simulateId = searchParams.get('simulate');
    if (!simulateId || !visibleMarkets.length) return;

    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      const origin = window.location.origin;
      if (referrer && !referrer.startsWith(origin)) return;
    }

    const market = visibleMarkets.find(
      (m) => m.id === simulateId || m.slug === simulateId ||
        m.question.toLowerCase().includes(decodeURIComponent(simulateId).toLowerCase())
    );
    if (!market) return;

    const side = (searchParams.get('side') as 'YES' | 'NO') ?? 'YES';
    const rawShares = parseInt(searchParams.get('shares') ?? '50', 10);
    const shares = Math.max(1, Math.min(10000, rawShares));
    const referencePrice = side === 'YES' ? market.currentProbability : 100 - market.currentProbability;
    const totalCost = Math.min((shares * referencePrice) / 100, 10000);
    const estimatedPayout = shares;
    const estimatedReturn = totalCost > 0 ? ((estimatedPayout - totalCost) / totalCost) * 100 : 0;

    const stub: BetProposal = {
      market, side, shares, pricePerShare: referencePrice,
      totalCost, estimatedPayout, estimatedReturn, tradeIntent: '', mode: 'PAPER_TRADE',
    };
    stub.tradeIntent = constructBetIntent(stub);
    openSimulation(stub);
    setMobileTab('analysis');

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('simulate');
      url.searchParams.delete('side');
      url.searchParams.delete('shares');
      window.history.replaceState({}, '', url.toString());
    }
  }, [visibleMarkets, searchParams, openSimulation]);

  const handleQuery = useCallback(async (query: string) => {
    if (!visibleMarkets.length) {
      setIsQuerying(true);
      await new Promise((r) => setTimeout(r, 1500));
      if (!visibleMarkets.length) { setIsQuerying(false); return; }
    }
    setIsQuerying(true);
    setQueryResult(null);
    setMobileTab('analysis');
    await new Promise((r) => setTimeout(r, 400));
    const result = findEdges(categoryFilteredMarkets, query);
    setQueryResult(result);
    setIsQuerying(false);
  }, [visibleMarkets, categoryFilteredMarkets, setQueryResult]);

  const handleProposeBet = useCallback(async (opp: EdgeOpportunity) => {
    const betId = opp.market.id;
    setFetchingBetId(betId);
    // Fetch real CLOB best ask price for accurate simulation
    let realPrice = opp.referencePrice;
    if (opp.market.clobTokenId) {
      try {
        const { fetchOrderBook } = await import('@/lib/services/clobService');
        const book = await fetchOrderBook(opp.market.clobTokenId);
        if (book && book.best_ask > 0) {
          // Convert from decimal (0.44) to cents (44)
          realPrice = Math.round(book.best_ask * 100);
        }
      } catch {
        // Fall back to probability-based price
      }
    }

    const shares = 50;
    const totalCost = Math.min((shares * realPrice) / 100, 10000);
    const estimatedPayout = shares;
    const estimatedReturn = totalCost > 0 ? ((estimatedPayout - totalCost) / totalCost) * 100 : 0;
    const proposal: BetProposal = {
      market: opp.market,
      side: opp.side,
      shares,
      pricePerShare: realPrice,
      totalCost,
      estimatedPayout,
      estimatedReturn,
      tradeIntent: constructBetIntent({
        market: opp.market, side: opp.side, shares,
        pricePerShare: realPrice, totalCost, estimatedPayout,
        estimatedReturn, mode: 'PAPER_TRADE', tradeIntent: '',
      }),
      mode: 'PAPER_TRADE',
    };
    openSimulation(proposal);
    setMobileTab('analysis');
    setFetchingBetId(null);
  }, [openSimulation]);

  const handleAskAomi = useCallback((opp: EdgeOpportunity) => {
    const change = opp.market.probabilityChange24h;
    const changeStr = change !== null && change !== undefined
      ? ` 24h change: ${change > 0 ? '+' : ''}${change.toFixed(1)}%.` : '';
    const msg = `Analyze this Polymarket opportunity: "${opp.market.question}" — currently at ${opp.market.currentProbability}% YES.${changeStr} Volume: ${(opp.market.volume / 1000).toFixed(0)}K. Edge score: ${opp.edgeScore}/100 (${opp.edgeStrength}) on the ${opp.side} side. Should I trade this?`;
    window.location.href = `/?q=${encodeURIComponent(msg)}`;
  }, []);

  const handleSetAlert = useCallback((opp: EdgeOpportunity) => {
    addAlert({
      marketId: opp.market.id,
      marketQuestion: opp.market.question,
      tokenId: opp.market.clobTokenId,
      condition: opp.market.currentProbability >= 50 ? 'above' : 'below',
      threshold: opp.market.currentProbability,
    });
    toast.success(`Alert set: ${opp.market.question.slice(0, 50)}…`, {
      style: { background: '#111', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 0 },
      iconTheme: { primary: '#ff4500', secondary: '#000' },
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col pt-12 pb-16 lg:pb-0" style={{ backgroundColor: '#0d0d0d' }}>
      <TopNav
        isFallback={isFallback}
        isLoadingMarkets={isLoadingMarkets}
        liveModeLabel={liveModeLabel}
        isWalletConnected={isWalletConnected}
        walletAddress={authAdapter.identity.address}
        onToggleAI={() => setAiPanelOpen((v) => !v)}
        aiPanelOpen={aiPanelOpen}
        onConnectWallet={!isWalletConnected ? () => authAdapter.connect() : undefined}
        onManageWallet={isWalletConnected ? () => authAdapter.manageAccount() : undefined}
      />

      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6">
        {/* Desktop: responsive layout — full width when AI closed, split when open */}
        <div className={`hidden lg:grid gap-5 items-start ${aiPanelOpen ? 'grid-cols-12' : 'grid-cols-1'}`}>
          {/* Left — expands to full width when AI panel closed */}
          <div className={`space-y-5 ${aiPanelOpen ? 'col-span-7' : 'col-span-1'}`}>
            {/* Category filter */}
            <CategoryFilter
              value={activeCategory}
              onChange={setActiveCategory}
              markets={visibleMarkets}
              showCounts
            />
            <QueryBar onQuery={handleQuery} isQuerying={isQuerying} />

            {queryResult && (
              <div className="border panel-bracket"
                style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
                <EdgeResults
                  result={queryResult}
                  isQuerying={isQuerying}
                  onProposeBet={handleProposeBet}
                  onAskAomi={handleAskAomi}
                  onSetAlert={handleSetAlert}
                  fetchingBetId={fetchingBetId}
                />
              </div>
            )}

            <div className="border panel-bracket"
              style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
              <MarketFeed
                markets={categoryFilteredMarkets}
                isLoading={isLoadingMarkets}
                isFallback={isFallback}
                statusMessage={isFallback ? 'Fallback data' : `${categoryFilteredMarkets.length} markets`}
                onRefresh={loadMarkets}
              />
            </div>

            <div className="border panel-bracket"
              style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
              <TrendingMarkets markets={visibleMarkets} isLoading={isLoadingMarkets} />
            </div>
          </div>

          {/* Right — AI panel, hidden when toggled off */}
          {aiPanelOpen && (
          <div className="col-span-5 space-y-5 sticky top-12">
            <div className="border panel-bracket"
              style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
              <AomiWidget height="400px" />
            </div>

            <div className="border panel-bracket"
              style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
              <PositionPanel walletAddress={authAdapter.identity.address} isConnected={isWalletConnected} />
            </div>
          </div>
          )}
        </div>

        {/* Mobile: Tab-based layout */}
        <div className="lg:hidden">
          <div className="flex-none border-b mb-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex">
              {(['markets', 'trending', 'analysis', 'ai'] as MobileTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className="flex-1 flex items-center justify-center py-3 font-terminal text-[11px] font-bold tracking-widest uppercase transition-colors"
                  style={{
                    color: mobileTab === tab ? '#ff4500' : '#555',
                    borderBottom: mobileTab === tab ? '2px solid #ff4500' : '2px solid transparent',
                    backgroundColor: 'transparent',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {mobileTab === 'markets' && (
            <div className="space-y-4">
              <CategoryFilter
                value={activeCategory}
                onChange={setActiveCategory}
                markets={visibleMarkets}
                showCounts
              />
              <QueryBar onQuery={handleQuery} isQuerying={isQuerying} />
              <div className="border panel-bracket"
                style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
                <MarketFeed
                  markets={categoryFilteredMarkets}
                  isLoading={isLoadingMarkets}
                  isFallback={isFallback}
                  statusMessage={isFallback ? 'Fallback data' : `${categoryFilteredMarkets.length} markets`}
                  onRefresh={loadMarkets}
                />
              </div>
            </div>
          )}

          {mobileTab === 'trending' && (
            <div className="border panel-bracket"
              style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
              <TrendingMarkets markets={visibleMarkets} isLoading={isLoadingMarkets} />
            </div>
          )}

          {mobileTab === 'analysis' && (
            <div className="space-y-4">
              <div className="border panel-bracket"
                style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
                <EdgeResults
                  result={queryResult}
                  isQuerying={isQuerying}
                  onProposeBet={handleProposeBet}
                  onAskAomi={handleAskAomi}
                  onSetAlert={handleSetAlert}
                  fetchingBetId={fetchingBetId}
                />
              </div>
            </div>
          )}

          {mobileTab === 'ai' && (
            <div className="border panel-bracket"
              style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
              <AomiWidget height="60vh" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-none border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Footer />
      </div>

      {/* BetSimulation modal — fixed overlay, renders at page root */}
      {activeBet && (
        <BetSimulation
          proposal={activeBet}
          onDismiss={closeSimulation}
          onConfirm={closeSimulation}
        />
      )}
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d0d0d' }}>
        <div className="w-6 h-6 border-2 border-[#ff4500]/30 border-t-[#ff4500] rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
