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
  onConnectWallet?: () => void;
  onManageWallet?: () => void;
}

const NAV_LINKS = [
  { href: '/', label: 'Agent' },
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

  const isLive = !isFallback && !isLoadingMarkets;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(9,9,11,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="relative max-w-[1400px] mx-auto px-4 h-14 flex items-center">

        {/* LEFT — Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold tracking-tight hidden sm:block" style={{ color: '#f0f0f0', fontFamily: 'var(--font-sans)' }}>
            KUROKO
          </span>
          <span className="text-xs font-bold tracking-tight sm:hidden" style={{ color: '#f0f0f0', fontFamily: 'var(--font-sans)' }}>
            KUROKO
          </span>
        </div>

        {/* CENTER — Nav links */}
        <nav className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium px-3 py-1.5 transition-all relative"
                style={{
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderRadius: 6,
                  fontFamily: 'var(--font-sans)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT — Status + wallet */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            {/* Live status pill */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.08)',
                borderRadius: 9999,
              }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isLive ? 'animate-pulse' : ''}`}
                style={{
                  backgroundColor: isFallback ? '#f59e0b' : isLoadingMarkets ? '#444' : '#7c3aed',
                  boxShadow: isLive ? '0 0 6px rgba(124,58,237,0.8)' : 'none',
                }}
              />
              <span
                className="font-terminal text-[10px] tracking-widest uppercase hidden md:block"
                style={{ color: isFallback ? '#f59e0b' : isLoadingMarkets ? '#444' : '#7c3aed' }}
              >
                {isLoadingMarkets ? 'Loading' : isFallback ? 'Fallback' : 'Live'}
              </span>
            </div>

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
                    className="flex items-center gap-1.5 px-2.5 py-1 border transition-colors"
                    style={{
                      backgroundColor: 'rgba(74,222,128,0.1)',
                      borderColor: 'rgba(74,222,128,0.2)',
                      color: '#4ade80',
                      borderRadius: 9999,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(74,222,128,0.18)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(74,222,128,0.1)'; }}
                    aria-label="Manage wallet"
                  >
                    ● {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                  </button>
                ) : (
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1 border"
                    style={{
                      backgroundColor: 'rgba(74,222,128,0.1)',
                      borderColor: 'rgba(74,222,128,0.2)',
                      color: '#4ade80',
                      borderRadius: 9999,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ● {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                  </span>
                )}
              </>
            )}
          </div>

          {rightSlot}

          {/* Connect Wallet CTA */}
          {onConnectWallet && !isWalletConnected && (
            <button
              onClick={onConnectWallet}
              className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 font-terminal text-[10px] tracking-widest uppercase font-bold transition-all"
              style={{
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                borderRadius: 9999,
                border: 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; }}
            >
              Connect Wallet
            </button>
          )}

          {/* AI panel toggle */}
          {onToggleAI && (
            <button
              onClick={onToggleAI}
              title={aiPanelOpen ? 'Hide AI panel' : 'Show AI panel'}
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 border font-terminal text-[10px] tracking-widest uppercase transition-all"
              style={{
                borderColor: aiPanelOpen ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.12)',
                color: aiPanelOpen ? '#a78bfa' : '#555',
                backgroundColor: aiPanelOpen ? 'rgba(124,58,237,0.08)' : 'transparent',
                borderRadius: 12,
                transition: 'all 0.15s ease',
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
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="2" width="5" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="2" width="6" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Agent</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            className="sm:hidden flex flex-col gap-1 p-3 ml-1 min-w-[44px] min-h-[44px] items-center justify-center"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="w-4 h-[1.5px]" style={{ backgroundColor: mobileMenuOpen ? '#7c3aed' : '#a0a0a0' }} />
            <span className="w-4 h-[1.5px]" style={{ backgroundColor: mobileMenuOpen ? '#7c3aed' : '#a0a0a0' }} />
            <span className="w-4 h-[1.5px]" style={{ backgroundColor: mobileMenuOpen ? '#7c3aed' : '#a0a0a0' }} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div
          className="sm:hidden border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(9,9,11,0.95)' }}
        >
          <div className="flex flex-col">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium px-4 py-3 border-b flex items-center justify-between"
                  style={{
                    color: active ? '#ffffff' : 'rgba(255,255,255,0.5)',
                    borderColor: 'rgba(255,255,255,0.06)',
                    backgroundColor: active ? 'rgba(124,58,237,0.08)' : 'transparent',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {link.label}
                  {active && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#7c3aed' }} />}
                </Link>
              );
            })}
          </div>

          {/* Status row */}
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isLive ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: isFallback ? '#f59e0b' : '#7c3aed' }}
            />
            <span className="font-terminal text-[10px] tracking-widest uppercase"
              style={{ color: isFallback ? '#f59e0b' : '#7c3aed' }}>
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
                  >
                    ● {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                  </button>
                ) : (
                  <>● {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</>
                )}
              </span>
            )}
          </div>

          {/* Mobile wallet connect */}
          {onConnectWallet && !isWalletConnected && (
            <div className="px-4 pb-3">
              <button
                onClick={() => { onConnectWallet(); setMobileMenuOpen(false); }}
                className="w-full py-2.5 font-terminal text-[10px] tracking-widest uppercase font-bold transition-all"
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  borderRadius: 12,
                  border: 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; }}
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
