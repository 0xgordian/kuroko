import arcMarkets from './arcMarkets.json';

export type ArcMarketDefinition = {
  id: string;
  contractMarketId: number;
  question: string;
  currentProbability: number;
  volume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  slug: string;
  probabilityChange24h: number;
  probabilityChange7d: number;
  probabilityChange30d: number;
  outcomes: ['Yes', 'No'];
  outcomePrices: [number, number];
  clobTokenIds: [string, string];
  category: string;
  description: string;
};

export const ARC_DEMO_MARKETS = arcMarkets as ArcMarketDefinition[];

export function getArcMarketDefinition(marketId: string): ArcMarketDefinition | undefined {
  return ARC_DEMO_MARKETS.find((market) => market.id === marketId);
}

export function getArcMarketDefinitionByQuestion(question: string): ArcMarketDefinition | undefined {
  const normalized = question.trim().toLowerCase();
  return ARC_DEMO_MARKETS.find((market) => market.question.trim().toLowerCase() === normalized);
}

export function getArcMarketByContractId(contractMarketId: number): ArcMarketDefinition | undefined {
  return ARC_DEMO_MARKETS.find((market) => market.contractMarketId === contractMarketId);
}
