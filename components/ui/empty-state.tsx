'use client';

import { cn } from '@/lib/utils';

type EmptyStateVariant = 'wallet' | 'positions' | 'history' | 'alerts' | 'markets' | 'orderbook';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const DEFAULTS: Record<EmptyStateVariant, { title: string; description: string }> = {
  wallet: {
    title: 'Connect your wallet',
    description: 'Link your Para wallet to view positions, track history, and execute live trades.',
  },
  positions: {
    title: 'No open positions',
    description: 'You have no active positions on Polymarket. Simulate a trade to get started.',
  },
  history: {
    title: 'No trades yet',
    description: 'Your paper trades and live executions will appear here. Start by simulating a bet.',
  },
  alerts: {
    title: 'No active alerts',
    description: 'Set price alerts on any market to get notified when the probability moves.',
  },
  markets: {
    title: 'No markets found',
    description: 'Try adjusting your search or query. Markets update every 60 seconds.',
  },
  orderbook: {
    title: 'Select a market',
    description: 'Click any market from the feed to view its order book and trading activity.',
  },
};

export function EmptyState({
  variant = 'markets',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const def = DEFAULTS[variant];

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center gap-4', className)}>
      {/* Icon */}
      <div className="mb-2">
        <EmptyStateIcon variant={variant} />
      </div>

      {/* Text */}
      <div className="space-y-2 max-w-xs">
        <p className="font-terminal text-xs tracking-widest uppercase" style={{ color: '#555' }}>
          {title ?? def.title}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#333' }}>
          {description ?? def.description}
        </p>
      </div>

      {/* Action */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function EmptyStateIcon({ variant }: { variant: EmptyStateVariant }) {
  const icons: Record<EmptyStateVariant, React.ReactNode> = {
    wallet: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="6" width="28" height="20" rx="0" stroke="#2a2a2a" strokeWidth="1" />
        <rect x="4" y="8" width="24" height="16" rx="0" stroke="#2a2a2a" strokeWidth="1" />
        <circle cx="22" cy="16" r="4" stroke="#2a2a2a" strokeWidth="1" />
        <path d="M2 12 L30 12" stroke="#2a2a2a" strokeWidth="1" />
      </svg>
    ),
    positions: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="0" stroke="#2a2a2a" strokeWidth="1" />
        <path d="M8 10 L14 16 L20 8" stroke="#2a2a2a" strokeWidth="1" strokeLinecap="round" />
        <path d="M8 18 L14 24 L20 16" stroke="#2a2a2a" strokeWidth="1" strokeLinecap="round" />
        <line x1="22" y1="10" x2="28" y2="10" stroke="#2a2a2a" strokeWidth="1" />
        <line x1="22" y1="18" x2="28" y2="18" stroke="#2a2a2a" strokeWidth="1" />
        <line x1="22" y1="26" x2="28" y2="26" stroke="#2a2a2a" strokeWidth="1" />
      </svg>
    ),
    history: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" stroke="#2a2a2a" strokeWidth="1" />
        <path d="M16 8 L16 16 L22 16" stroke="#2a2a2a" strokeWidth="1" strokeLinecap="round" />
        <path d="M4 28 L10 28" stroke="#2a2a2a" strokeWidth="1" strokeLinecap="round" />
        <path d="M22 28 L28 28" stroke="#2a2a2a" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
    alerts: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <path d="M4 26 L8 10 C8 10 16 4 16 4 C16 4 24 10 24 10 L28 26 L4 26" stroke="#2a2a2a" strokeWidth="1" strokeLinejoin="round" />
        <line x1="4" y1="26" x2="28" y2="26" stroke="#2a2a2a" strokeWidth="1" />
        <circle cx="16" cy="20" r="3" stroke="#2a2a2a" strokeWidth="1" />
        <line x1="16" y1="23" x2="16" y2="26" stroke="#2a2a2a" strokeWidth="1" />
      </svg>
    ),
    markets: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="6" rx="0" stroke="#2a2a2a" strokeWidth="1" />
        <rect x="4" y="12" width="24" height="6" rx="0" stroke="#2a2a2a" strokeWidth="1" />
        <rect x="4" y="20" width="24" height="6" rx="0" stroke="#2a2a2a" strokeWidth="1" />
      </svg>
    ),
    orderbook: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="4" width="28" height="24" rx="0" stroke="#2a2a2a" strokeWidth="1" />
        <path d="M4 12 L16 12 L28 12" stroke="#2a2a2a" strokeWidth="1" />
        <path d="M4 16 L16 16 L28 16" stroke="#2a2a2a" strokeWidth="1" />
        <path d="M4 20 L16 20 L28 20" stroke="#2a2a2a" strokeWidth="1" />
        <path d="M4 24 L16 24 L28 24" stroke="#2a2a2a" strokeWidth="1" />
      </svg>
    ),
  };

  return icons[variant];
}

interface WalletConnectPromptProps {
  onConnect?: () => void;
  className?: string;
}

export function WalletConnectPrompt({ className }: WalletConnectPromptProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-10 px-6 text-center gap-4 border', className)}
      style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.06)', borderRadius: 0 }}
    >
      <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
        <rect x="2" y="8" width="36" height="24" rx="0" stroke="#2a2a2a" strokeWidth="1.5" />
        <rect x="4" y="10" width="32" height="20" rx="0" stroke="#2a2a2a" strokeWidth="1" />
        <circle cx="28" cy="20" r="5" stroke="#ff4500" strokeWidth="1.5" strokeOpacity="0.4" />
        <circle cx="28" cy="20" r="2" fill="#ff4500" fillOpacity="0.2" />
        <path d="M2 16 L38 16" stroke="#2a2a2a" strokeWidth="1" />
        <rect x="8" y="12" width="10" height="4" rx="0" fill="#ff4500" fillOpacity="0.1" />
      </svg>

      <div className="space-y-2">
        <p className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
          Wallet required
        </p>
        <p className="text-sm" style={{ color: '#444' }}>
          Connect your wallet to view positions, track history, and execute live trades.
        </p>
      </div>

      <p className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#2a2a2a' }}>
        Use the connect button in the top navigation
      </p>
    </div>
  );
}