'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TopNavProps {
  isFallback?: boolean;
  isLoadingMarkets?: boolean;
  liveModeLabel?: string;
  isWalletConnected?: boolean;
  walletAddress?: string | null;
  rightSlot?: React.ReactNode;
  onToggleAI?: () => void;
  aiPanelOpen?: boolean;
  /** When provided, shows a Connect Wallet button in the nav (used on AI page) */
  onConnectWallet?: () => void;
  /** When provided, wallet address is clickable and opens Para account management */
  onManageWallet?: () => void;
}

const NAV_LINKS = [
  { href: '/', label: 'AI' },
  { href: '/trade', label: 'Trade' },
  { href: '/markets', label: 'Markets' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/execute', label: 'Execute' },
];

export default function TopNav({
  isFallback = false,
  isLoadingMarkets = false,
  liveModeLabel = 'Paper Mode',
  isWalletConnected = false,
  walletAddress,
  rightSlot,
  onToggleAI,
  aiPanelOpen = true,
  onConnectWallet,
  onManageWallet,
}: TopNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#0d0d0d' }}
    >
      <div className="relative max-w-[1400px] mx-auto px-4 h-12 flex items-center">

        {/* LEFT — Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-terminal text-sm font-bold tracking-tight hidden sm:block" style={{ color: '#f0f0f0' }}>
            KUROKO
          </span>
          <span className="font-terminal text-xs font-bold tracking-tight sm:hidden" style={{ color: '#f0f0f0' }}>
            KUROKO
          </span>
        </div>

        {/* CENTER — Nav links (absolutely centered, desktop only) */}
        <nav className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="font-terminal text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 transition-all relative"
                style={{ color: active ? '#ff4500' : '#555' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#a0a0a0'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#555'; }}
              >
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: '#ff4500' }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT — Status + wallet (desktop) */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isFallback ? '#f59e0b' : isLoadingMarkets ? '#444' : '#ff4500',
                boxShadow: !isFallback && !isLoadingMarkets ? '0 0 6px rgba(255,69,0,0.6)' : 'none',
              }}
            />
            <span className="font-terminal text-[10px] tracking-widest uppercase hidden md:block"
              style={{ color: isFallback ? '#f59e0b' : isLoadingMarkets ? '#444' : '#ff4500' }}>
              {isLoadingMarkets ? 'Loading' : isFallback ? 'Fallback' : 'Live'}
            </span>
            <span className="hidden md:block font-terminal text-[10px]" style={{ color: '#2a2a2a' }}>|</span>
            <span className="hidden md:block font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#444' }}>
              {liveModeLabel}
            </span>
            {isWalletConnected && walletAddress && (
              <>
                <span className="hidden md:block font-terminal text-[10px]" style={{ color: '#2a2a2a' }}>|</span>
                {onManageWallet ? (
                  <button
                    onClick={onManageWallet}
                    className="font-terminal text-[10px] tracking-widest uppercase transition-colors"
                    style={{ color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#86efac'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#4ade80'; }}
                    aria-label="Manage wallet"
                  >
                    ● {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                  </button>
                ) : (
                  <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#4ade80' }}>
                    ● {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                  </span>
                )}
              </>
            )}
          </div>

          {rightSlot}

          {/* Connect Wallet CTA — shown on AI page when not connected */}
          {onConnectWallet && !isWalletConnected && (
            <button
              onClick={onConnectWallet}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 border font-terminal text-[10px] tracking-widest uppercase font-bold transition-all"
              style={{
                borderColor: '#ff4500',
                color: '#ff4500',
                backgroundColor: 'rgba(255,69,0,0.08)',
                borderRadius: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,69,0,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,69,0,0.08)'; }}
            >
              Connect Wallet
            </button>
          )}

          {/* AI panel toggle — only shown when onToggleAI is provided (trade page) */}
          {onToggleAI && (
            <button
              onClick={onToggleAI}
              title={aiPanelOpen ? 'Hide AI panel' : 'Show AI panel'}
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 border font-terminal text-[10px] tracking-widest uppercase transition-all"
              style={{
                borderColor: aiPanelOpen ? 'rgba(255,69,0,0.5)' : 'rgba(255,255,255,0.12)',
                color: aiPanelOpen ? '#ff4500' : '#555',
                backgroundColor: aiPanelOpen ? 'rgba(255,69,0,0.08)' : 'transparent',
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                if (!aiPanelOpen) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                  e.currentTarget.style.color = '#a0a0a0';
                }
              }}
              onMouseLeave={(e) => {
                if (!aiPanelOpen) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.color = '#555';
                }
              }}
            >
              {/* Simple panel icon — two vertical bars */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="2" width="5" height="12" rx="0" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="2" width="6" height="12" rx="0" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>AI</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            className="sm:hidden flex flex-col gap-1 p-2 ml-1"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="w-4 h-[1.5px]" style={{ backgroundColor: mobileMenuOpen ? '#ff4500' : '#a0a0a0' }} />
            <span className="w-4 h-[1.5px]" style={{ backgroundColor: mobileMenuOpen ? '#ff4500' : '#a0a0a0' }} />
            <span className="w-4 h-[1.5px]" style={{ backgroundColor: mobileMenuOpen ? '#ff4500' : '#a0a0a0' }} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div
          className="sm:hidden border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#0d0d0d' }}
        >
          {/* Nav links */}
          <div className="flex flex-col">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-terminal text-[11px] font-bold tracking-widest uppercase px-4 py-3 border-b flex items-center justify-between"
                  style={{
                    color: active ? '#ff4500' : '#a0a0a0',
                    borderColor: 'rgba(255,255,255,0.06)',
                    backgroundColor: active ? 'rgba(255,69,0,0.05)' : 'transparent',
                  }}
                >
                  {link.label}
                  {active && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ff4500' }} />}
                </Link>
              );
            })}
          </div>
          {/* Status row */}
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isFallback ? '#f59e0b' : '#ff4500' }} />
            <span className="font-terminal text-[10px] tracking-widest uppercase"
              style={{ color: isFallback ? '#f59e0b' : '#ff4500' }}>
              {isFallback ? 'Fallback' : 'Live'}
            </span>
            <span className="font-terminal text-[10px]" style={{ color: '#2a2a2a' }}>·</span>
            <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#444' }}>
              {liveModeLabel}
            </span>
            {isWalletConnected && walletAddress && (
              <span className="font-terminal text-[10px] ml-auto" style={{ color: '#4ade80' }}>
                {onManageWallet ? (
                  <button
                    onClick={onManageWallet}
                    style={{ color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#86efac'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#4ade80'; }}
                  >
                    ● {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                  </button>
                ) : (
                  <>● {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</>
                )}
              </span>
            )}
          </div>

          {/* Mobile wallet connect / manage */}
          {onConnectWallet && !isWalletConnected && (
            <div className="px-4 pb-3">
              <button
                onClick={() => { onConnectWallet(); setMobileMenuOpen(false); }}
                className="w-full py-2.5 border font-terminal text-[10px] tracking-widest uppercase font-bold transition-all"
                style={{
                  borderColor: '#ff4500',
                  color: '#ff4500',
                  backgroundColor: 'rgba(255,69,0,0.08)',
                  borderRadius: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,69,0,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,69,0,0.08)'; }}
              >
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
