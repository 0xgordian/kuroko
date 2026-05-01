import type { Market, EdgeOpportunity, EdgeQueryResult } from '@/types';

/**
 * Score a market for edge opportunities.
 * Higher score = more interesting bet.
 *
 * Factors:
 * - Volume (more volume = more reliable price)
 * - Liquidity (more liquidity = easier to enter/exit)
 * - Probability extremes (near 50% = most uncertain = most edge potential)
 * - 24h movement (recent movement = market repricing = potential edge)
 */
function scoreMarket(market: Market): number {
  let score = 0;

  // Volume factor (0-30 points)
  if (market.volume > 1_000_000) score += 30;
  else if (market.volume > 500_000) score += 20;
  else if (market.volume > 100_000) score += 10;
  else score += 5;

  // Liquidity factor (0-20 points)
  if (market.liquidity > 100_000) score += 20;
  else if (market.liquidity > 50_000) score += 12;
  else if (market.liquidity > 10_000) score += 6;

  // Probability uncertainty factor (0-30 points)
  // Markets near 50% are most uncertain and have most edge potential
  const distFrom50 = Math.abs(market.currentProbability - 50);
  if (distFrom50 < 10) score += 30;
  else if (distFrom50 < 20) score += 20;
  else if (distFrom50 < 30) score += 10;
  else score += 5;

  // 24h movement factor (0-20 points) — only if real data available
  const movement = Math.abs(market.probabilityChange24h ?? 0);
  if (market.probabilityChange24h !== null && market.probabilityChange24h !== undefined) {
    if (movement > 10) score += 20;
    else if (movement > 5) score += 12;
    else if (movement > 2) score += 6;
  }

  return Math.min(100, score);
}

/**
 * Determine which side (YES/NO) has the edge
 */
function determineSide(market: Market): 'YES' | 'NO' {
  const change = market.probabilityChange24h;
  if (change !== null && change !== undefined) {
    if (change > 3) return 'YES';
    if (change < -3) return 'NO';
  }
  if (market.currentProbability < 45) return 'NO';
  return 'YES';
}

/**
 * Generate plain-English reasoning for an edge opportunity
 */
function generateReasoning(market: Market, side: 'YES' | 'NO', score: number): string {
  const prob = market.currentProbability;
  const change = market.probabilityChange24h;
  const hasChange = change !== null && change !== undefined && change !== 0;
  const changeStr = hasChange ? (change! > 0 ? `+${change!.toFixed(1)}%` : `${change!.toFixed(1)}%`) : null;

  if (score >= 70) {
    if (hasChange && Math.abs(change!) > 5) {
      return `High-volume market with significant 24h movement (${changeStr}). The crowd is actively repricing — ${side} side shows momentum. Strong liquidity means you can enter and exit cleanly.`;
    }
    return `High-volume, liquid market near the uncertainty zone at ${prob}%. The ${side} side is underpriced relative to recent market activity. Volume and liquidity support a clean entry.`;
  }

  if (score >= 50) {
    if (hasChange && Math.abs(change!) > 3) {
      return `Market moved ${changeStr} in 24h — active repricing in progress. ${side} at ${prob}% offers a reasonable entry with moderate volume backing it.`;
    }
    return `Moderate opportunity at ${prob}% probability. ${side} side has reasonable volume and liquidity for a position.`;
  }

  return `Low-conviction opportunity. ${side} at ${prob}% with limited volume. Consider smaller position size or wait for more market activity.`;
}

/**
 * Filter markets by natural language query
 */
function filterByQuery(markets: Market[], query: string): Market[] {
  const q = query.toLowerCase();

  // Category keywords
  const categories: Record<string, string[]> = {
    election: ['election', 'vote', 'president', 'candidate', 'primary', 'senate', 'congress', 'political'],
    crypto: ['bitcoin', 'btc', 'eth', 'ethereum', 'crypto', 'defi', 'token', 'blockchain', 'coinbase'],
    sports: ['nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'championship', 'world cup', 'super bowl'],
    economics: ['fed', 'inflation', 'gdp', 'recession', 'rate', 'economy', 'market', 'stock'],
    tech: ['ai', 'openai', 'apple', 'google', 'microsoft', 'tech', 'ipo'],
  };

  // Check if query matches any category
  for (const [, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => q.includes(kw))) {
      const filtered = markets.filter((m) =>
        keywords.some((kw) => m.question.toLowerCase().includes(kw))
      );
      if (filtered.length > 0) return filtered;
    }
  }

  // Generic text search
  const words = q.split(' ').filter((w) => w.length > 3);
  if (words.length > 0) {
    const filtered = markets.filter((m) =>
      words.some((w) => m.question.toLowerCase().includes(w))
    );
    if (filtered.length > 0) return filtered;
  }

  // Return all markets if no filter matches
  return markets;
}

/**
 * Generate a detailed breakdown of WHY a market scored the way it did.
 * This is shown in the UI so traders understand the signal.
 */
export function explainScore(market: Market): string {
  const parts: string[] = [];

  // Volume
  if (market.volume > 1_000_000) parts.push(`vol $${(market.volume / 1_000_000).toFixed(1)}M`);
  else if (market.volume > 100_000) parts.push(`vol $${(market.volume / 1_000).toFixed(0)}K`);
  else parts.push(`vol $${(market.volume / 1_000).toFixed(0)}K (low)`);

  // Liquidity
  if (market.liquidity > 100_000) parts.push(`liq $${(market.liquidity / 1_000).toFixed(0)}K`);
  else if (market.liquidity > 10_000) parts.push(`liq $${(market.liquidity / 1_000).toFixed(0)}K`);

  // Uncertainty
  const distFrom50 = Math.abs(market.currentProbability - 50);
  if (distFrom50 < 10) parts.push(`near 50% (max uncertainty)`);
  else if (distFrom50 < 20) parts.push(`${market.currentProbability}% (uncertain)`);

  // Movement
  const change = market.probabilityChange24h;
  if (change !== null && change !== undefined && Math.abs(change) > 2) {
    parts.push(`${change > 0 ? '+' : ''}${change.toFixed(1)}pp 24h`);
  }
  if (market.probabilityChange7d !== null && market.probabilityChange7d !== undefined && Math.abs(market.probabilityChange7d) > 3) {
    parts.push(`${market.probabilityChange7d > 0 ? '+' : ''}${market.probabilityChange7d.toFixed(1)}pp 7d`);
  }

  return parts.join(' · ');
}
export function findEdges(markets: Market[], query: string): EdgeQueryResult {
  const filtered = filterByQuery(markets, query);

  const opportunities: EdgeOpportunity[] = filtered
    .map((market) => {
      const edgeScore = scoreMarket(market);
      const side = determineSide(market);
      const reasoning = generateReasoning(market, side, edgeScore);
      const referencePrice = side === 'YES'
        ? market.currentProbability
        : 100 - market.currentProbability;
      const suggestedShares = Math.max(10, Math.round(100 * (edgeScore / 100)));
      // Match BetSimulation calculation: return = (payout - cost) / cost
      const totalCost = (suggestedShares * referencePrice) / 100;
      const estimatedReturn = totalCost > 0 ? ((suggestedShares - totalCost) / totalCost) * 100 : 0;

      // Derive edge strength from observable signals rather than fabricating labels.
      // High activity + movement = HIGH_ACTIVITY; moderate volume = MODERATE; else LOW_ACTIVITY.
      const change = Math.abs(market.probabilityChange24h ?? 0);
      const edgeStrength: EdgeOpportunity['edgeStrength'] =
        edgeScore >= 70 && market.volume > 500_000 && change > 3
          ? 'STRONG'
          : edgeScore >= 50
          ? 'MODERATE'
          : 'WEAK';

      return {
        market,
        edgeScore,
        edgeStrength,
        side,
        reasoning,
        scoreBreakdown: explainScore(market),
        suggestedShares,
        referencePrice,
        estimatedReturn,
      } as EdgeOpportunity;
    })
    .sort((a, b) => b.edgeScore - a.edgeScore)
    .slice(0, 3);

  const topEdge = opportunities[0];
  const summary = opportunities.length > 0
    ? `Found ${opportunities.length} opportunit${opportunities.length > 1 ? 'ies' : 'y'} for "${query}". Top pick: ${topEdge.market.question.slice(0, 60)}... — ${topEdge.edgeStrength} signal on ${topEdge.side} at ${topEdge.referencePrice}¢.`
    : `No strong opportunities found for "${query}". Try a broader search.`;

  return {
    query,
    opportunities,
    summary,
    timestamp: new Date().toISOString(),
  };
}
