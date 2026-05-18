#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile(path.join(rootDir, '.env.local'));
loadEnvFile(path.join(rootDir, '.env'));

const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  testnet: true,
};

const ABI = [
  {
    type: 'function',
    name: 'marketCounter',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
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
    name: 'createMarket',
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'resolutionTime', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
];

const markets = JSON.parse(fs.readFileSync(path.join(rootDir, 'lib/data/arcMarkets.json'), 'utf8'));
const contractAddress = process.env.NEXT_PUBLIC_ARC_MARKET_CONTRACT;
const privateKey = process.env.ARC_DEPLOYER_PRIVATE_KEY;

if (!contractAddress) {
  throw new Error('NEXT_PUBLIC_ARC_MARKET_CONTRACT is not configured.');
}

if (!privateKey) {
  throw new Error('ARC_DEPLOYER_PRIVATE_KEY is not configured.');
}

function normalizePrivateKey(value) {
  const trimmed = value.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return `0x${trimmed}`;
  if (/^[0-9]+$/.test(trimmed)) {
    const hex = BigInt(trimmed).toString(16).padStart(64, '0');
    if (hex.length === 64) return `0x${hex}`;
  }
  throw new Error('ARC_DEPLOYER_PRIVATE_KEY must be a 32-byte private key as 0x-prefixed hex, bare hex, or decimal.');
}

const account = privateKeyToAccount(normalizePrivateKey(privateKey));
const publicClient = createPublicClient({ chain: ARC_TESTNET, transport: http() });
const walletClient = createWalletClient({ account, chain: ARC_TESTNET, transport: http() });

function toUnixSeconds(iso) {
  return BigInt(Math.floor(new Date(iso).getTime() / 1000));
}

async function readMarket(id) {
  const data = await publicClient.readContract({
    address: contractAddress,
    abi: ABI,
    functionName: 'markets',
    args: [BigInt(id)],
  });
  return {
    id: Number(data[0]),
    question: data[1],
    resolutionTime: Number(data[2]),
    resolved: data[3],
  };
}

async function assertExistingMarketsAreAligned(count) {
  if (count > markets.length) {
    throw new Error(`Contract already has ${count} markets, but the shared Arc list only has ${markets.length}. Refusing to seed.`);
  }

  for (let i = 1; i <= count; i++) {
    const expected = markets.find((market) => market.contractMarketId === i);
    const actual = await readMarket(i);
    if (!expected || actual.question !== expected.question) {
      throw new Error(`Contract market ${i} does not match shared Arc definitions. Refusing to append into a drifted contract.`);
    }
  }
}

async function main() {
  const count = Number(await publicClient.readContract({
    address: contractAddress,
    abi: ABI,
    functionName: 'marketCounter',
  }));

  console.log(`ArcPredictionMarket: ${contractAddress}`);
  console.log(`Deployer: ${account.address}`);
  console.log(`Existing markets: ${count}`);

  await assertExistingMarketsAreAligned(count);

  const missing = markets
    .filter((market) => market.contractMarketId > count)
    .sort((a, b) => a.contractMarketId - b.contractMarketId);

  if (!missing.length) {
    console.log('All shared Arc markets are already seeded and aligned.');
    return;
  }

  for (const market of missing) {
    console.log(`Creating market ${market.contractMarketId}: ${market.question}`);
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: ABI,
      functionName: 'createMarket',
      args: [market.question, toUnixSeconds(market.endDate)],
    });
    console.log(`  submitted: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  confirmed`);
  }

  console.log('Arc markets seeded.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
