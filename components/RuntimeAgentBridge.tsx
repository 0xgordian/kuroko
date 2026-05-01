'use client';

import { useEffect, useCallback } from 'react';
import { useEventContext, useNotification } from '@aomi-labs/react';
import { useAppStore, type UiEvent, type UiToolType, type UiToolPayload } from '@/lib/stores/appStore';

export function RuntimeAgentBridge() {
  const dispatchTool = useAppStore((s) => s.dispatchTool);
  const markets = useAppStore((s) => s.markets);
  const { showNotification } = useNotification();

  const { subscribe } = useEventContext();

  const handleEvent = useCallback((event: AomiSystemEvent) => {
    const { type, payload } = event;

    if (!type.startsWith('ui_tool_')) return;

    const toolName = type.replace('ui_tool_', '') as UiToolType;
    const toolPayload = payload as Record<string, unknown>;
    const resolvedPayload = resolvePayload(toolPayload, markets);

    const eventObj: UiEvent = {
      tool: toolName,
      payload: resolvedPayload as UiToolPayload[typeof toolName],
      timestamp: Date.now(),
      source: 'ai',
    };

    dispatchTool(eventObj);
    showNotification({
      type: 'notice',
      title: `AI: ${formatToolName(toolName)}`,
      message: formatToolMessage(toolName, resolvedPayload),
      duration: 3000,
    });
  }, [dispatchTool, markets, showNotification]);

  useEffect(() => {
    const unsub = subscribe('system', (event) => {
      handleEvent(event as AomiSystemEvent);
    });
    return unsub;
  }, [subscribe, handleEvent]);

  return null;
}

type AomiSystemEvent = {
  type: string;
  sessionId: string;
  payload?: unknown;
};

function resolvePayload(payload: Record<string, unknown>, markets: ReturnType<typeof useAppStore.getState>['markets']) {
  const resolved = { ...payload };
  const marketId = payload.marketId as string | undefined;
  if (marketId && !payload.market) {
    const market = markets.find((m) => m.id === marketId || m.slug === marketId);
    if (market) resolved.market = market;
  }
  return resolved;
}

function formatToolName(tool: UiToolType): string {
  const names: Record<UiToolType, string> = {
    simulate_bet: 'Trade Simulation',
    set_alert: 'Alert Set',
    read_positions: 'Positions',
    analyze_market: 'Market Analysis',
    navigate_market: 'Navigate Market',
    query_markets: 'Query Markets',
  };
  return names[tool] ?? tool;
}

function formatToolMessage(tool: UiToolType, payload: Record<string, unknown>): string {
  switch (tool) {
    case 'simulate_bet':
      return `Opening simulation: ${payload.side ?? 'YES'} on "${(payload.market as { question?: string })?.question?.slice(0, 40) ?? 'market'}..."`;
    case 'set_alert':
      return `Alert set: ${payload.condition} ${payload.threshold}% on "${(payload.market as { question?: string })?.question?.slice(0, 40) ?? 'market'}..."`;
    case 'navigate_market':
      return `Navigating to market: ${payload.marketId}`;
    case 'query_markets':
      return `Query: "${payload.query}"`;
    default:
      return 'Processing...';
  }
}