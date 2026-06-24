'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AomiFrame } from '@/components/aomi-frame';
import { useAomiRuntime, useControl } from '@aomi-labs/react';
import { Component, type ReactNode } from 'react';
import TopNav from '@/components/TopNav';
import { useAomiAuthAdapter } from '@/lib/aomi-auth-adapter';
import { useAppStore } from '@/lib/stores/appStore';
import { ThreadPersist } from '@/components/ThreadPersist';
import { fetchActiveMarkets } from '@/lib/services/marketService';
import { useOnboarding } from '@/components/OnboardingModal';

const BACK_END_URL =
  process.env.NEXT_PUBLIC_AOMI_PROXY_BASE_URL || '/api/aomi';
const AOMI_API_KEY = process.env.NEXT_PUBLIC_AOMI_API_KEY || null;

// ── Error boundary ──────────────────────────────────────────────────
interface EBState { hasError: boolean }
class ChatErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: '#555' }}>AI assistant unavailable — reload to retry</p>
      </div>
    );
    return this.props.children;
  }
}

// ── Auto-send bridge — reads ?q= param and fires it once ───────────────────
function buildSessionContext(chainId?: number) {
  const isArc = chainId === 5042002;
  return isArc
    ? `[Session init] You are Kuroko — an AI-native prediction market intelligence and trading assistant currently operating on Arc Testnet (chain ID 5042002). The full Arc system prompt, trading rules, and live Arc demo market data are injected server-side on every message through the kuroko_chain cookie. You can answer Arc questions directly, explain the Arc market flow, and help users trade the seeded Arc prediction markets. Be direct and concise.`
    : `[Session init] You are Kuroko — an AI-native market intelligence and trading assistant embedded in a Polygon/Polymarket terminal. The full system prompt, trading rules, and live market data are injected server-side on every message. Your role: analyze markets, guide trades, review positions, and be direct and concise.`;
}

// Session-level guard — survives navigation (component unmount/remount)
// so the system context is only injected once per browser session
const SESSION_CONTEXT_KEY_PREFIX = 'pa_ctx_sent';

function AutoSendBridge({ query, chainId, onFirstSend }: { query: string | null; chainId?: number; onFirstSend?: () => void }) {
  const { sendMessage } = useAomiRuntime();
  const { setApiKey } = useControl();
  const sentRef = useRef(false);
  const chainKey = chainId === 5042002 ? 'arc' : 'polygon';
  const sessionContextKey = `${SESSION_CONTEXT_KEY_PREFIX}_${chainKey}`;
  const contextSentRef = useRef(false);
  const sendRef = useRef(sendMessage);
  const shareHistory = useAppStore((s) => s.shareHistory);
  const lastReadShareRef = useRef(0);
  const onFirstSendRef = useRef(onFirstSend);

  useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);
  useEffect(() => { onFirstSendRef.current = onFirstSend; }, [onFirstSend]);

  useEffect(() => {
    contextSentRef.current =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionContextKey) === '1';
  }, [sessionContextKey]);

  useEffect(() => {
    if (shareHistory.length === 0) return;
    const latestShare = shareHistory[0];
    if (latestShare.timestamp > lastReadShareRef.current) {
      lastReadShareRef.current = latestShare.timestamp;
      void sendRef.current(`[Session init] ${latestShare.message}`).catch(() => {});
    }
  }, [shareHistory]);

  useEffect(() => {
    if (contextSentRef.current) return;
    if (AOMI_API_KEY) setApiKey(AOMI_API_KEY);

    let attempts = 0;
    const MAX_ATTEMPTS = 12;
    const RETRY_DELAY_MS = 1500;

    const trySend = () => {
      attempts++;
      try {
        contextSentRef.current = true;
        try { sessionStorage.setItem(sessionContextKey, '1'); } catch { /* ignore */ }
        void sendRef.current(buildSessionContext(chainId)).then(() => {
          // Fire onboarding after system context is accepted — first real interaction
          onFirstSendRef.current?.();
        }).catch(() => {
          contextSentRef.current = false;
          try { sessionStorage.removeItem(sessionContextKey); } catch { /* ignore */ }
          if (attempts < MAX_ATTEMPTS) {
            setTimeout(trySend, RETRY_DELAY_MS);
          }
        });
      } catch {
        contextSentRef.current = false;
        try { sessionStorage.removeItem(sessionContextKey); } catch { /* ignore */ }
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(trySend, RETRY_DELAY_MS);
        }
      }
    };

    const t = setTimeout(trySend, 2500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setApiKey, chainId, sessionContextKey]);

  useEffect(() => {
    if (!query || sentRef.current) return;
    let attempts = 0;
    const MAX_ATTEMPTS = 8;
    const trySend = () => {
      attempts++;
      try {
        sentRef.current = true;
        void sendRef.current(query);
      } catch {
        sentRef.current = false;
        if (attempts < MAX_ATTEMPTS) setTimeout(trySend, 500 * attempts);
      }
    };
    const t = setTimeout(trySend, 1200);
    return () => clearTimeout(t);
  }, [query]);

  return null;
}

// ── Full-screen chat content ─────────────────────────────────────────
function ChatContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const authAdapter = useAomiAuthAdapter();
  const isWalletConnected = authAdapter.identity.isConnected;
  const walletAddress = authAdapter.identity.address;
  const chainId = authAdapter.identity.chainId;
  const hasLiveIntentPath = Boolean(process.env.NEXT_PUBLIC_AOMI_API_KEY);
  const liveModeLabel = hasLiveIntentPath
    ? isWalletConnected ? 'Signing Ready' : 'Connect Wallet'
    : 'Paper Mode';

  // Onboarding — fires after first AI response
  const { modal, triggerOnboarding } = useOnboarding('after-first-message');

  // Load markets into the store so AI suggestions show live data
  const storeMarkets = useAppStore((s) => s.markets);
  const setStoreMarkets = useAppStore((s) => s.setMarkets);
  useEffect(() => {
    if (storeMarkets.length > 0) return;
    fetchActiveMarkets().then(({ markets }) => {
      if (markets.length > 0) setStoreMarkets(markets);
    }).catch(() => {});
  }, [storeMarkets.length, setStoreMarkets]);

  // backendUrl includes wallet address as query param so the aomi proxy can
  // inject the user's open positions into the AI context.
  // useMemo so it only changes when wallet address actually changes — prevents runtime remount.
  const backendUrl = (() => {
    const base = BACK_END_URL.startsWith('http')
      ? BACK_END_URL
      : (typeof window !== 'undefined' ? window.location.origin : '') + BACK_END_URL;
    // Do NOT append wallet as query param — it corrupts the aomi SDK's path construction
    // The proxy reads x-wallet-address header instead (set by aomi runtime automatically)
    return base;
  })();

  return (
    <div className="flex flex-col overflow-hidden pt-12 pb-16 lg:pb-0" style={{ backgroundColor: '#09090b', height: 'calc(100vh - 48px)' }}>
      <TopNav
        liveModeLabel={liveModeLabel}
        isWalletConnected={isWalletConnected}
        walletAddress={authAdapter.identity.address}
        chainId={authAdapter.identity.chainId}
        onConnectWallet={!isWalletConnected ? () => authAdapter.connect() : undefined}
        onManageWallet={isWalletConnected ? () => authAdapter.manageAccount() : undefined}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <ChatErrorBoundary>
          <AomiFrame.Root
            backendUrl={backendUrl}
            height="100%"
            width="100%"
            walletPosition={null}
            showSidebar={true}
          >
            <AutoSendBridge query={query} chainId={chainId} onFirstSend={triggerOnboarding} />
            <ThreadPersist />
            <AomiFrame.Header
              withControl={true}
              showSidebarTrigger={true}
              showTitle={true}
              controlBarProps={{
                hideApiKey: !Boolean(AOMI_API_KEY),
                hideWallet: true,
                hideNetwork: false,
                hideModel: false,
                hideApp: false,
                className: 'flex-wrap gap-1',
              }}
            />
            <AomiFrame.Composer />
          </AomiFrame.Root>
        </ChatErrorBoundary>
      </div>

      {/* Onboarding modal — renders after first AI response */}
      {modal}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#09090b' }}>
        <div className="w-6 h-6 border-2 border-[#7c3aed]/30 border-t-[#7c3aed] rounded-full animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
