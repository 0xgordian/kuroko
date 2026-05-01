import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Execute — Kuroko',
  description: 'Dedicated trading terminal. Pick a market, review the order book, set your price and size, and execute with real fill confirmation.',
};

export default function ExecuteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
