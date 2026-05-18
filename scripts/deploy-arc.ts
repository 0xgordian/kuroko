import { createWalletClient, http, publicActions, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  testnet: true,
} as const satisfies import('viem').Chain;

async function main() {
  const privateKey = process.env.ARC_DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Set ARC_DEPLOYER_PRIVATE_KEY in .env.local');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const client = createWalletClient({
    account,
    chain: ARC_TESTNET,
    transport: http(),
  }).extend(publicActions);

  const balance = await client.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${balance} wei`);

  const abi = [
    { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'createMarket', inputs: [
      { name: 'question', type: 'string' },
      { name: 'resolutionTime', type: 'uint256' },
    ], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'buyShares', inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'side', type: 'bool' },
    ], outputs: [], stateMutability: 'payable' },
    { type: 'function', name: 'resolveMarket', inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcome', type: 'bool' },
    ], outputs: [], stateMutability: 'nonpayable' },
    { type: 'function', name: 'claimPayout', inputs: [
      { name: 'marketId', type: 'uint256' },
    ], outputs: [], stateMutability: 'nonpayable' },
  ];

  const bytecode = fs.readFileSync(
    path.join(__dirname, '../contracts/ArcPredictionMarket.bin'),
    'utf-8',
  ).trim();

  const hash = await client.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
  });

  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`Contract deployed at: ${receipt.contractAddress}`);
  console.log(`Tx hash: ${hash}`);

  // Write address to .env
  const envPath = path.join(__dirname, '../.env.local');
  let env = fs.readFileSync(envPath, 'utf-8');
  env += `\nNEXT_PUBLIC_ARC_MARKET_CONTRACT=${receipt.contractAddress}\n`;
  fs.writeFileSync(envPath, env);
  console.log(`Address written to .env.local`);
}

main().catch(console.error);
