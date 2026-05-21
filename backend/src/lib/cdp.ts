// Agent on-chain signer.
//
// Originally this module was a thin wrapper around the Coinbase CDP SDK
// (hence the filename). CDP's sendTransaction returns 500 on Arbitrum
// Sepolia today despite the SDK listing it as supported, so we run a
// plain viem walletClient against the chain RPC instead. The agent's
// signing key is the same hot key used for x402 payments — one EOA
// covers both jobs, and the escrow's immutable agent slot was set to
// that address at deploy time.
//
// The public API (getAgentAddress, sendTransaction, callContract) is
// unchanged so escrow.ts and agent.ts don't need to know.

import {
  createWalletClient,
  createPublicClient,
  http,
  publicActions,
  encodeFunctionData,
  type Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const PRIVATE_KEY = (process.env.AGENT_PRIVATE_KEY ||
  process.env.X402_CLIENT_PRIVATE_KEY ||
  "") as Hex;

const RPC_URL =
  process.env.ARBITRUM_SEPOLIA_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";

type WalletClient = ReturnType<typeof buildClient>;
let cachedClient: WalletClient | null = null;
let cachedAddress: `0x${string}` | null = null;

function buildClient() {
  if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith("0x")) {
    throw new Error(
      "AGENT_PRIVATE_KEY (or X402_CLIENT_PRIVATE_KEY) env var is missing or malformed",
    );
  }
  const account = privateKeyToAccount(PRIVATE_KEY);
  cachedAddress = account.address;
  return createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(RPC_URL),
  }).extend(publicActions);
}

function client(): WalletClient {
  return cachedClient ?? (cachedClient = buildClient());
}

/** Returns the agent's EVM address. */
export async function getAgentAddress(): Promise<string> {
  if (cachedAddress) return cachedAddress;
  client();
  return cachedAddress!;
}

/** Send a raw transaction from the agent wallet. Returns tx hash. */
export async function sendTransaction(params: {
  to: string;
  data?: string;
  value?: bigint;
}): Promise<string> {
  const c = client();
  const txHash = await c.sendTransaction({
    to: params.to as `0x${string}`,
    data: (params.data ?? "0x") as `0x${string}`,
    value: params.value,
  });
  // Wait for inclusion so callers can rely on the tx having landed before
  // logging the activity row. Matches the prior CDP behavior (CDP returned
  // only after broadcast + receipt).
  await c.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

/** Encode + send a contract call from the agent wallet. Returns tx hash. */
export async function callContract(params: {
  to: string;
  abi: Abi;
  functionName: string;
  args: unknown[];
}): Promise<string> {
  const data = encodeFunctionData({
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
  });
  return sendTransaction({ to: params.to, data });
}

// Keep an unused publicClient available if a future caller wants
// read-only chain access without going through writeContract.
export function getPublicClient() {
  return createPublicClient({
    chain: arbitrumSepolia,
    transport: http(RPC_URL),
  });
}
