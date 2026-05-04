'use client';

import { useState, type FC } from 'react';
import { addTradeRecord } from '@/lib/services/tradeHistoryService';
import { sendLiveOrder } from '@/lib/services/tradeIntentService';
import { resolveTokenIdFromQuestion } from '@/lib/services/marketService';
import { useAppStore } from '@/lib/stores/appStore';
import { useAomiAuthAdapter } from '@/lib/aomi-auth-adapter';

interface TradeCardData {
  action: 'trade_card';
  market: string;
  side: 'YES' | 'NO';
  shares: number;
  price: number;
  reasoning?: string;
}

interface TradeCardProps {
  data: TradeCardData;
}

function isTradeCardJson(text: string): TradeCardData | null {
  try {
    const match = text.match(/\{[\s\S]*"action"\s*:\s*"trade_card"[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (parsed.action === 'trade_card' && parsed.market && parsed.side && parsed.shares) {
      return parsed as TradeCardData;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseTradeCard(text: string): TradeCardData | null {
  return isTradeCardJson(text);
}

type ConfirmState = 'idle' | 'confirming' | 'executing' | 'done' | 'error';

export const TradeCard: FC<TradeCardProps> = ({ data }) => {
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const shareToChat = useAppStore((s) => s.shareToChat);
  const authAdapter = useAomiAuthAdapter();

  const totalCost = (data.shares * data.price) / 100;
  const estimatedPayout = data.shares; // 1 share = $1 if correct
  const estimatedReturn = totalCost > 0 ? ((estimatedPayout - totalCost) / totalCost) * 100 : 0;
  const sideColor = data.side === 'YES' ? '#4ade80' : '#f87171';
  const isWalletConnected = authAdapter.identity.isConnected;

  const handleExecute = async () => {
    setConfirmState('executing');
    setErrorMsg(null);

    try {
      // Try live execution if wallet connected
      if (isWalletConnected && authAdapter.identity.address) {
        const storeMarkets = useAppStore.getState().markets;
        const q = data.market.toLowerCase();
        const storeMatch = storeMarkets.find(
          (m) =>
            m.question.toLowerCase() === q ||
            m.question.toLowerCase().includes(q.slice(0, 40)),
        );
        const resolvedTokenId =
          storeMatch?.clobTokenId ??
          resolveTokenIdFromQuestion(data.market) ??
          '';

        if (!resolvedTokenId) {
          console.warn(
            '[TradeCard] Could not resolve CLOB token ID for market:',
            data.market,
            '— proceeding without it. Live order will use intent-only routing.',
          );
        }

        const result = await sendLiveOrder({
          walletAddress: authAdapter.identity.address,
          tokenId: resolvedTokenId,
          side: data.side === 'YES' ? 'BUY' : 'SELL',
          price: data.price / 100,
          shares: data.shares,
          marketQuestion: data.market,
          chainId: authAdapter.identity.chainId ?? 137,
        });

        addTradeRecord({
          marketQuestion: data.market,
          marketId: data.market.slice(0, 40),
          side: data.side,
          shares: data.shares,
          pricePerShare: data.price,
          totalCost,
          mode: result.mode,
          status: result.success ? 'confirmed' : 'failed',
          txHash: result.txHash,
        });

        if (result.txHash) setTxHash(result.txHash);
      } else {
        // Paper trade
        addTradeRecord({
          marketQuestion: data.market,
          marketId: data.market.slice(0, 40),
          side: data.side,
          shares: data.shares,
          pricePerShare: data.price,
          totalCost,
          mode: 'PAPER_TRADE',
          status: 'confirmed',
        });
      }

      shareToChat({
        type: 'trade_confirmed',
        message: `Confirmed ${data.side} ${data.shares} shares on "${data.market.slice(0, 50)}..." at ${data.price}¢`,
        details: { side: data.side, shares: data.shares, price: data.price, totalCost },
      });

      setConfirmState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Execution failed');
      setConfirmState('error');
    }
  };

  // Idle state — show trade summary + action buttons
  if (confirmState === 'idle') {
    return (
      <div
        className="my-3 border panel-bracket"
        style={{ backgroundColor: '#111', borderColor: 'rgba(124,58,237,0.3)', borderRadius: 12 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="font-terminal text-[9px] tracking-[0.2em] uppercase" style={{ color: '#555' }}>
            Trade Opportunity
          </span>
          <span
            className="font-terminal text-[10px] px-2 py-0.5 border"
            style={{ backgroundColor: `${sideColor}15`, color: sideColor, borderColor: `${sideColor}40`, borderRadius: 12 }}
          >
            {data.side}
          </span>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Market */}
          <p className="text-sm leading-snug" style={{ color: '#f0f0f0' }}>
            {data.market}
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Shares', value: String(data.shares) },
              { label: 'Price', value: `${data.price}¢` },
              { label: 'Cost', value: `${totalCost.toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label} className="border p-2" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12 }}>
                <p className="font-terminal text-[9px] tracking-widest uppercase mb-0.5" style={{ color: '#444' }}>{label}</p>
                <p className="font-terminal text-xs font-bold" style={{ color: '#f0f0f0' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Payout */}
          <div className="flex items-center justify-between border p-2.5" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(124,58,237,0.15)', borderRadius: 12 }}>
            <div>
              <p className="font-terminal text-[9px] tracking-widest uppercase mb-0.5" style={{ color: '#444' }}>If Correct</p>
              <p className="font-terminal text-lg font-bold" style={{ color: '#7c3aed' }}>${estimatedPayout.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="font-terminal text-[9px] tracking-widest uppercase mb-0.5" style={{ color: '#444' }}>Return</p>
              <p className="font-terminal text-lg font-bold" style={{ color: '#4ade80' }}>+{estimatedReturn.toFixed(0)}%</p>
            </div>
          </div>

          {/* Reasoning */}
          {data.reasoning && (
            <p className="text-xs italic border-l-2 pl-2" style={{ color: '#666', borderColor: 'rgba(124,58,237,0.3)' }}>
              {data.reasoning}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setConfirmState('confirming')}
              className="flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-all font-terminal"
              style={{ backgroundColor: '#7c3aed', color: '#fff', borderRadius: 12, transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8b5cf6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isWalletConnected ? 'Execute Trade' : 'Paper Trade'}
            </button>
            <button
              onClick={() => setConfirmState('confirming')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all font-terminal"
              style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: '#a0a0a0', borderRadius: 12, transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#f0f0f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#a0a0a0'; }}
            >
              Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation step — full details before executing
  if (confirmState === 'confirming') {
    return (
      <div
        className="my-3 border panel-bracket"
        style={{ backgroundColor: '#111', borderColor: 'rgba(124,58,237,0.5)', borderRadius: 12 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="font-terminal text-[9px] tracking-[0.2em] uppercase" style={{ color: '#7c3aed' }}>
            Confirm Trade
          </span>
          <span className="font-terminal text-[9px] tracking-widest uppercase px-2 py-0.5 border"
            style={{ color: isWalletConnected ? '#4ade80' : '#f59e0b', borderColor: isWalletConnected ? 'rgba(74,222,128,0.3)' : 'rgba(245,158,11,0.3)', backgroundColor: isWalletConnected ? 'rgba(74,222,128,0.08)' : 'rgba(245,158,11,0.08)', borderRadius: 12 }}>
            {isWalletConnected ? 'Live' : 'Paper'}
          </span>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Market with left bar */}
          <div className="border-l-2 pl-3" style={{ borderColor: '#7c3aed' }}>
            <p className="text-sm leading-snug" style={{ color: '#f0f0f0' }}>{data.market}</p>
          </div>

          {/* Full trade details */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Side', value: data.side, color: sideColor },
              { label: 'Shares', value: String(data.shares), color: '#f0f0f0' },
              { label: 'Entry Price', value: `${data.price}¢`, color: '#f0f0f0' },
              { label: 'Total Cost', value: `${totalCost.toFixed(2)}`, color: '#f0f0f0' },
            ].map(({ label, value, color }) => (
              <div key={label} className="border p-2.5" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12 }}>
                <p className="font-terminal text-[9px] tracking-widest uppercase mb-1" style={{ color: '#444' }}>{label}</p>
                <p className="font-terminal text-sm font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Payout highlight */}
          <div className="border p-3" style={{ backgroundColor: '#0d0d0d', borderColor: 'rgba(124,58,237,0.2)', borderRadius: 12 }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-terminal text-[9px] tracking-widest uppercase mb-1" style={{ color: '#444' }}>If Correct</p>
                <p className="font-terminal text-2xl font-bold" style={{ color: '#7c3aed', textShadow: '0 0 12px rgba(124,58,237,0.3)' }}>
                  ${estimatedPayout.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-terminal text-[9px] tracking-widest uppercase mb-1" style={{ color: '#444' }}>Return</p>
                <p className="font-terminal text-2xl font-bold" style={{ color: '#4ade80' }}>
                  +{estimatedReturn.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Mode notice */}
          <p className="text-xs" style={{ color: '#555' }}>
            {isWalletConnected
              ? 'Wallet connected — this will route to signing. No funds move until you approve in your wallet.'
              : 'Paper trade — no real funds. Saved to your trade history for tracking.'}
          </p>

          {/* Confirm / Cancel */}
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmState('idle')}
              className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border transition-all font-terminal"
              style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: '#a0a0a0', borderRadius: 12, transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#f0f0f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#a0a0a0'; }}
            >
              Cancel
            </button>
            <button
              onClick={() => { void handleExecute(); }}
              className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-all font-terminal"
              style={{ backgroundColor: '#7c3aed', color: '#fff', borderRadius: 12, transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8b5cf6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isWalletConnected ? 'Confirm & Sign' : 'Confirm Paper Trade'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Executing state
  if (confirmState === 'executing') {
    return (
      <div className="my-3 border p-4" style={{ backgroundColor: '#111', borderColor: 'rgba(124,58,237,0.3)', borderRadius: 12 }}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 animate-bounce rounded-full" style={{ backgroundColor: '#7c3aed', animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 animate-bounce rounded-full" style={{ backgroundColor: '#7c3aed', animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 animate-bounce rounded-full" style={{ backgroundColor: '#7c3aed', animationDelay: '300ms' }} />
          </div>
          <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#7c3aed' }}>
            {isWalletConnected ? 'Routing to wallet...' : 'Recording trade...'}
          </span>
        </div>
      </div>
    );
  }

  // Done state
  if (confirmState === 'done') {
    return (
      <div className="my-3 border p-4 space-y-2" style={{ backgroundColor: '#111', borderColor: 'rgba(74,222,128,0.3)', borderRadius: 12 }}>
        <div className="flex items-center gap-2">
          <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#4ade80' }}>
            Trade Confirmed
          </span>
        </div>
        <p className="text-xs" style={{ color: '#a0a0a0' }}>
          {data.side} {data.shares} shares on &ldquo;{data.market.slice(0, 60)}...&rdquo; at {data.price}¢
        </p>
        {txHash && (
          <p className="font-terminal text-[10px]" style={{ color: '#555' }}>
            tx: {txHash.slice(0, 20)}...
          </p>
        )}
        <p className="text-xs" style={{ color: '#555' }}>
          {isWalletConnected ? 'Check your wallet to complete signing.' : 'Saved to Trade History in Portfolio.'}
        </p>
      </div>
    );
  }

  // Error state
  return (
    <div className="my-3 border p-4 space-y-2" style={{ backgroundColor: '#111', borderColor: 'rgba(248,113,113,0.3)', borderRadius: 12 }}>
      <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#f87171' }}>
        Execution Failed
      </span>
      <p className="text-xs" style={{ color: '#a0a0a0' }}>{errorMsg}</p>
      <button
        onClick={() => { setConfirmState('idle'); setErrorMsg(null); }}
        className="text-xs font-terminal uppercase tracking-widest"
        style={{ color: '#7c3aed' }}
      >
        Try Again
      </button>
    </div>
  );
};
