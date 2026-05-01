'use client';

import { Component, type ReactNode, useEffect, useRef } from 'react';
import { AomiFrame } from '@/components/aomi-frame';
import { useAomiRuntime, useControl } from '@aomi-labs/react';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_AOMI_PROXY_BASE_URL || '/api/aomi';

const AOMI_API_KEY = process.env.NEXT_PUBLIC_AOMI_API_KEY || null;

interface ErrorBoundaryState { hasError: boolean }

class AomiErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <AomiWidgetFallback />;
    return this.props.children;
  }
}

function AomiWidgetFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center gap-3 h-full">
      <p className="text-sm" style={{ color: '#555' }}>AI assistant unavailable</p>
      <p className="text-xs" style={{ color: '#333' }}>Reload the page to retry</p>
    </div>
  );
}

interface AomiBridgeProps {
  onReady?: (send: (msg: string) => Promise<void>) => void;
  initialContext?: string | null;
}

function AomiBridge({ onReady, initialContext }: AomiBridgeProps) {
  const { sendMessage } = useAomiRuntime();
  const { setApiKey } = useControl();
  const sentRef = useRef(false);
  const sendRef = useRef(sendMessage);

  useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);

  useEffect(() => {
    if (AOMI_API_KEY) setApiKey(AOMI_API_KEY);
  }, [setApiKey]);

  useEffect(() => {
    if (onReady) onReady(sendMessage);
  }, [sendMessage, onReady]);

  // Send initial context once on mount if provided
  useEffect(() => {
    if (!initialContext || sentRef.current) return;
    const t = setTimeout(() => {
      sentRef.current = true;
      void sendRef.current(initialContext);
    }, 900);
    return () => clearTimeout(t);
  }, [initialContext]);

  return null;
}

export interface AomiWidgetHandle {
  sendMessage: (text: string) => Promise<void>;
}

interface AomiWidgetProps {
  onReady?: (handle: AomiWidgetHandle) => void;
  height?: string;
  /** Optional context message sent automatically on mount (e.g. current market state) */
  initialContext?: string | null;
}

export default function AomiWidget({ onReady, height = '520px', initialContext }: AomiWidgetProps) {
  return (
    <AomiErrorBoundary>
      <AomiFrame.Root
        backendUrl={BACKEND_URL}
        height={height}
        width="100%"
        walletPosition={null}
        showSidebar={false}
      >
        <AomiBridge
          onReady={onReady ? (send) => onReady({ sendMessage: send }) : undefined}
          initialContext={initialContext}
        />
        <AomiFrame.Header
          withControl={true}
          showSidebarTrigger={false}
          showTitle={false}
          className="border-b-0 border-transparent px-3 py-2"
          style={{ borderColor: 'transparent', backgroundColor: 'transparent', minHeight: 'auto', height: 'auto' } as React.CSSProperties}
          controlBarProps={{
            hideApiKey: !Boolean(AOMI_API_KEY),
            hideWallet: false,
            hideNetwork: false,
            hideModel: false,
            hideApp: false,
          }}
        />
        <AomiFrame.Composer />
      </AomiFrame.Root>
    </AomiErrorBoundary>
  );
}
