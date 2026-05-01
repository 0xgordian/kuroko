import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trade — Kuroko',
  description: 'Live prediction market dashboard with edge scoring, category filters, and AI-powered trade simulation.',
};

export default function TradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
