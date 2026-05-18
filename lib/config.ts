/**
 * Central configuration for Kuroko
 * All environment variables in one place for easy access
 */

// aomi Backend
export const AOMI_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.aomi.dev';
export const AOMI_API_KEY = process.env.NEXT_PUBLIC_AOMI_API_KEY;
export const AOMI_APP_ID = process.env.NEXT_PUBLIC_AOMI_APP_ID || 'default';
export const AOMI_UPSTREAM_URL = process.env.AOMI_UPSTREAM_URL || 'https://api.aomi.dev';

// Wallet Connect
export const PARA_API_KEY = process.env.NEXT_PUBLIC_PARA_API_KEY;
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Analytics
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Market Configuration
export const POLYMARKET_MARKET_LIMIT = parseInt(process.env.POLYMARKET_MARKET_LIMIT || '200');
export const POLYMARKET_HISTORY_ENRICH_LIMIT = parseInt(process.env.POLYMARKET_HISTORY_ENRICH_LIMIT || '60');

// Feature Flags
export const ENABLE_LIVE_TRADING = Boolean(AOMI_API_KEY && PARA_API_KEY);
export const ENABLE_WALLET_CONNECT = Boolean(PARA_API_KEY);

// App Info
export const APP_NAME = 'Kuroko';
export const APP_VERSION = '0.1.0';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kuroko.ai';

// ─── Multi-chain config ───────────────────────────────────────────────────────

export const CHAINS = {
  polygon: {
    id: 137,
    name: 'Polygon',
    ticker: 'MATIC',
    rpc: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
  arc: {
    id: 5042002,
    name: 'Arc Testnet',
    ticker: 'USDC',
    rpc: 'https://rpc.testnet.arc.network',
    explorer: 'https://explorer.testnet.arc.network',
    usdc: '0x0000000000000000000000000000000000000000', // native USDC on Arc
  },
} as const;

export type ChainKey = keyof typeof CHAINS;

export function getChainConfig(chainId: number) {
  for (const [, config] of Object.entries(CHAINS)) {
    if (config.id === chainId) return config;
  }
  return CHAINS.polygon;
}