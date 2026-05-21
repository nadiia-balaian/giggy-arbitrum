// Self-hosted x402 facilitator for Arbitrum Sepolia.
//
// The public x402.org facilitator only supports Base Sepolia on EVM today
// (verified via its /supported endpoint). To run on Arbitrum we host the
// verify+settle loop in this Lambda using @x402/evm's exact/facilitator
// scheme, which knows how to validate an EIP-3009 payload and submit the
// transferWithAuthorization tx to USDC.
//
// The facilitator wallet pays gas for each settle. It does NOT need USDC
// balance itself; it only forwards the user's signed authorization.

import { x402Facilitator } from "@x402/core/facilitator";
import { registerExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import {
  createWalletClient,
  http,
  publicActions,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

// Use || (not ??) so an empty string from serverless.yml's default ""
// falls through to the next candidate. ?? only catches null/undefined.
const PRIVATE_KEY = (process.env.X402_FACILITATOR_PRIVATE_KEY ||
  process.env.X402_CLIENT_PRIVATE_KEY ||
  "") as Hex;

const RPC_URL =
  process.env.ARBITRUM_SEPOLIA_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";

// CAIP-2 identifier for Arbitrum Sepolia.
const NETWORK = "eip155:421614" as const;

let cached: x402Facilitator | null = null;
let cachedAddress: `0x${string}` | null = null;

function build(): x402Facilitator {
  if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith("0x")) {
    throw new Error(
      "X402_FACILITATOR_PRIVATE_KEY (or X402_CLIENT_PRIVATE_KEY) env var is missing or malformed",
    );
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  cachedAddress = account.address;

  // viem wallet client + publicActions covers every method the
  // FacilitatorEvmSigner interface requires: signTypedData,
  // verifyTypedData, readContract, writeContract, sendTransaction,
  // waitForTransactionReceipt, getCode.
  const client = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(RPC_URL),
  }).extend(publicActions);

  // viem's verifyTypedData has a tighter generic on `types` than the
  // FacilitatorEvmSigner interface declares. Runtime behavior is identical
  // (the EIP-3009 typed-data passed by @x402/evm satisfies viem at runtime),
  // so we widen the type to bridge the two interfaces.
  const signer = toFacilitatorEvmSigner(
    client as unknown as Parameters<typeof toFacilitatorEvmSigner>[0],
  );

  const facilitator = new x402Facilitator();
  registerExactEvmScheme(facilitator, {
    signer,
    networks: NETWORK,
  });

  return facilitator;
}

export function localFacilitator(): x402Facilitator {
  return cached ?? (cached = build());
}

export function getFacilitatorAddress(): `0x${string}` {
  if (cachedAddress) return cachedAddress;
  build();
  return cachedAddress!;
}
