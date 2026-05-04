'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/stores/appStore';

interface QueryBarProps {
  onQuery: (query: string) => void;
  isLoading?: boolean;
  isQuerying?: boolean;
  compact?: boolean;
}

// Dynamic suggestions based on live market data
function useDynamicSuggestions(): string[] {
  const markets = useAppStore((s) => s.markets);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Best value election markets',
    'Biggest crypto moves today',
    'Near 50% probability',
    'High volume with movement',
  ]);

  useEffect(() => {
    if (!markets.length) return;

    const dynamic: string[] = [];

    // Find the biggest 24h mover
    const sorted24h = [...markets]
      .filter((m) => m.probabilityChange24h !== null && m.probabilityChange24h !== undefined)
      .sort((a, b) => Math.abs(b.probabilityChange24h!) - Math.abs(a.probabilityChange24h!));

    if (sorted24h[0]) {
      const top = sorted24h[0];
      const change = top.probabilityChange24h!;
      dynamic.push(`${change > 0 ? 'Rising' : 'Falling'} markets today`);
    }

    // Find category with most volume
    const categories = ['election', 'crypto', 'sports', 'fed', 'ai'];
    const categoryCounts = categories.map((cat) => ({
      cat,
      count: markets.filter((m) => m.question.toLowerCase().includes(cat)).length,
    })).sort((a, b) => b.count - a.count);

    if (categoryCounts[0]?.count > 2) {
      dynamic.push(`Top ${categoryCounts[0].cat} markets`);
    }

    // Near 50% with high volume
    const near50 = markets.filter(
      (m) => Math.abs(m.currentProbability - 50) < 15 && m.volume > 100_000
    );
    if (near50.length > 0) {
      dynamic.push('Near 50% high volume');
    }

    // Always include a fallback
    dynamic.push('High volume with movement');

    setSuggestions(dynamic.slice(0, 4));
  }, [markets]);

  return suggestions;
}

export default function QueryBar({ onQuery, isLoading, isQuerying, compact }: QueryBarProps) {
  const [input, setInput] = useState('');
  const loading = isLoading ?? isQuerying ?? false;
  const suggestions = useDynamicSuggestions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) { onQuery(input.trim()); setInput(''); }
  };

  const handleChip = (query: string) => { onQuery(query); setInput(''); };

  return (
    <div className="px-4 pb-4 w-full">
      <form onSubmit={handleSubmit} className="relative w-full flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search markets or ask a question..."
          className="flex-1 text-sm border px-3 py-3 transition-colors focus:outline-none"
          style={{
            backgroundColor: '#0d0d0d',
            borderColor: 'rgba(255,255,255,0.12)',
            color: '#f0f0f0',
            borderRadius: 12,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(124,58,237,0.5)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 text-xs font-terminal font-bold tracking-widest uppercase transition-all flex items-center gap-2"
          style={{
            backgroundColor: loading || !input.trim() ? '#1a1a1a' : '#7c3aed',
            color: loading || !input.trim() ? '#555' : '#fff',
            borderRadius: '0 12px 12px 0',
          }}
        >
          {loading ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            'Search'
          )}
        </button>
      </form>

      {/* Dynamic suggestion chips */}
      <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => handleChip(q)}
            className="flex-none text-xs px-3 py-1.5 border transition-colors whitespace-nowrap font-terminal"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'rgba(255,255,255,0.10)',
              color: '#a0a0a0',
              borderRadius: 9999,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)';
              (e.currentTarget as HTMLElement).style.color = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.10)';
              (e.currentTarget as HTMLElement).style.color = '#a0a0a0';
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
