'use client';

import { PropsWithChildren, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ParaProviderMin } from '@getpara/react-sdk-lite';
import ParaWeb, { Environment } from '@getpara/web-sdk';
import { startGlobalAlertPoller, stopGlobalAlertPoller, setPollerWalletAddress } from '@/lib/services/globalAlertPoller';
import { initMarketService } from '@/lib/services/marketService';
import ParaBackdrop from '@/components/ParaBackdrop';
import { useAomiAuthAdapter } from '@/lib/aomi-auth-adapter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PARA_API_KEY = process.env.NEXT_PUBLIC_PARA_API_KEY ?? '';
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

// Wrap in try/catch — browser wallet extensions (MetaMask etc.) can conflict
// with Para's window.ethereum injection causing "Cannot redefine property" errors
let paraClient: InstanceType<typeof ParaWeb> | null = null;
try {
  paraClient = PARA_API_KEY ? new ParaWeb(Environment.BETA, PARA_API_KEY) : null;
} catch {
  console.warn('[Para] Failed to initialize — wallet extension conflict. Para features disabled.');
  paraClient = null;
}

/**
 * Keeps the global alert poller's wallet address in sync as the user
 * connects or disconnects their wallet.
 */
function WalletPollerSync() {
  const authAdapter = useAomiAuthAdapter();
  const address = authAdapter.identity.address ?? null;

  useEffect(() => {
    setPollerWalletAddress(address);
  }, [address]);

  return null;
}

function GlobalInit() {
  useEffect(() => {
    startGlobalAlertPoller();
    initMarketService();

    // Prevent wallet extension conflicts with Para
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        Object.defineProperty(window, 'ethereum', {
          value: window.ethereum,
          writable: false,
          configurable: false,
        });
      } catch {
        // Already defined — ignore
      }
    }

    // Swallow aomi postState 404 errors — these are non-fatal and happen
    // when no API key is configured. The error is thrown as an unhandled
    // promise rejection from inside @aomi-labs/client, bypassing React boundaries.
    // In Next.js dev mode the overlay intercepts before window events fire,
    // so we also need to patch the global error handler.
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event?.reason?.message ?? String(event?.reason ?? '');
      if (
        msg.includes('404') ||
        msg.includes('postState') ||
        msg.includes('Not Found') ||
        msg.includes('HTTP 404')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    // Also patch console.error to suppress the Next.js dev overlay trigger
    const origConsoleError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      const msg = args.map(String).join(' ');
      if (msg.includes('postState') || (msg.includes('404') && msg.includes('aomi'))) return;
      origConsoleError(...args);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      stopGlobalAlertPoller();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = origConsoleError;
    };
  }, []);
  return null;
}

const toastStyle = {
  background: '#111',
  color: '#f0f0f0',
  border: '1px solid rgba(255,69,0,0.3)',
  borderRadius: 0,
  fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
  fontSize: '12px',
  letterSpacing: '0.05em',
};

export function AppProviders({ children }: PropsWithChildren<{}>) {
  const content = (
    <>
      <GlobalInit />
      <WalletPollerSync />
      {children}
      <ParaBackdrop />
      <Toaster
        position="top-right"
        toastOptions={{
          style: toastStyle,
          success: { iconTheme: { primary: '#4ade80', secondary: '#111' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#111' } },
        }}
      />
    </>
  );

  // QueryClientProvider must wrap ParaProviderMin since Para uses react-query internally
  return (
    <QueryClientProvider client={queryClient}>
      {paraClient ? (
        <ParaProviderMin
          paraClientConfig={paraClient}
          paraModalConfig={{
            para: paraClient,
            oAuthMethods: ['GOOGLE', 'TWITTER', 'DISCORD', 'GITHUB'] as any,
            disableEmailLogin: false,
            disablePhoneLogin: true,
            recoverySecretStepEnabled: false,
            twoFactorAuthEnabled: false,
            theme: {
              mode: 'dark',
              foregroundColor: '#f0f0f0',
              backgroundColor: '#111111',
              accentColor: '#ff4500',
              borderRadius: 'none',
              customPalette: {
                text: {
                  primary: '#f0f0f0',
                  secondary: '#a0a0a0',
                },
                tileButton: {
                  surface: {
                    default: '#1a1a1a',
                    hover: '#222222',
                    pressed: '#2a2a2a',
                  },
                  border: 'rgba(255,255,255,0.12)',
                },
                iconGroup: {
                  icon: {
                    default: '#f0f0f0',
                  },
                },
                input: {
                  surface: {
                    default: '#0d0d0d',
                  },
                  border: {
                    placeholder: 'rgba(255,255,255,0.15)',
                    active: 'rgba(255,69,0,0.5)',
                  },
                },
                primaryButton: {
                  surface: {
                    default: '#ff4500',
                    hover: '#ff5500',
                    pressed: '#e03d00',
                  },
                },
                modal: {
                  surface: {
                    main: '#111111',
                  },
                },
              },
            },
          }}
          config={{
            appName: 'Kuroko',
            disableAutoSessionKeepAlive: false,
          }}
          externalWalletConfig={WALLETCONNECT_PROJECT_ID ? {
            walletConnect: { projectId: WALLETCONNECT_PROJECT_ID },
          } : undefined}
        >
          {content}
        </ParaProviderMin>
      ) : (
        content
      )}
    </QueryClientProvider>
  );
}
