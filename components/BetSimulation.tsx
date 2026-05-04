'use client';

import { useState } from 'react';
import type { BetProposal } from '@/types';
import ExecutionBadge from './ExecutionBadge';
import PnlCard from './PnlCard';
import { addTradeRecord } from '@/lib/services/tradeHistoryService';
import { sendLiveOrder } from '@/lib/services/tradeIntentService';
import { useAppStore } from '@/lib/stores/appStore';
import { useAomiAuthAdapter } from '@/lib/aomi-auth-adapter';

const MAX_SHARES = 10000;
const MAX_COST_USD = 10000;

interface BetSimulationProps {
  proposal?: BetProposal | null;
  isSubmitting?: boolean;
  onConfirm?: () => void;
  onDismiss?: () => void;
  slippageBps?: number | null;
}

export default function BetSimulation({ proposal, isSubmitting: externalSubmitting, onConfirm, onDismiss, slippageBps }: BetSimulationProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [showPnl, setShowPnl] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  // Dollar-based sizing — user inputs dollars, shares are derived
  const [dollarAmount, setDollarAmount] = useState<string>('');
  const shareToChat = useAppStore((s) => s.shareToChat);
  const authAdapter = useAomiAuthAdapter();

  const isSubmitting = externalSubmitting || isExecuting;

  if (!proposal) return null;
  const { market, side, shares: defaultShares, pricePerShare, totalCost: defaultCost, estimatedReturn: defaultReturn, mode, backendResponse } = proposal;

  // Derive shares + costs from dollar input if provided
  const parsedDollars = parseFloat(dollarAmount);
  const effectiveCost = !isNaN(parsedDollars) && parsedDollars > 0
    ? Math.min(parsedDollars, MAX_COST_USD)
    : defaultCost;
  const effectiveShares = pricePerShare > 0
    ? Math.min(Math.floor((effectiveCost / pricePerShare) * 100), MAX_SHARES)
    : defaultShares;
  const effectivePayout = effectiveShares;
  const effectiveReturn = effectiveCost > 0 ? ((effectivePayout - effectiveCost) / effectiveCost) * 100 : defaultReturn;

  const shares = effectiveShares;
  const totalCost = effectiveCost;
  const estimatedPayout = effectivePayout;
  const estimatedReturn = effectiveReturn;

  const modeLabel = mode === 'SIGNING_REQUIRED' ? 'Live Execution' : mode === 'EXECUTED' ? 'Executed' : 'Paper Trade';
  const isLive = mode === 'SIGNING_REQUIRED' || mode === 'EXECUTED';

  const handleConfirm = async () => {
    setExecutionError(null);

    // Live execution path — wallet connected + API key present
    if (isLive && authAdapter.identity.isConnected && authAdapter.identity.address && market.clobTokenId) {
      setIsExecuting(true);
      try {
        const result = await sendLiveOrder({
          walletAddress: authAdapter.identity.address,
          tokenId: market.clobTokenId,
          side: side === 'YES' ? 'BUY' : 'SELL',
          price: pricePerShare / 100,
          shares,
          marketQuestion: market.question,
          chainId: authAdapter.identity.chainId ?? 137,
        });

        addTradeRecord({
          marketQuestion: market.question,
          marketId: market.id,
          side,
          shares,
          pricePerShare,
          totalCost,
          mode: result.mode,
          status: result.success ? 'confirmed' : 'failed',
          txHash: result.txHash,
        });

        const txSuffix = result.txHash ? ' — tx: ' + result.txHash.slice(0, 10) + '...' : '';
        shareToChat({
          type: 'trade_confirmed',
          message: (result.mode === 'EXECUTED' ? 'Executed' : 'Signed') + ' ' + side + ' ' + shares + ' shares on "' + market.question.slice(0, 50) + '..." at ' + pricePerShare + '¢' + txSuffix,
          details: { marketId: market.id, side, shares, pricePerShare, totalCost, txHash: result.txHash },
        });
      } catch (err) {
        setExecutionError(err instanceof Error ? err.message : 'Execution failed');
        setIsExecuting(false);
        return;
      }
      setIsExecuting(false);
    } else {
      // Paper trade path
      addTradeRecord({
        marketQuestion: market.question,
        marketId: market.id,
        side,
        shares,
        pricePerShare,
        totalCost,
        mode,
        status: 'confirmed',
      });

      shareToChat({
        type: 'trade_confirmed',
        message: 'Confirmed ' + side + ' ' + shares + ' shares on "' + market.question.slice(0, 50) + '..." at ' + pricePerShare + '¢',
        details: { marketId: market.id, side, shares, pricePerShare, totalCost },
      });
    }

    setConfirmed(true);
    onConfirm?.();
  };

  if (showPnl) {
    const tradeRecord = {
      id: 'sim-' + Date.now(),
      timestamp: new Date().toISOString(),
      marketQuestion: market.question,
      marketId: market.id,
      side,
      shares,
      pricePerShare,
      totalCost,
      mode,
      status: 'confirmed' as const,
    };
    return <PnlCard trade={tradeRecord} onClose={() => { setShowPnl(false); onDismiss?.(); }} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md border panel-bracket max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="font-terminal text-[10px] font-bold tracking-widest uppercase" style={{ color: '#a0a0a0' }}>
            Bet Simulation {'// Review'}
          </p>
          <div className="flex items-center gap-2">
            <span className="font-terminal text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 border"
              style={{
                color: isLive ? '#4ade80' : '#f59e0b',
                borderColor: isLive ? 'rgba(74,222,128,0.3)' : 'rgba(245,158,11,0.3)',
                backgroundColor: isLive ? 'rgba(74,222,128,0.08)' : 'rgba(245,158,11,0.08)',
                borderRadius: 12,
              }}>
              {modeLabel}
            </span>
            <ExecutionBadge mode={mode} />
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Market */}
          <div className="p-3 border" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
            <p className="font-terminal text-[10px] tracking-widest uppercase mb-1.5" style={{ color: '#555' }}>Market</p>
            <p className="text-sm leading-snug" style={{ color: '#f0f0f0' }}>{market.question}</p>
          </div>

          {/* Trade grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 border" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Action</p>
              <p className="text-sm font-bold font-terminal" style={{ color: '#7c3aed' }}>BUY {side}</p>
            </div>
            <div className="p-3 border" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Shares</p>
              <p className="text-sm font-bold font-terminal" style={{ color: '#f0f0f0' }}>{shares}</p>
            </div>
            <div className="p-3 border" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Price / Share</p>
              <p className="text-sm font-bold font-terminal" style={{ color: '#f0f0f0' }}>{pricePerShare}¢</p>
            </div>
            <div className="p-3 border" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Total Cost</p>
              <p className="text-sm font-bold font-terminal" style={{ color: '#f0f0f0' }}>${totalCost.toFixed(2)}</p>
            </div>
          </div>

          {/* Dollar sizing input */}
          <div className="p-3 border" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
            <p className="font-terminal text-[10px] tracking-widest uppercase mb-2" style={{ color: '#555' }}>
              Position Size <span style={{ color: '#333' }}>{'// $ → shares'}</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="font-terminal text-sm" style={{ color: '#555' }}>$</span>
              <input
                type="number"
                min={1}
                max={MAX_COST_USD}
                step={10}
                value={dollarAmount}
                onChange={(e) => setDollarAmount(e.target.value)}
                placeholder={defaultCost.toFixed(2)}
                className="flex-1 text-sm px-3 py-2 border outline-none font-terminal"
                style={{
                  backgroundColor: '#111',
                  borderColor: dollarAmount ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.12)',
                  color: '#f0f0f0',
                  borderRadius: 12,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = dollarAmount ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.12)')}
              />
              <span className="font-terminal text-[10px] tracking-widest uppercase shrink-0" style={{ color: '#555' }}>
                = {shares} shares
              </span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setDollarAmount(String(amt))}
                  className="px-2 py-1 border font-terminal text-[10px] tracking-widest uppercase transition-colors"
                  style={{
                    borderColor: dollarAmount === String(amt) ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                    color: dollarAmount === String(amt) ? '#7c3aed' : '#555',
                    backgroundColor: dollarAmount === String(amt) ? 'rgba(124,58,237,0.08)' : 'transparent',
                    borderRadius: 8,
                  }}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {slippageBps != null && (
            <div className="p-3 border" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Slippage Est.</p>
              <p className="text-sm font-bold font-terminal"
                style={{ color: slippageBps <= 20 ? '#4ade80' : slippageBps <= 50 ? '#f59e0b' : '#f87171' }}>
                {slippageBps} bps ({(slippageBps / 100).toFixed(2)}%)
              </p>
            </div>
          )}

          {/* Payout */}
          <div className="p-4 border panel-bracket"
            style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(124,58,237,0.2)', borderRadius: 12 }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>If Correct</p>
                <p className="text-3xl font-terminal font-bold"
                  style={{ color: '#7c3aed', textShadow: '0 0 16px rgba(124,58,237,0.35)' }}>
                  ${estimatedPayout.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#555' }}>Return</p>
                <p className="text-3xl font-terminal font-bold" style={{ color: '#7c3aed' }}>
                  +{estimatedReturn.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Workflow handoff */}
          <div className="p-3 border panel-bracket"
            style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
            <p className="font-terminal text-[10px] tracking-widest uppercase mb-2" style={{ color: '#555' }}>
              Workflow Handoff
            </p>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#a0a0a0' }}>
              {mode === 'SIGNING_REQUIRED'
                ? 'Wallet review will be required before anything can happen onchain.'
                : mode === 'EXECUTED'
                  ? 'Execution has been confirmed and the flow can move into post-trade review.'
                  : 'This stays in paper mode until wallet and live assistant routing are both available.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(mode === 'SIGNING_REQUIRED'
                ? ['Review thesis', 'Route intent to assistant', 'Open wallet review', 'User signs']
                : ['Review thesis', 'Store paper trade', 'Compare outcome later']
              ).map((step, index, steps) => (
                <span
                  key={step}
                  className="px-2 py-1 border font-terminal text-[10px] tracking-widest uppercase"
                  style={{
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: index === steps.length - 1 && mode === 'SIGNING_REQUIRED' ? '#7c3aed' : '#666',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                  }}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>

          {/* Execution error */}
          {executionError && (
            <div className="p-3 border" style={{ backgroundColor: 'rgba(248,113,113,0.05)', borderColor: 'rgba(248,113,113,0.3)', borderRadius: 12 }}>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#f87171' }}>
                Execution Failed
              </p>
              <p className="text-xs" style={{ color: '#a0a0a0' }}>{executionError}</p>
            </div>
          )}

          {/* Confirmed state */}
          {confirmed && (
            <div className="p-3 border" style={{ backgroundColor: 'rgba(74,222,128,0.05)', borderColor: 'rgba(74,222,128,0.2)', borderRadius: 12 }}>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1" style={{ color: '#4ade80' }}>
                ✓ Trade Recorded
              </p>
              <p className="text-xs" style={{ color: '#a0a0a0' }}>
                {isLive ? 'Sent to wallet for signing.' : 'Saved to Trade History in Portfolio.'}
              </p>
            </div>
          )}

          {backendResponse && !backendResponse.includes('Paper trade simulation') && (
            <div className="p-3 border" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
              <p className="font-terminal text-[10px] tracking-widest uppercase mb-1.5" style={{ color: '#555' }}>Agent Response</p>
              <p className="text-sm leading-relaxed" style={{ color: '#a0a0a0' }}>{backendResponse}</p>
            </div>
          )}

          {/* Mode explanation */}
          {!confirmed && (
            <p className="text-xs" style={{ color: '#555' }}>
              {isLive
                ? 'Live mode — wallet signing required to execute on-chain.'
                : 'Paper mode — no real funds. Trade saved to history for tracking.'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onDismiss}
            className="flex-1 py-3 text-sm font-medium border transition-all"
            style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#a0a0a0', borderRadius: 12, transition: 'all 0.15s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#f0f0f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#a0a0a0'; }}
          >
            {confirmed ? 'Close' : 'Cancel'}
          </button>

          {confirmed ? (
            <button
              onClick={() => setShowPnl(true)}
              className="flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: '#161616', color: '#7c3aed', borderRadius: 12, border: '1px solid rgba(124,58,237,0.3)' }}
            >
              View PnL Card
            </button>
          ) : (
            <button
              onClick={() => { void handleConfirm(); }}
              disabled={isSubmitting}
              className="flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: isSubmitting ? '#1a1a1a' : '#7c3aed', color: isSubmitting ? '#555' : '#fff', borderRadius: 12, transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#8b5cf6'; }}
              onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#7c3aed'; }}
              onMouseDown={(e) => { if (!isSubmitting) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : isLive ? 'Send to Wallet' : 'Confirm Paper Trade'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
