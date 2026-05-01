import type { TradeIntentResponse, BetProposal } from '@/types';
import { buildLimitOrder, buildOrderIntent } from './orderBuilder';

// Dynamic import — avoids 200-500ms static import latency on first trade
let SessionClass: typeof import('@aomi-labs/client').Session | null = null;
async function getSession() {
  if (!SessionClass) {
    const mod = await import('@aomi-labs/client');
    SessionClass = mod.Session;
  }
  return SessionClass;
}

const AOMI_BASE_URL =
  process.env.NEXT_PUBLIC_AOMI_PROXY_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_AOMI_BASE_URL ||
  '/api/aomi';
const AOMI_API_KEY = process.env.NEXT_PUBLIC_AOMI_API_KEY;
const AOMI_APP_ID = process.env.NEXT_PUBLIC_AOMI_APP_ID || 'default';

function hasCredentials(): boolean {
  return Boolean(AOMI_API_KEY);
}

function extractExecutionArtifacts(message: string): { txHash?: string; orderId?: string } {
  const txHashMatch = message.match(/\b0x[a-fA-F0-9]{64}\b/);
  const orderIdMatch = message.match(/\border[_\s-]?id[:=\s]+([a-zA-Z0-9-]+)/i);
  return {
    txHash: txHashMatch?.[0],
    orderId: orderIdMatch?.[1],
  };
}

function deriveModeFromMessage(defaultMode: 'PAPER_TRADE' | 'SIGNING_REQUIRED', message: string) {
  const artifacts = extractExecutionArtifacts(message);
  if (artifacts.txHash || artifacts.orderId) {
    return { mode: 'EXECUTED' as const, ...artifacts };
  }
  return { mode: defaultMode, ...artifacts };
}

type TradeIntentOptions = {
  walletAddress?: string | null;
  chainId?: number | null;
};

function paperTradeStub(intent: string, reason?: string): TradeIntentResponse {
  return {
    success: true,
    message:
      reason ??
      `Paper trade simulation complete. Intent: ${intent}. No real funds moved. Connect a wallet and add NEXT_PUBLIC_AOMI_API_KEY to enable live assistant routing.`,
    mode: 'PAPER_TRADE',
  };
}

/**
 * Construct a natural-language trade intent from a bet proposal.
 * Follows the aomi-client-example pattern.
 */
export function constructBetIntent(proposal: BetProposal): string {
  const { market, side, shares, pricePerShare } = proposal;
  return `Buy ${shares} ${side} shares on '${market.question}' at ${pricePerShare} cents`;
}

/**
 * Send a trade intent to the aomi backend.
 * Uses @aomi-labs/client Session — same pattern as aomi-labs/aomi-client-example.
 */
export async function sendTradeIntent(
  intent: string,
  options: TradeIntentOptions = {},
): Promise<TradeIntentResponse> {
  if (!hasCredentials()) {
    console.warn('[TradeIntentService] No aomi API key — paper-trade mode.');
    return paperTradeStub(intent);
  }

  if (!options.walletAddress) {
    return paperTradeStub(
      intent,
      `Paper trade simulation complete. Intent: ${intent}. Connect a wallet to route this intent into a live signing flow.`,
    );
  }

  try {
    const Session = await getSession();

    const session = new Session(
      { baseUrl: AOMI_BASE_URL, apiKey: AOMI_API_KEY! },
      {
        app: AOMI_APP_ID,
        publicKey: options.walletAddress,
        userState: { chainId: options.chainId ?? 137 },
      }
    );

    const result = await session.send(intent);
    const messages = (result as Record<string, unknown>)?.messages;
    const msgArray = Array.isArray(messages) ? messages : [];
    const message =
      msgArray
        .map((m: Record<string, unknown>) => String(m.content ?? m.text ?? ''))
        .filter(Boolean)
        .join(' ') ||
      'Trade intent acknowledged by aomi. Continue in the assistant wallet flow to review and sign.';

    const execution = deriveModeFromMessage('SIGNING_REQUIRED', message);
    return { success: true, message, mode: execution.mode, txHash: execution.txHash, orderId: execution.orderId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `aomi backend error: ${msg}. Falling back to paper-trade mode.`,
      mode: 'PAPER_TRADE',
    };
  }
}

export interface LiveOrderParams {
  walletAddress: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  shares: number;
  marketQuestion: string;
  chainId?: number;
}

export async function sendLiveOrder(params: LiveOrderParams): Promise<TradeIntentResponse> {
  const eip712Payload = buildLimitOrder({
    walletAddress: params.walletAddress,
    tokenId: params.tokenId,
    side: params.side,
    price: params.price,
    shares: params.shares,
    chainId: params.chainId,
  });

  const intent = buildOrderIntent({
    walletAddress: params.walletAddress,
    tokenId: params.tokenId,
    side: params.side,
    price: params.price,
    shares: params.shares,
    marketQuestion: params.marketQuestion,
  });

  const fullMessage = `${intent}\n\nEIP-712 Order Payload:\n${JSON.stringify(eip712Payload, null, 2)}`;

  if (!hasCredentials()) {
    const execution = deriveModeFromMessage('SIGNING_REQUIRED', fullMessage);
    return {
      success: true,
      message: `Wallet signing required. ${fullMessage}`,
      mode: execution.mode,
      txHash: execution.txHash,
      orderId: execution.orderId,
    };
  }

  try {
    const Session = await getSession();

    const session = new Session(
      { baseUrl: AOMI_BASE_URL, apiKey: AOMI_API_KEY! },
      {
        app: AOMI_APP_ID,
        publicKey: params.walletAddress,
        userState: { chainId: params.chainId ?? 137 },
      },
    );

    const result = await session.send(fullMessage);
    const messages = (result as Record<string, unknown>)?.messages;
    const msgArray = Array.isArray(messages) ? messages : [];
    const message =
      msgArray
        .map((m: Record<string, unknown>) => m.content || m.text || '')
        .filter(Boolean)
        .join(' ') ||
      'Live order intent sent to aomi. Continue in the assistant wallet flow to sign and submit.';

    const execution = deriveModeFromMessage('SIGNING_REQUIRED', message);
    return { success: true, message, mode: execution.mode, txHash: execution.txHash, orderId: execution.orderId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `aomi backend error: ${msg}. Order payload: ${JSON.stringify(eip712Payload)}`,
      mode: 'PAPER_TRADE',
    };
  }
}
