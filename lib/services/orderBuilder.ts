// CTF Exchange contract on Polygon
const CTF_EXCHANGE_ADDRESS = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';

export interface PolymarketOrder {
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: 0 | 1;
  signatureType: 0;
}

export interface EIP712OrderPayload {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    Order: Array<{ name: string; type: string }>;
  };
  primaryType: 'Order';
  message: PolymarketOrder;
}

const ORDER_TYPES = [
  { name: 'salt', type: 'uint256' },
  { name: 'maker', type: 'address' },
  { name: 'signer', type: 'address' },
  { name: 'taker', type: 'address' },
  { name: 'tokenId', type: 'uint256' },
  { name: 'makerAmount', type: 'uint256' },
  { name: 'takerAmount', type: 'uint256' },
  { name: 'expiration', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'feeRateBps', type: 'uint256' },
  { name: 'side', type: 'uint8' },
  { name: 'signatureType', type: 'uint8' },
];

export function buildLimitOrder(params: {
  walletAddress: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  shares: number;
  chainId?: number;
}): EIP712OrderPayload {
  const { walletAddress, tokenId, side, price, shares, chainId = 137 } = params;

  const isBuy = side === 'BUY';
  const makerAmount = isBuy
    ? Math.round(price * shares * 1_000_000).toString()
    : Math.round(shares * 1_000_000).toString();
  const takerAmount = isBuy
    ? Math.round(shares * 1_000_000).toString()
    : Math.round(price * shares * 1_000_000).toString();

  const order: PolymarketOrder = {
    salt: Date.now().toString(),
    maker: walletAddress,
    signer: walletAddress,
    taker: '0x0000000000000000000000000000000000000000',
    tokenId,
    makerAmount,
    takerAmount,
    expiration: '0',
    nonce: '0',
    feeRateBps: '0',
    side: isBuy ? 0 : 1,
    signatureType: 0,
  };

  return {
    domain: {
      name: 'Polymarket CTF Exchange',
      version: '1',
      chainId,
      verifyingContract: CTF_EXCHANGE_ADDRESS,
    },
    types: {
      Order: ORDER_TYPES,
    },
    primaryType: 'Order',
    message: order,
  };
}

export function buildOrderIntent(params: {
  walletAddress: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  shares: number;
  marketQuestion: string;
}): string {
  const { side, shares, marketQuestion, tokenId, price } = params;
  return `Place a ${side} limit order on Polymarket: ${shares} ${side === 'BUY' ? 'YES' : ''} shares of '${marketQuestion}' at ${Math.round(price * 100)} cents. Token ID: ${tokenId}. Use send_eip712_to_wallet with the provided EIP-712 payload to sign and submit this order.`;
}
