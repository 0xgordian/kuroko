import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Markets — Kuroko',
  description: 'Browse 1000+ live Polymarket prediction markets. Filter by category, probability, volume, and sort by movement.',
};

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
