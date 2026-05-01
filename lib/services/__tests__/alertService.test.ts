import { describe, it, expect, beforeEach } from 'vitest';
import {
  addAlert,
  getAlerts,
  removeAlert,
  checkAlerts,
  clearAlerts,
  loadNotifEnabled,
  setNotifEnabled,
} from '../alertService';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });

beforeEach(() => {
  localStorageMock.clear();
});

describe('addAlert / getAlerts / removeAlert', () => {
  it('adds and retrieves an alert', () => {
    addAlert({ marketId: 'm1', marketQuestion: 'Will X happen?', condition: 'above', threshold: 70 });
    const alerts = getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].active).toBe(true);
    expect(alerts[0].threshold).toBe(70);
  });

  it('removes an alert by id', () => {
    const a = addAlert({ marketId: 'm1', marketQuestion: 'Q', condition: 'above', threshold: 70 });
    removeAlert(a.id);
    expect(getAlerts()).toHaveLength(0);
  });

  it('clearAlerts removes all alerts', () => {
    addAlert({ marketId: 'm1', marketQuestion: 'Q', condition: 'above', threshold: 70 });
    addAlert({ marketId: 'm2', marketQuestion: 'Q2', condition: 'below', threshold: 30 });
    clearAlerts();
    expect(getAlerts()).toHaveLength(0);
  });
});

describe('checkAlerts', () => {
  it('triggers an "above" alert when probability meets threshold', () => {
    addAlert({ marketId: 'm1', marketQuestion: 'Q', condition: 'above', threshold: 70 });
    const triggered = checkAlerts({ m1: 75 });
    expect(triggered).toHaveLength(1);
    expect(triggered[0].marketId).toBe('m1');
  });

  it('triggers a "below" alert when probability meets threshold', () => {
    addAlert({ marketId: 'm1', marketQuestion: 'Q', condition: 'below', threshold: 30 });
    const triggered = checkAlerts({ m1: 25 });
    expect(triggered).toHaveLength(1);
  });

  it('does not trigger when probability has not crossed threshold', () => {
    addAlert({ marketId: 'm1', marketQuestion: 'Q', condition: 'above', threshold: 70 });
    const triggered = checkAlerts({ m1: 65 });
    expect(triggered).toHaveLength(0);
  });

  it('deactivates alert after it triggers', () => {
    addAlert({ marketId: 'm1', marketQuestion: 'Q', condition: 'above', threshold: 70 });
    checkAlerts({ m1: 75 });
    const alerts = getAlerts();
    expect(alerts[0].active).toBe(false);
  });

  it('does not re-trigger an already inactive alert', () => {
    addAlert({ marketId: 'm1', marketQuestion: 'Q', condition: 'above', threshold: 70 });
    checkAlerts({ m1: 75 }); // first trigger
    const triggered2 = checkAlerts({ m1: 80 }); // should not trigger again
    expect(triggered2).toHaveLength(0);
  });

  it('skips alerts with no matching market probability', () => {
    addAlert({ marketId: 'm1', marketQuestion: 'Q', condition: 'above', threshold: 70 });
    const triggered = checkAlerts({ 'other-market': 80 });
    expect(triggered).toHaveLength(0);
  });

  it('triggers at exact threshold value', () => {
    addAlert({ marketId: 'm1', marketQuestion: 'Q', condition: 'above', threshold: 70 });
    const triggered = checkAlerts({ m1: 70 });
    expect(triggered).toHaveLength(1);
  });
});

describe('notification settings', () => {
  it('defaults to enabled', () => {
    expect(loadNotifEnabled()).toBe(true);
  });

  it('persists disabled state', () => {
    setNotifEnabled(false);
    expect(loadNotifEnabled()).toBe(false);
  });

  it('persists enabled state', () => {
    setNotifEnabled(false);
    setNotifEnabled(true);
    expect(loadNotifEnabled()).toBe(true);
  });
});
