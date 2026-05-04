'use client';

import { useMemo } from 'react';

export type MarketCategory =
  | 'all'
  | 'elections'
  | 'crypto'
  | 'sports'
  | 'economics'
  | 'tech'
  | 'world';

export const CATEGORIES: { value: MarketCategory; label: string; keywords: string[] }[] = [
  { value: 'all', label: 'All', keywords: [] },
  {
    value: 'elections',
    label: 'Elections',
    keywords: ['election', 'vote', 'president', 'candidate', 'primary', 'senate', 'congress', 'governor', 'ballot', 'democrat', 'republican', 'political', 'poll'],
  },
  {
    value: 'crypto',
    label: 'Crypto',
    keywords: ['bitcoin', 'btc', 'eth', 'ethereum', 'crypto', 'defi', 'token', 'blockchain', 'coinbase', 'solana', 'sol', 'xrp', 'usdc', 'stablecoin', 'nft'],
  },
  {
    value: 'sports',
    label: 'Sports',
    keywords: ['nfl', 'nba', 'mlb', 'nhl', 'soccer', 'football', 'basketball', 'baseball', 'championship', 'world cup', 'super bowl', 'playoffs', 'tournament', 'league', 'team', 'player'],
  },
  {
    value: 'economics',
    label: 'Economics',
    keywords: ['fed', 'inflation', 'gdp', 'recession', 'rate', 'economy', 'interest', 'cpi', 'unemployment', 'treasury', 'dollar', 'tariff', 'trade'],
  },
  {
    value: 'tech',
    label: 'Tech',
    keywords: ['ai', 'openai', 'apple', 'google', 'microsoft', 'tech', 'ipo', 'nvidia', 'meta', 'amazon', 'tesla', 'chatgpt', 'gpt', 'model', 'startup'],
  },
  {
    value: 'world',
    label: 'World',
    keywords: ['war', 'russia', 'ukraine', 'china', 'iran', 'israel', 'nato', 'un', 'climate', 'nuclear', 'treaty', 'sanctions', 'geopolitical'],
  },
];

/**
 * Filter markets by category using keyword matching on the question text.
 */
export function filterByCategory<T extends { question: string }>(
  markets: T[],
  category: MarketCategory,
): T[] {
  if (category === 'all') return markets;
  const cat = CATEGORIES.find((c) => c.value === category);
  if (!cat) return markets;
  return markets.filter((m) =>
    cat.keywords.some((kw) => m.question.toLowerCase().includes(kw))
  );
}

interface CategoryFilterProps {
  value: MarketCategory;
  onChange: (cat: MarketCategory) => void;
  markets?: { question: string }[];
  showCounts?: boolean;
}

export default function CategoryFilter({ value, onChange, markets = [], showCounts = false }: CategoryFilterProps) {
  // Memoize counts — O(n×m) but only recomputes when markets array changes
  const counts = useMemo(() => {
    if (!showCounts) return {} as Record<MarketCategory, number>;
    return Object.fromEntries(
      CATEGORIES.filter((c) => c.value !== 'all').map((cat) => [
        cat.value,
        markets.filter((m) => cat.keywords.some((kw) => m.question.toLowerCase().includes(kw))).length,
      ])
    ) as Record<MarketCategory, number>;
  }, [markets, showCounts]);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
      {CATEGORIES.map((cat) => {
        const isActive = value === cat.value;
        const count = showCounts && cat.value !== 'all' ? counts[cat.value] ?? 0 : null;

        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className="flex-none flex items-center gap-1.5 px-3 py-1.5 border font-terminal text-[10px] tracking-widest uppercase whitespace-nowrap"
            style={{
              backgroundColor: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
              borderColor: isActive ? '#7c3aed' : 'rgba(255,255,255,0.10)',
              color: isActive ? '#7c3aed' : '#555',
              borderRadius: 9999,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.color = '#a0a0a0';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                e.currentTarget.style.color = '#555';
              }
            }}
          >
            {cat.label}
            {count !== null && count > 0 && (
              <span
                className="font-terminal text-[9px]"
                style={{ color: isActive ? '#7c3aed' : '#444' }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
