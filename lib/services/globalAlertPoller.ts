/**
 * Global Alert Poller — runs in the background across all pages.
 * Checks alerts every 60s using the latest market data.
 * Also checks position guards and auto-executes when triggered.
 */
import { checkAlerts, fireNotification, getAlerts } from './alertService';
import { fetchActiveMarkets } from './marketService';
import { checkGuards, deactivateGuard, getGuards } from './positionGuardService';
import { sendLiveOrder } from './tradeIntentService';
import { addTradeRecord } from './tradeHistoryService';

let pollerStarted = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let pollerWalletAddress: string | null = null;

export function setPollerWalletAddress(address: string | null) {
  pollerWalletAddress = address;
}

export function stopGlobalAlertPoller() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  pollerStarted = false;
}

export function startGlobalAlertPoller() {
  if (typeof window === 'undefined' || pollerStarted) return;
  pollerStarted = true;

  const poll = async () => {
    const alerts = getAlerts().filter((a) => a.active);
    const guards = getGuards().filter((g) => g.active);
    if (!alerts.length && !guards.length) return;

    try {
      const { markets } = await fetchActiveMarkets();
      const probs: Record<string, number> = {};
      markets.forEach((m) => { probs[m.id] = m.currentProbability; });

      // ── Alert checks ──────────────────────────────────────────────────────
      const triggeredAlerts = checkAlerts(probs);
      triggeredAlerts.forEach((alert) => {
        const prob = probs[alert.marketId] ?? alert.threshold;
        fireNotification(alert, prob);
      });

      // ── Guard auto-execution ──────────────────────────────────────────────
      if (guards.length) {
        const triggeredGuards = checkGuards(probs);
        for (const guard of triggeredGuards) {
          const market = markets.find((m) => m.id === guard.marketId);
          if (!market) continue;

          // Deactivate immediately to prevent re-triggering every 60s
          deactivateGuard(guard.id);

          if (pollerWalletAddress && market.clobTokenId) {
            // Wallet connected — attempt live exit order
            try {
              const result = await sendLiveOrder({
                walletAddress: pollerWalletAddress,
                tokenId: market.clobTokenId,
                side: 'SELL',
                price: (probs[guard.marketId] ?? 50) / 100,
                shares: guard.shares ?? 100,
                marketQuestion: market.question,
                chainId: 137,
              });
              addTradeRecord({
                marketQuestion: market.question,
                marketId: market.id,
                side: guard.side === 'YES' ? 'YES' : 'NO',
                shares: guard.shares ?? 100,
                pricePerShare: probs[guard.marketId] ?? 50,
                totalCost: ((guard.shares ?? 100) * (probs[guard.marketId] ?? 50)) / 100,
                mode: result.mode,
                status: result.success ? 'confirmed' : 'failed',
                txHash: result.txHash,
              });
            } catch {
              // Silent fail — guard already deactivated, user can re-enable
            }
          } else {
            // No wallet — paper trade + browser notification
            addTradeRecord({
              marketQuestion: market.question,
              marketId: market.id,
              side: guard.side === 'YES' ? 'YES' : 'NO',
              shares: guard.shares ?? 100,
              pricePerShare: probs[guard.marketId] ?? 50,
              totalCost: ((guard.shares ?? 100) * (probs[guard.marketId] ?? 50)) / 100,
              mode: 'PAPER_TRADE',
              status: 'confirmed',
            });

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Kuroko — Guard Triggered', {
                body: `${guard.name ?? 'Position guard'} triggered on "${market.question}"`,
                icon: '/icon.png',
              });
            }
          }
        }
      }
    } catch {
      // Silent fail — don't break the app
    }
  };

  // Poll immediately then every 60s
  void poll();
  intervalId = setInterval(poll, 60_000);
}
