import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio — Kuroko',
  description: 'Track your Polymarket positions, P&L, price alerts, and trade history.',
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
