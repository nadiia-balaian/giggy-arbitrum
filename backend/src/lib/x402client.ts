// x402 buyer-side client.
//
// Uses a dedicated hot key for x402 signing, separate from the CDP-managed
// wallet that signs pickup/submitProof. We tried bridging CDP into a viem
// LocalAccount first; x402-axios's runtime check rejected it ("does not
// support signTypedData") because EIP-3009 needs a viem-native typed-data
// signer. Hot key = simplest viable signer, no SDK gymnastics.
//
// In a v2 marketplace each agent would have its own CDP-managed payment
// wallet. For this hackathon, one shared hot key signed and funded out of
// our scripts/ folder is fine.

import axios, { type AxiosResponse } from "axios";
import { withPaymentInterceptor, decodeXPaymentResponse } from "x402-axios";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.X402_CLIENT_PRIVATE_KEY ?? "";

let cachedClient: ReturnType<typeof axios.create> | null = null;
let cachedAddress: `0x${string}` | null = null;

function buildClient() {
  if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith("0x")) {
    throw new Error("X402_CLIENT_PRIVATE_KEY env var is missing or malformed");
  }
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  cachedAddress = account.address;
  cachedClient = withPaymentInterceptor(axios.create(), account);
  return cachedClient;
}

function client() {
  return cachedClient ?? buildClient();
}

/** Returns the x402 payer wallet's EVM address. */
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
 * GET a URL through the x402 interceptor. If the server returns 402,
 * x402-axios automatically signs payment and retries. Returns the data
 * plus the settled tx hash extracted from `X-PAYMENT-RESPONSE`.
 */
export async function x402Get<T>(url: string): Promise<X402Result<T>> {
  const c = client();
  const res: AxiosResponse<T> = await c.get(url);
  const settled = decodeXPaymentResponse(res.headers["x-payment-response"]);
  return {
    data: res.data,
    txHash: settled?.transaction ?? null,
    payer: (settled?.payer as `0x${string}` | undefined) ?? null,
  };
}
