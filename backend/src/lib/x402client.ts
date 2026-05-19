// x402 buyer-side client (v2 protocol).
//
// Uses @x402/fetch + @x402/evm with the eip155:* wildcard so the same client
// works on every EVM chain, including Arbitrum Sepolia (eip155:421614) which
// the legacy v1 lib doesn't list in its NetworkSchema enum.
//
// Signer: a viem LocalAccount from X402_CLIENT_PRIVATE_KEY. Separate hot key
// from the CDP-managed escrow agent, scoped to EIP-3009 USDC
// transferWithAuthorization off-chain signatures only.

import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.X402_CLIENT_PRIVATE_KEY ?? "";

let cachedFetch: typeof fetch | null = null;
let cachedAddress: `0x${string}` | null = null;

function buildClient() {
  if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith("0x")) {
    throw new Error("X402_CLIENT_PRIVATE_KEY env var is missing or malformed");
  }
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  cachedAddress = account.address;

  cachedFetch = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [
      // eip155:* matches every EVM chain — Base, Arbitrum, Polygon, …
      { network: "eip155:*", client: new ExactEvmScheme(account) },
    ],
  });
  return cachedFetch;
}

function client() {
  return cachedFetch ?? buildClient();
}

export function getX402PayerAddress(): `0x${string}` {
  if (cachedAddress) return cachedAddress;
  buildClient();
  return cachedAddress!;
}

export interface X402Result<T> {
  data: T;
  /** On-chain settle tx hash for the USDC micropayment, if present. */
  txHash: string | null;
  /** Wallet that paid (the x402 hot key). */
  payer: `0x${string}` | null;
}

/**
 * GET a URL with automatic x402 payment handling. If the server returns 402,
 * the client signs an EIP-3009 USDC transfer for the configured network,
 * retries with X-PAYMENT, and returns the data + settled tx hash extracted
 * from X-PAYMENT-RESPONSE.
 */
export async function x402Get<T>(url: string): Promise<X402Result<T>> {
  const res = await client()(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`x402 fetch failed ${res.status}: ${text}`);
  }
  const data = (await res.json()) as T;

  const settledHeader = res.headers.get("x-payment-response");
  const settled = settledHeader ? decodePaymentResponseHeader(settledHeader) : null;
  return {
    data,
    txHash: settled?.transaction ?? null,
    payer: (settled?.payer as `0x${string}` | undefined) ?? null,
  };
}
