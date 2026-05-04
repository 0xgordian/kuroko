'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAomiAuthAdapter } from '@/lib/aomi-auth-adapter';

const ONBOARDING_KEY = 'pa_onboarded_v1';

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'discover',
    label: '01 / DISCOVER',
    title: 'Live Market Intelligence',
    body: '1000+ active Polymarket prediction markets, scored in real time. The edge engine ranks by volume, liquidity, and 24h probability movement — surfacing opportunities before the crowd.',
    terminal: [
      '> scanning 1,847 active markets...',
      '> scoring: volume · liquidity · momentum',
      '',
      '  SCORE  MARKET                    PROB   24H',
      '  ════════════════════════════════════════════',
      '  94     Fed Rate Decision          58%   -4.1pp',
      '  87     Election Result            51%   +2.3pp',
      '  62     BTC > $150k               45%   +5.7pp',
      '',
      '> 3 opportunities surfaced',
    ],
  },
  {
    id: 'analyze',
    label: '02 / ANALYZE',
    title: 'AI With Real Data',
    body: 'Ask anything in plain language. The AI reads live market data, knows your positions, and gives specific analysis — not generic advice. Every response is grounded in real numbers.',
    terminal: [
      '> context: 1,847 markets · your positions',
      '',
      'YOU: best value bet near 50%?',
      '',
      'AI: Fed Rate Decision at 58% — volume',
      '    $42M, spread 12bps, moved -4.1pp',
      '    in 24h. Smart money positioning',
      '    ahead of the announcement.',
      '',
      '    50 YES shares @ 58¢ = $29.00',
      '    Payout if correct: $50.00 (+72%)',
      '',
      '> analysis complete',
    ],
  },
  {
    id: 'execute',
    label: '03 / EXECUTE',
    title: 'Paper Trade or Go Live',
    body: 'Simulate any trade with zero risk. Track your thesis, review outcomes, build your record. Connect your wallet when you\'re ready — the same flow routes to live execution on Polygon.',
    terminal: [
      '> mode: PAPER_TRADE (no funds at risk)',
      '',
      '  MARKET   Fed Rate Decision',
      '  SIDE     YES · 50 shares',
      '  PRICE    58¢',
      '  COST     $29.00',
      '  PAYOUT   $50.00 if correct',
      '  RETURN   +72%',
      '',
      '> trade recorded to history',
      '> connect wallet to go live',
    ],
  },
] as const;

type StepId = typeof STEPS[number]['id'];

// ─── Modal component ──────────────────────────────────────────────────────────

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const authAdapter = useAomiAuthAdapter();
  const touchStartX = useRef<number | null>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onComplete, 250);
  }, [onComplete]);

  const goNext = useCallback(() => {
    if (isLast) { dismiss(); return; }
    setStep((s) => s + 1);
  }, [isLast, dismiss]);

  const goPrev = useCallback(() => {
    if (!isFirst) setStep((s) => s - 1);
  }, [isFirst]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, dismiss]);

  // Swipe
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 60) { delta < 0 ? goNext() : goPrev(); }
    touchStartX.current = null;
  };

  const handleConnectWallet = () => {
    authAdapter.connect();
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(8px)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.25s ease',
      }}
    >
      <div
        className="relative w-full max-w-xl border"
        style={{
          backgroundColor: '#0a0a0a',
          borderColor: 'rgba(255,255,255,0.08)',
          borderRadius: 12,
          transform: exiting ? 'translateY(8px)' : 'translateY(0)',
          transition: 'transform 0.25s ease',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Top purple accent line */}
        <div className="h-[2px]" style={{ backgroundColor: '#7c3aed' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5"
              style={{ backgroundColor: '#7c3aed', boxShadow: '0 0 6px rgba(124,58,237,0.6)' }} />
            <span className="font-terminal text-[10px] tracking-[0.2em] uppercase" style={{ color: '#444' }}>
              kuroko // setup
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-terminal text-[10px] tracking-widest hidden sm:block" style={{ color: '#333' }}>
              {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
            </span>
            <button
              onClick={dismiss}
              className="font-terminal text-[10px] tracking-widest uppercase transition-colors"
              style={{ color: '#333' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#666'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#333'; }}
            >
              esc to skip
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-[1px]" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <div
            className="h-full"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              backgroundColor: '#7c3aed',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-7 lg:px-8 lg:py-8">
          {/* Step label */}
          <p className="font-terminal text-[10px] tracking-[0.3em] uppercase mb-5"
            style={{ color: '#7c3aed' }}>
            {current.label}
          </p>

          {/* Title + body */}
          <div className="mb-6">
            <h2 className="font-terminal text-xl lg:text-2xl font-bold tracking-tight mb-2"
              style={{ color: '#f0f0f0' }}>
              {current.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#666' }}>
              {current.body}
            </p>
          </div>

          {/* Terminal window */}
          <div className="border" style={{ backgroundColor: '#080808', borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12 }}>
            {/* Terminal chrome */}
            <div className="flex items-center gap-2 px-4 py-2 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0d0d0d' }}>
              <div className="flex gap-1.5">
                <div className="w-2 h-2" style={{ backgroundColor: '#2a2a2a', borderRadius: '50%' }} />
                <div className="w-2 h-2" style={{ backgroundColor: '#2a2a2a', borderRadius: '50%' }} />
                <div className="w-2 h-2" style={{ backgroundColor: '#7c3aed', borderRadius: '50%', boxShadow: '0 0 4px rgba(124,58,237,0.4)' }} />
              </div>
              <span className="font-terminal text-[10px] tracking-widest uppercase ml-2" style={{ color: '#2a2a2a' }}>
                kuroko
              </span>
            </div>
            {/* Terminal lines */}
            <div className="px-5 py-4 font-terminal text-[11px] leading-[1.8]">
              {current.terminal.map((line, i) => (
                <div key={i} style={{
                  color: line.startsWith('>')
                    ? '#7c3aed'
                    : line.startsWith('  ═')
                    ? 'rgba(124,58,237,0.3)'
                    : line.startsWith('YOU:')
                    ? '#f0f0f0'
                    : line.startsWith('AI:') || line.startsWith('    ')
                    ? '#888'
                    : line.startsWith('  ')
                    ? '#777'
                    : '#333',
                  whiteSpace: 'pre' as const,
                }}>
                  {line || '\u00A0'}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0d0d0d' }}>

          {/* Step dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  backgroundColor: i === step ? '#7c3aed' : i < step ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.08)',
                  boxShadow: i === step ? '0 0 6px rgba(124,58,237,0.4)' : 'none',
                  transition: 'width 0.3s ease, background-color 0.3s ease',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={goPrev}
                className="h-8 px-4 font-terminal text-[10px] tracking-widest uppercase border transition-all"
                style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#555', borderRadius: 12 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#a0a0a0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#555'; }}
              >
                ← Back
              </button>
            )}

            {isLast ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={dismiss}
                  className="h-8 px-4 font-terminal text-[10px] tracking-widest uppercase border transition-all"
                  style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#555', borderRadius: 12 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#a0a0a0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                  Skip for now
                </button>
                <button
                  onClick={handleConnectWallet}
                  className="h-8 px-5 font-terminal text-[10px] tracking-widest uppercase font-bold transition-all"
                  style={{ backgroundColor: '#7c3aed', color: '#fff', borderRadius: 12, transition: 'all 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; }}
                >
                  Connect Wallet →
                </button>
              </div>
            ) : (
              <button
                onClick={goNext}
                className="h-8 px-5 font-terminal text-[10px] tracking-widest uppercase font-bold transition-all"
                style={{ backgroundColor: '#7c3aed', color: '#fff', borderRadius: 12, transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#8b5cf6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; }}
              >
                Next →
              </button>
            )}
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-[1px]" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} />
      </div>
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useOnboarding — manages the welcome modal lifecycle.
 *
 * Trigger modes:
 *   'immediate' — show on first visit, before any interaction
 *   'after-first-message' — show after the user receives their first AI response
 *
 * Usage:
 *   const { modal, triggerOnboarding } = useOnboarding();
 *   // Call triggerOnboarding() after first AI response
 *   return <>{children}{modal}</>
 */
export function useOnboarding(trigger: 'immediate' | 'after-first-message' = 'after-first-message') {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const triggeredRef = useRef(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        if (trigger === 'immediate') setVisible(true);
      }
    } catch { /* ignore */ }
    setReady(true);
  }, [trigger]);

  const triggerOnboarding = useCallback(() => {
    if (triggeredRef.current) return;
    try {
      if (localStorage.getItem(ONBOARDING_KEY)) return;
    } catch { /* ignore */ }
    triggeredRef.current = true;
    // Small delay so the first AI response renders before the modal appears
    setTimeout(() => setVisible(true), 800);
  }, []);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* ignore */ }
    setVisible(false);
  }, []);

  return {
    modal: ready && visible ? <OnboardingModal onComplete={dismiss} /> : null,
    triggerOnboarding,
    isVisible: visible,
  };
}
