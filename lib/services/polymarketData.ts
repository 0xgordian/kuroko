export type PolymarketPricePoint = {
  t: number;
  p: number;
};

export function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function getYesTokenId(raw: {
  clobTokenIds?: unknown;
  outcomes?: unknown;
}): string | null {
  const tokenIds = parseStringArray(raw.clobTokenIds);
  if (tokenIds.length === 0) return null;

  const outcomes = parseStringArray(raw.outcomes).map((outcome) =>
    outcome.toLowerCase(),
  );
  const yesIndex = outcomes.findIndex((outcome) => outcome === "yes");

  if (yesIndex >= 0 && tokenIds[yesIndex]) {
    return tokenIds[yesIndex];
  }

  return tokenIds[0] ?? null;
}

export function derive24hPriceChangeFromHistory(
  history: PolymarketPricePoint[],
): number | null {
  const validPoints = history.filter(
    (point) =>
      Number.isFinite(point?.p) &&
      typeof point?.p === "number" &&
      Number.isFinite(point?.t),
  );

  if (validPoints.length < 2) return null;

  const sorted = [...validPoints].sort((a, b) => a.t - b.t);
  const first = sorted[0]?.p;
  const last = sorted[sorted.length - 1]?.p;

  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    return null;
  }

  return Math.round((last - first) * 1000) / 1000;
}
