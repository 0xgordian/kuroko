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
  chainId?: number | null;
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
  chainId,
  rightSlot,
  onToggleAI,
  aiPanelOpen = true,
  onConnectWallet,
  onManageWallet,
}: TopNavProps) {
  const pathname = usePathname();
  const mobileMenuOpenState = useState(false);
  const mobileMenuOpen = mobileMenuOpenState[0];
  const setMobileMenuOpen = mobileMenuOpenState[1];

  const isLive = !isFallback && !isLoadingMarkets;
  const isArc = chainId === 5042002;

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
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 h-14 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">

        {/* LEFT — Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold tracking-tight hidden sm:block whitespace-nowrap" style={{ color: '#f0f0f0', fontFamily: 'var(--font-sans)' }}>
            KUROKO
          </span>
          <span className="text-xs font-bold tracking-tight sm:hidden whitespace-nowrap" style={{ color: '#f0f0f0', fontFamily: 'var(--font-sans)' }}>
            KUROKO
          </span>
        </div>

        {/* CENTER — Nav links */}
        <nav className="hidden lg:flex min-w-0 items-center justify-center gap-1 overflow-hidden">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs xl:text-sm font-medium px-2.5 xl:px-3 py-1.5 transition-all relative whitespace-nowrap"
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
        <div className="justify-self-end flex items-center gap-1.5 xl:gap-2 min-w-0">
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 min-w-0">
            {/* Live status pill */}
            <div
              className="flex items-center gap-1.5 px-2 xl:px-2.5 py-1 border shrink-0"
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
                className="font-terminal text-[10px] tracking-widest uppercase hidden xl:block"
                style={{ color: isFallback ? '#f59e0b' : isLoadingMarkets ? '#444' : '#7c3aed' }}
              >
                {isLoadingMarkets ? 'Loading' : isFallback ? 'Fallback' : 'Live'}
              </span>
            </div>

            {/* Chain badge */}
            {isArc && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 border shrink-0"
                style={{
                  backgroundColor: 'rgba(59,130,246,0.1)',
                  borderColor: 'rgba(59,130,246,0.25)',
                  borderRadius: 9999,
                }}
                title="Connected to Arc Testnet"
              >
                <svg width="16" height="12" viewBox="0 0 146 50" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                  <path d="M23.8574 0C31.0115 0 37.371 6.19775 41.7656 17.4521C44.0513 23.3056 45.7332 30.2603 46.7295 37.8262C46.8186 38.5019 46.8939 39.1888 46.9717 39.874C46.9969 39.9162 47.0119 39.9553 47.0068 39.9873C47.0068 39.9873 47.5924 43.6447 47.7168 50H47.6514C46.7829 49.2873 36.54 41.2389 19.5615 43.5693C19.8177 40.6962 20.1699 37.9004 20.625 35.2207C20.6482 35.0838 20.6755 34.9514 20.6992 34.8154C27.3585 34.6146 33.1876 35.3879 37.6572 36.4014C37.6406 36.2954 37.6263 36.1865 37.6094 36.0811C36.6906 30.3599 35.3355 25.1217 33.5879 20.6455C30.7304 13.3264 27.001 8.77832 23.8574 8.77832C20.7141 8.77863 16.9853 13.3266 14.1279 20.6455C13.4363 22.4157 12.8068 24.3036 12.2422 26.2949C11.4483 29.0854 10.7807 32.0773 10.248 35.2207C9.45968 39.8629 8.96755 44.8418 8.78613 50H0C0.405408 37.7593 2.48104 26.3352 5.9502 17.4521C10.3437 6.19798 16.7036 0.000184295 23.8574 0Z" fill="#3b82f6" />
                  <path d="M131.198 16.6523C134.06 16.6524 136.482 17.1955 138.466 18.2783C140.448 19.3622 142.002 20.7725 143.127 22.5098C144.251 24.2481 144.957 26.0777 145.243 27.999L141.624 28.7354C141.419 27.1408 140.908 25.6789 140.091 24.3496C139.272 23.0217 138.128 21.9584 136.656 21.1611C135.184 20.3638 133.365 19.9649 131.198 19.9648C129.031 19.9648 127.088 20.4664 125.371 21.4678C123.654 22.4702 122.294 23.8806 121.293 25.6992C120.291 27.5192 119.79 29.6764 119.79 32.1699V32.6602C119.79 35.1546 120.291 37.312 121.293 39.1309C122.295 40.9507 123.654 42.3619 125.371 43.3633C127.088 44.3657 129.031 44.8662 131.198 44.8662C134.469 44.8662 136.963 44.0174 138.681 42.3203C140.398 40.624 141.461 38.5481 141.87 36.0947L145.488 36.8311C145.12 38.7534 144.354 40.5828 143.188 42.3203C142.023 44.0587 140.448 45.4699 138.466 46.5527C136.482 47.6355 134.06 48.1777 131.198 48.1777C128.295 48.1777 125.709 47.5534 123.439 46.3066C121.17 45.0599 119.381 43.2709 118.073 40.9404C116.764 38.6097 116.11 35.8707 116.11 32.7217V32.1084C116.11 28.9191 116.764 26.1698 118.073 23.8594C119.381 21.5499 121.17 19.7711 123.439 18.5234C125.709 17.2767 128.295 16.6523 131.198 16.6523Z" fill="#3b82f6" />
                  <path d="M97.2402 47.3193H93.1309L89.4512 35.9111H69.9473L66.2666 47.3193H62.1582L76.2031 4.38672H83.1943L97.2402 47.3193ZM116.065 20.8232H112.14C109.89 20.8233 108.091 21.4578 106.742 22.7246C105.393 23.9925 104.719 25.9754 104.719 28.6738V47.3193H101.038V17.5117H104.596V21.2529H105.332C105.904 19.9035 106.752 18.9219 107.877 18.3086C109.001 17.6953 110.566 17.3887 112.569 17.3887H116.065V20.8232ZM71.0508 32.3545H88.3467L80.0664 6.7168H79.3311L71.0508 32.3545Z" fill="#3b82f6" />
                </svg>
                <span
                  className="font-terminal text-[10px] tracking-widest uppercase hidden xl:block"
                  style={{ color: '#3b82f6' }}
                >
                  Arc
                </span>
              </div>
            )}

            <span className="hidden xl:block font-terminal text-[10px] shrink-0" style={{ color: '#2a2a2a' }}>|</span>
            <span className="hidden xl:block font-terminal text-[10px] tracking-widest uppercase whitespace-nowrap shrink-0" style={{ color: '#444' }}>
              {liveModeLabel}
            </span>

            {isWalletConnected && walletAddress && (
              <>
                <span className="hidden xl:block font-terminal text-[10px] shrink-0" style={{ color: '#2a2a2a' }}>|</span>
                {onManageWallet ? (
                  <button
                    onClick={onManageWallet}
                    className="flex items-center gap-1.5 px-2 xl:px-2.5 py-1 border transition-colors whitespace-nowrap shrink-0"
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
                    className="flex items-center gap-1.5 px-2 xl:px-2.5 py-1 border whitespace-nowrap shrink-0"
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
              className="hidden lg:flex items-center gap-1.5 px-3 xl:px-4 py-1.5 font-terminal text-[10px] tracking-widest uppercase font-bold transition-all whitespace-nowrap shrink-0"
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
              className="hidden lg:flex items-center gap-1.5 px-2 py-1 border font-terminal text-[10px] tracking-widest uppercase transition-all whitespace-nowrap shrink-0"
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
            className="lg:hidden flex flex-col gap-1 p-3 ml-1 min-w-[44px] min-h-[44px] items-center justify-center shrink-0"
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
          className="lg:hidden border-t"
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isLive ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: isFallback ? '#f59e0b' : '#7c3aed' }}
            />
            <span className="font-terminal text-[10px] tracking-widest uppercase"
              style={{ color: isFallback ? '#f59e0b' : '#7c3aed' }}>
              {isFallback ? 'Fallback' : 'Live'}
            </span>
            {isArc && (
              <>
                <span className="font-terminal text-[10px]" style={{ color: '#2a2a2a' }}>·</span>
                <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#3b82f6' }}>
                  Arc
                </span>
              </>
            )}
            <span className="font-terminal text-[10px]" style={{ color: '#2a2a2a' }}>·</span>
            <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#444' }}>
              {liveModeLabel}
            </span>
            {isWalletConnected && walletAddress && (
              <span className="font-terminal text-[10px] lg:ml-auto min-w-0" style={{ color: '#4ade80' }}>
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
