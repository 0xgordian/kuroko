/**
 * Global app store — single source of truth for all UI state.
 *
 * The AI agent (via RuntimeAgentBridge) writes to this store.
 * All components subscribe to it. Changes are reactive across the app.
 */

import { create } from 'zustand';
import type { Market, EdgeOpportunity, EdgeQueryResult, BetProposal } from '@/types';
import { addAlert } from '@/lib/services/alertService';

export type UiToolType =
  | 'simulate_bet'
  | 'set_alert'
  | 'read_positions'
  | 'analyze_market'
  | 'navigate_market'
  | 'query_markets';

export interface UiToolPayload {
  simulate_bet?: {
    market: Market;
    side: 'YES' | 'NO';
    shares: number;
    price: number;
    reasoning?: string;
  };
  set_alert?: {
    market: Market;
    condition: 'above' | 'below';
    threshold: number;
  };
  read_positions?: {
    walletAddress: string;
  };
  analyze_market?: {
    market: Market;
    focus?: 'edge' | 'liquidity' | 'sentiment';
  };
  navigate_market?: {
    marketId: string;
  };
  query_markets?: {
    query: string;
    limit?: number;
  };
}

export interface UiEvent {
  tool: UiToolType;
  payload: UiToolPayload[UiToolType];
  timestamp: number;
  source: 'ai' | 'user';
}

interface AppStore {
  // ── Markets ───────────────────────────────────────────────────────────────
  markets: Market[];
  setMarkets: (markets: Market[]) => void;
  isLoadingMarkets: boolean;
  setIsLoadingMarkets: (loading: boolean) => void;

  // ── Edge analysis ───────────────────────────────────────────────────────────
  queryResult: EdgeQueryResult | null;
  setQueryResult: (result: EdgeQueryResult | null) => void;
  isQuerying: boolean;
  setIsQuerying: (querying: boolean) => void;

  // ── Selected market ───────────────────────────────────────────────────────
  selectedMarketId: string | null;
  selectedTokenId: string | null;
  selectMarket: (market: Market) => void;
  clearSelection: () => void;

  // ── Active simulation modal ────────────────────────────────────────────────
  activeSimulation: BetProposal | null;
  openSimulation: (proposal: BetProposal) => void;
  closeSimulation: () => void;
  updateSimulation: (updates: Partial<BetProposal>) => void;

  // ── Execution mode ───────────────────────────────────────────────────────
  executionMode: 'PAPER_TRADE' | 'SIGNING_REQUIRED' | 'EXECUTED';
  setExecutionMode: (mode: 'PAPER_TRADE' | 'SIGNING_REQUIRED' | 'EXECUTED') => void;

  // ── AI event log (for debugging / replay) ─────────────────────────────────
  aiEvents: UiEvent[];
  addAiEvent: (event: UiEvent) => void;
  clearAiEvents: () => void;

  // ── AI-to-UI intent (pending action from AI) ───────────────────────────────
  pendingIntent: UiEvent | null;
  setIntent: (intent: UiEvent | null) => void;
  clearIntent: () => void;

  // ── Last query ─────────────────────────────────────────────────────────────
  lastQuery: string;
  setLastQuery: (query: string) => void;

  // ── Wallet ─────────────────────────────────────────────────────────────────
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;
  isWalletConnected: boolean;
  setWalletConnected: (connected: boolean) => void;

  // ── AI dispatch — trigger actions from AI tool calls ───────────────────────
  /**
   * Main entry point for AI-triggered UI actions.
   * RuntimeAgentBridge calls this when the AI emits a tool call.
   */
  dispatchTool: (event: UiEvent) => void;

  // ── Share to Chat ─────────────────────────────────────────────────────────────
  /**
   * Share a result from UI back to chat.
   * The chat can read this and display it as a message.
   */
  shareToChat: (data: {
    type: 'trade_confirmed' | 'alert_set' | 'position_closed';
    message: string;
    details?: Record<string, unknown>;
  }) => void;
  
  shareHistory: Array<{
    type: 'trade_confirmed' | 'alert_set' | 'position_closed';
    message: string;
    details?: Record<string, unknown>;
    timestamp: number;
  }>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  markets: [],
  setMarkets: (markets) => set({ markets }),
  isLoadingMarkets: false,
  setIsLoadingMarkets: (v) => set({ isLoadingMarkets: v }),

  queryResult: null,
  setQueryResult: (result) => set({ queryResult: result }),
  isQuerying: false,
  setIsQuerying: (v) => set({ isQuerying: v }),

  selectedMarketId: null,
  selectedTokenId: null,
  selectMarket: (market) =>
    set({ selectedMarketId: market.id, selectedTokenId: market.clobTokenId ?? null }),
  clearSelection: () => set({ selectedMarketId: null, selectedTokenId: null }),

  activeSimulation: null,
  openSimulation: (proposal) => set({ activeSimulation: proposal }),
  closeSimulation: () => set({ activeSimulation: null }),
  updateSimulation: (updates) =>
    set((state) => ({
      activeSimulation: state.activeSimulation
        ? { ...state.activeSimulation, ...updates }
        : null,
    })),

  executionMode: 'PAPER_TRADE',
  setExecutionMode: (mode) => set({ executionMode: mode }),

  aiEvents: [],
  addAiEvent: (event) =>
    set((state) => ({
      aiEvents: [event, ...state.aiEvents].slice(0, 50),
    })),
  clearAiEvents: () => set({ aiEvents: [] }),

  pendingIntent: null,
  setIntent: (intent) => set({ pendingIntent: intent }),
  clearIntent: () => set({ pendingIntent: null }),

  lastQuery: '',
  setLastQuery: (query) => set({ lastQuery: query }),

  walletAddress: null,
  setWalletAddress: (address) => set({ walletAddress: address }),
  isWalletConnected: false,
  setWalletConnected: (connected) => set({ isWalletConnected: connected }),

  dispatchTool: (event) => {
    const state = get();
    state.addAiEvent(event);

    switch (event.tool) {
      case 'simulate_bet': {
        const p = event.payload as UiToolPayload['simulate_bet'];
        if (!p?.market) break;
        const totalCost = (p.shares * p.price) / 100;
        const estimatedPayout = p.shares;
        const estimatedReturn =
          totalCost > 0 ? ((estimatedPayout - totalCost) / totalCost) * 100 : 0;

        const proposal: BetProposal = {
          market: p.market,
          side: p.side,
          shares: p.shares,
          pricePerShare: p.price,
          totalCost,
          estimatedPayout,
          estimatedReturn,
          tradeIntent: `AI recommended ${p.side} ${p.shares} shares @ ${p.price}¢ on "${p.market.question}"${p.reasoning ? ` — ${p.reasoning}` : ''}`,
          mode: state.executionMode,
        };
        set({ activeSimulation: proposal, pendingIntent: event });
        break;
      }

      case 'set_alert': {
        const p = event.payload as UiToolPayload['set_alert'];
        if (!p?.market) break;
        addAlert({
          marketId: p.market.id,
          marketQuestion: p.market.question,
          tokenId: p.market.clobTokenId,
          condition: p.condition,
          threshold: p.threshold,
        });
        set({ pendingIntent: event });
        break;
      }

      case 'navigate_market': {
        const p = event.payload as UiToolPayload['navigate_market'];
        if (!p?.marketId) break;
        const market = state.markets.find(
          (m) => m.id === p.marketId || m.slug === p.marketId,
        );
        if (market) {
          set({
            selectedMarketId: market.id,
            selectedTokenId: market.clobTokenId ?? null,
            pendingIntent: event,
          });
        }
        break;
      }

      case 'query_markets': {
        const p = event.payload as UiToolPayload['query_markets'];
        if (!p?.query) break;
        set({ lastQuery: p.query, pendingIntent: event });
        break;
      }

      case 'analyze_market': {
        const p = event.payload as UiToolPayload['analyze_market'];
        if (!p?.market) break;
        set({ selectedMarketId: p.market.id, pendingIntent: event });
        break;
      }

      default:
        set({ pendingIntent: event });
    }
  },

  shareToChat: (data) => {
    // Store the share data with timestamp - the chat can read this on mount
    const current = get();
    const shareHistory = current.shareHistory || [];
    const shareWithTimestamp = {
      ...data,
      timestamp: Date.now(),
    };
    
    set({
      shareHistory: [shareWithTimestamp, ...shareHistory].slice(0, 10),
    });
    
    if (current.pendingIntent) {
      set({ pendingIntent: null });
    }
  },
  
  shareHistory: [],
}));