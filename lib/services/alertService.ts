/**
 * Alert Service — localStorage-based price alerts
 * Polls live market data every 60s and fires browser notifications.
 */

export type AlertCondition = 'above' | 'below';

export type PriceAlert = {
  id: string;
  marketId: string;
  marketQuestion: string;
  tokenId?: string;
  condition: AlertCondition;
  threshold: number; // 1-99 (probability %)
  createdAt: string;
  triggeredAt?: string;
  active: boolean;
};

const STORAGE_KEY = 'kuroko_alerts';
const NOTIF_ENABLED_KEY = 'kuroko_notifs_enabled';

function load(): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PriceAlert[]) : [];
  } catch {
    return [];
  }
}

function save(alerts: PriceAlert[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {}
}

export function getAlerts(): PriceAlert[] {
  return load();
}

export function addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt' | 'active'>): PriceAlert {
  const full: PriceAlert = {
    ...alert,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    active: true,
  };
  const existing = load();
  save([...existing, full]);
  return full;
}

export function removeAlert(id: string): void {
  save(load().filter((a) => a.id !== id));
}

export function clearAlerts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check all active alerts against current market probabilities.
 * Returns IDs of alerts that were triggered.
 */
export function checkAlerts(
  marketProbabilities: Record<string, number>,
): PriceAlert[] {
  const alerts = load();
  const triggered: PriceAlert[] = [];

  const updated = alerts.map((alert) => {
    if (!alert.active) return alert;
    const prob = marketProbabilities[alert.marketId];
    if (prob === undefined) return alert;

    const fired =
      alert.condition === 'above' ? prob >= alert.threshold : prob <= alert.threshold;

    if (fired) {
      triggered.push(alert);
      return { ...alert, active: false, triggeredAt: new Date().toISOString() };
    }
    return alert;
  });

  save(updated);
  return triggered;
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve('denied');
  }
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  return Notification.requestPermission();
}

export function fireNotification(alert: PriceAlert, currentProb: number): void {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;
  const enabled = loadNotifEnabled();
  if (!enabled) return;
  const direction = alert.condition === 'above' ? '▲' : '▼';
  new Notification(`${direction} Alert Triggered`, {
    body: `${alert.marketQuestion.slice(0, 80)} — now at ${currentProb}%`,
    icon: '/favicon.ico',
  });
}

export function loadNotifEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(NOTIF_ENABLED_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setNotifEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIF_ENABLED_KEY, String(enabled));
  } catch {}
}
