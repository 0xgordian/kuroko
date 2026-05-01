'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Market } from '@/types';
import {
  getAlerts,
  addAlert,
  removeAlert,
  checkAlerts,
  fireNotification,
  requestNotificationPermission,
  loadNotifEnabled,
  setNotifEnabled as setNotifEnabledService,
  type PriceAlert,
} from '@/lib/services/alertService';
import { EmptyState } from '@/components/ui/empty-state';

interface AlertsPanelProps {
  markets: Market[];
}

export default function AlertsPanel({ markets }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [notifEnabled, setNotifEnabledState] = useState(true);

  const refresh = useCallback(() => setAlerts(getAlerts()), []);

  useEffect(() => {
    refresh();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
    setNotifEnabledState(loadNotifEnabled());
  }, [refresh]);

  // Poll every 60s
  useEffect(() => {
    if (!markets.length) return;
    const tick = () => {
      const probs: Record<string, number> = {};
      markets.forEach((m) => { probs[m.id] = m.currentProbability; });
      const triggered = checkAlerts(probs);
      if (triggered.length > 0) {
        triggered.forEach((a) => {
          const prob = probs[a.marketId] ?? a.threshold;
          fireNotification(a, prob);
        });
        refresh();
      }
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [markets, refresh]);

  const handleNotifToggle = async () => {
    const next = !notifEnabled;
    if (next && notifPermission !== 'granted') {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
      if (perm !== 'granted') return;
    }
    setNotifEnabledState(next);
    // Persist to localStorage via the service function
    setNotifEnabledService(next);
  };

  const filteredMarkets = markets.filter((m) =>
    m.question.toLowerCase().includes(search.toLowerCase()),
  ).slice(0, 8);

  const handleAdd = () => {
    if (!selectedMarket || !threshold) return;
    const t = parseInt(threshold, 10);
    if (isNaN(t) || t < 1 || t > 99) return;
    addAlert({
      marketId: selectedMarket.id,
      marketQuestion: selectedMarket.question,
      tokenId: selectedMarket.clobTokenId,
      condition,
      threshold: t,
    });
    refresh();
    setShowForm(false);
    setSearch('');
    setSelectedMarket(null);
    setThreshold('');
  };

  const activeAlerts = alerts.filter((a) => a.active);
  const triggeredAlerts = alerts.filter((a) => !a.active && a.triggeredAt);

  return (
    <div style={{ backgroundColor: '#111', borderRadius: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
          {'Alerts'}{' '}
          <span style={{ color: '#ff4500' }}>{'// Active'}</span>
          {activeAlerts.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 font-terminal text-[9px]"
              style={{ backgroundColor: 'rgba(255,69,0,0.15)', color: '#ff4500' }}>
              {activeAlerts.length}
            </span>
          )}
        </span>

        <div className="flex items-center gap-3">
          {/* Notification toggle */}
          <button
            onClick={handleNotifToggle}
            className="flex items-center gap-1.5 px-2 py-1 border transition-colors"
            style={{
              borderColor: notifEnabled ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)',
              borderRadius: 0,
              backgroundColor: notifEnabled ? 'rgba(74,222,128,0.08)' : 'transparent',
            }}
            title={notifEnabled ? 'Notifications on' : 'Notifications off'}
          >
            <span className="font-terminal text-[9px] tracking-widest uppercase"
              style={{ color: notifEnabled ? '#4ade80' : '#555' }}>
              {notifEnabled ? 'On' : 'Off'}
            </span>
            <div className="w-7 h-3.5 border relative"
              style={{
                borderColor: notifEnabled ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.15)',
                backgroundColor: notifEnabled ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                borderRadius: 0,
              }}>
              <div className="w-2.5 h-2 absolute top-0.25 transition-transform"
                style={{
                  backgroundColor: notifEnabled ? '#4ade80' : '#555',
                  left: notifEnabled ? '14px' : '1px',
                  borderRadius: 0,
                }} />
            </div>
          </button>

          <button
            onClick={() => setShowForm((v) => !v)}
            className="font-terminal text-[10px] tracking-widest uppercase px-2 py-1 border transition-colors"
            style={{
              borderColor: showForm ? '#ff4500' : 'rgba(255,255,255,0.12)',
              color: showForm ? '#ff4500' : '#555',
              backgroundColor: 'transparent',
              borderRadius: 0,
            }}
          >
            {showForm ? '✕ Cancel' : '+ Add Alert'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Notification permission request */}

        {/* Add alert form */}
        {showForm && (
          <div className="border p-3 space-y-3"
            style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#0d0d0d', borderRadius: 0 }}>
            <p className="font-terminal text-[10px] tracking-widest uppercase" style={{ color: '#555' }}>
              New Alert
            </p>

            {/* Market search */}
            <div>
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedMarket(null); }}
                className="w-full px-3 py-2 text-xs border outline-none"
                style={{
                  backgroundColor: '#111',
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: '#f0f0f0',
                  borderRadius: 0,
                }}
              />
              {search && !selectedMarket && filteredMarkets.length > 0 && (
                <div className="border border-t-0 max-h-40 overflow-y-auto"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#111' }}>
                  {filteredMarkets.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedMarket(m); setSearch(m.question.slice(0, 60)); }}
                      className="w-full text-left px-3 py-2 text-xs border-b transition-colors"
                      style={{
                        borderColor: 'rgba(255,255,255,0.05)',
                        color: '#a0a0a0',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#161616')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span className="font-terminal text-[10px] mr-2" style={{ color: '#ff4500' }}>
                        {m.currentProbability}%
                      </span>
                      {m.question.slice(0, 70)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Condition + threshold */}
            <div className="flex gap-2">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
                className="flex-1 px-2.5 text-xs border outline-none"
                style={{
                  backgroundColor: '#111',
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: '#a0a0a0',
                  borderRadius: 0,
                  fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
                  height: '32px',
                }}
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
              <input
                type="number"
                min={1}
                max={99}
                placeholder="% (1-99)"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border outline-none"
                style={{
                  backgroundColor: '#111',
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: '#f0f0f0',
                  borderRadius: 0,
                }}
              />
            </div>

            <button
              onClick={handleAdd}
              disabled={!selectedMarket || !threshold}
              className="w-full py-2 text-xs font-bold transition-all"
              style={{
                backgroundColor: selectedMarket && threshold ? '#ff4500' : '#1a1a1a',
                color: selectedMarket && threshold ? '#000' : '#555',
                borderRadius: 0,
              }}
            >
              Save Alert
            </button>
          </div>
        )}

        {/* Active alerts */}
        {activeAlerts.length === 0 && !showForm ? (
          <EmptyState variant="alerts" />
        ) : (
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between gap-2 border p-2.5"
                style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#0d0d0d', borderRadius: 0 }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs line-clamp-1 mb-1" style={{ color: '#a0a0a0' }}>
                    {alert.marketQuestion}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-terminal text-[10px] tracking-widest uppercase px-1.5 py-0.5"
                      style={{
                        color: alert.condition === 'above' ? '#4ade80' : '#f87171',
                        backgroundColor: alert.condition === 'above'
                          ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                      }}>
                      {alert.condition === 'above' ? '▲' : '▼'} {alert.condition} {alert.threshold}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { removeAlert(alert.id); refresh(); }}
                  className="shrink-0 text-xs transition-colors"
                  style={{ color: '#444' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Recently triggered */}
        {triggeredAlerts.length > 0 && (
          <div>
            <p className="font-terminal text-[10px] tracking-widest uppercase mb-2" style={{ color: '#555' }}>
              Recently Triggered
            </p>
            <div className="space-y-1.5">
              {triggeredAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center gap-2 px-2.5 py-2 border"
                  style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: '#0d0d0d', borderRadius: 0 }}>
                  <span className="font-terminal text-[10px]" style={{ color: '#444' }}>✓</span>
                  <p className="text-xs line-clamp-1 flex-1" style={{ color: '#555' }}>
                    {alert.marketQuestion.slice(0, 50)}
                  </p>
                  <span className="font-terminal text-[10px]" style={{ color: '#444' }}>
                    {alert.condition} {alert.threshold}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
