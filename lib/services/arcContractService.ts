import { createPublicClient, http, encodeFunctionData } from 'viem';
import { getArcMarketDefinition, getArcMarketDefinitionByQuestion, type ArcMarketDefinition } from '@/lib/data/arcMarkets';

const ARC_RPC = 'https://rpc.testnet.arc.network';
export const ARC_CHAIN_ID = 5042002;
export const ARC_EXPLORER = 'https://explorer.testnet.arc.network';

export const ARC_MARKET_CONTRACT = process.env.NEXT_PUBLIC_ARC_MARKET_CONTRACT as `0x${string}` | undefined;

const ABI = [
  {
    type: 'function',
    name: 'markets',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'question', type: 'string' },
      { name: 'resolutionTime', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
      { name: 'outcome', type: 'bool' },
      { name: 'yesPool', type: 'uint256' },
      { name: 'noPool', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'yesShares',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'noShares',
    inputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'marketCounter',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'buyShares',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'side', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'claimPayout',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

const publicClient = createPublicClient({
  chain: { id: ARC_CHAIN_ID, name: 'Arc Testnet', nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, rpcUrls: { default: { http: [ARC_RPC] } } } as any,
  transport: http(ARC_RPC),
});

export type ArcOnChainMarket = {
  id: number;
  question: string;
  resolutionTime: number;
  resolved: boolean;
  outcome: boolean;
  yesPool: number;
  noPool: number;
};

export type ArcMarketValidation =
  | {
      ok: true;
      definition: ArcMarketDefinition;
      market: ArcOnChainMarket;
      contractMarketId: number;
    }
  | {
      ok: false;
      definition?: ArcMarketDefinition;
      market?: ArcOnChainMarket | null;
      contractMarketId?: number;
      reason: string;
    };

export async function getOnChainMarket(marketId: number): Promise<ArcOnChainMarket | null> {
  if (!ARC_MARKET_CONTRACT) return null;
  try {
    const data = await publicClient.readContract({
      address: ARC_MARKET_CONTRACT,
      abi: ABI,
      functionName: 'markets',
      args: [BigInt(marketId)],
    });
    return {
      id: Number(data[0]),
      question: data[1],
      resolutionTime: Number(data[2]),
      resolved: data[3],
      outcome: data[4],
      yesPool: Number(data[5]),
      noPool: Number(data[6]),
    };
  } catch { return null; }
}

export async function validateArcMarketForTrade(marketId: string, question?: string, contractMarketId?: number): Promise<ArcMarketValidation> {
  if (!ARC_MARKET_CONTRACT) {
    return { ok: false, reason: 'Arc contract address is not configured.' };
  }

  const definition = getArcMarketDefinition(marketId)
    ?? (question ? getArcMarketDefinitionByQuestion(question) : undefined);
  if (!definition) {
    return { ok: false, reason: 'This live market is not deployed to the Arc testnet contract yet. You can simulate it, but real Arc execution needs an Arc market mapping first.' };
  }

  const expectedContractMarketId = contractMarketId ?? definition.contractMarketId;

  if (!Number.isInteger(expectedContractMarketId) || expectedContractMarketId <= 0) {
    return { ok: false, definition, reason: 'Selected Arc market has an invalid contract market ID.' };
  }

  const market = await getOnChainMarket(expectedContractMarketId);
  if (!market || market.id === 0) {
    return {
      ok: false,
      definition,
      market,
      contractMarketId: expectedContractMarketId,
      reason: `Market #${expectedContractMarketId} has not been created on-chain yet. Run npm run seed:arc with the deployer wallet.`,
    };
  }

  if (market.question !== definition.question) {
    return {
      ok: false,
      definition,
      market,
      contractMarketId: expectedContractMarketId,
      reason: `On-chain market #${expectedContractMarketId} does not match the Arc market registry.`,
    };
  }

  if (market.resolved) {
    return {
      ok: false,
      definition,
      market,
      contractMarketId: expectedContractMarketId,
      reason: `Market #${expectedContractMarketId} is already resolved.`,
    };
  }

  return {
    ok: true,
    definition,
    market,
    contractMarketId: expectedContractMarketId,
  };
}

export async function getAllOnChainMarkets(): Promise<ArcOnChainMarket[]> {
  if (!ARC_MARKET_CONTRACT) return [];
  const count = await getMarketCount();
  const markets: ArcOnChainMarket[] = [];
  for (let i = 1; i <= count; i++) {
    const m = await getOnChainMarket(i);
    if (m) markets.push(m);
  }
  return markets;
}

export async function getMarketCount(): Promise<number> {
  if (!ARC_MARKET_CONTRACT) return 0;
  try {
    const count = await publicClient.readContract({
      address: ARC_MARKET_CONTRACT,
      abi: ABI,
      functionName: 'marketCounter',
      args: [],
    });
    return Number(count);
  } catch { return 0; }
}

export async function getUserShares(marketId: number, address: string): Promise<{ yes: number; no: number }> {
  if (!ARC_MARKET_CONTRACT) return { yes: 0, no: 0 };
  try {
    const addr = address as `0x${string}`;
    const [yes, no] = await Promise.all([
      publicClient.readContract({
        address: ARC_MARKET_CONTRACT,
        abi: ABI,
        functionName: 'yesShares',
        args: [BigInt(marketId), addr],
      }),
      publicClient.readContract({
        address: ARC_MARKET_CONTRACT,
        abi: ABI,
        functionName: 'noShares',
        args: [BigInt(marketId), addr],
      }),
    ]);
    return { yes: Number(yes), no: Number(no) };
  } catch { return { yes: 0, no: 0 }; }
}

/**
 * Build a raw tx payload for `buyShares` that sendTransaction can use directly.
 */
export function buildBuySharesTx(marketId: number, side: boolean, amountWei: bigint): any {
  if (!ARC_MARKET_CONTRACT) throw new Error('Contract address not configured');
  if (amountWei <= 0n) throw new Error('Trade amount must be greater than 0');
  const data = encodeFunctionData({
    abi: [{ type: 'function', name: 'buyShares', inputs: [{ type: 'uint256' }, { type: 'bool' }], outputs: [], stateMutability: 'payable' }],
    functionName: 'buyShares',
    args: [BigInt(marketId), side],
  });
  return {
    to: ARC_MARKET_CONTRACT,
    data,
    value: `0x${amountWei.toString(16)}`,
    chainId: ARC_CHAIN_ID,
  };
}

export async function waitForArcTransaction(hash: string) {
  return publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
}

export function getArcTxUrl(hash: string) {
  return `${ARC_EXPLORER}/tx/${hash}`;
}

export function buildClaimTx(marketId: number): any {
  if (!ARC_MARKET_CONTRACT) throw new Error('Contract address not configured');
  const data = encodeFunctionData({
    abi: [{ type: 'function', name: 'claimPayout', inputs: [{ type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' }],
    functionName: 'claimPayout',
    args: [BigInt(marketId)],
  });
  return {
    to: ARC_MARKET_CONTRACT,
    data,
    chainId: ARC_CHAIN_ID,
  };
}
