import type { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  decodePaymentSignatureHeader,
} from "@x402/core/http";
import type {
  PaymentPayload,
  PaymentRequirements,
  PaymentRequired,
} from "@x402/core/types";
import { invokeClaude } from "./bedrock.js";
import { localFacilitator } from "./local-facilitator.js";

// GET /premium-news?topic=...
//
// HTTP-native paid endpoint, x402 v2 protocol.
//   1st call (no PAYMENT-SIGNATURE header): returns 402 + PAYMENT-REQUIRED.
//   2nd call (signed): we verify the EIP-3009 authorization, settle the USDC
//     transferWithAuthorization on Arbitrum Sepolia, then serve the data
//     with the tx hash in the PAYMENT-RESPONSE header.
//
// The settler is in-process (see local-facilitator.ts) because the public
// x402.org facilitator only covers Base Sepolia today.

const RECIPIENT = (process.env.RECIPIENT_WALLET ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const USDC = (process.env.USDC_ADDRESS ??
  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d") as `0x${string}`;
const PRICE_USDC = process.env.PRICE_USDC ?? "0.01";
// CAIP-2 network identifier — v2 uses these instead of friendly names.
const NETWORK = (process.env.X402_NETWORK ?? "eip155:421614") as `${string}:${string}`;

function priceToAtomic(usd: string): string {
  return BigInt(Math.round(Number(usd) * 1_000_000)).toString();
}

function buildRequirements(): PaymentRequirements {
  return {
    scheme: "exact",
    network: NETWORK,
    asset: USDC,
    amount: priceToAtomic(PRICE_USDC),
    payTo: RECIPIENT,
    maxTimeoutSeconds: 60,
    extra: {
      name: "USD Coin",
      version: "2",
    },
  };
}

function buildPaymentRequired(topic: string, errorReason?: string): PaymentRequired {
  return {
    x402Version: 2,
    error: errorReason ?? "Payment required",
    resource: {
      url: `https://x402-api.giggy-arbitrum.dev/premium-news?topic=${encodeURIComponent(topic)}`,
      description: "Giggy premium news access (Claude-generated, topic-specific)",
      mimeType: "application/json",
      serviceName: "Giggy Premium News",
    },
    accepts: [buildRequirements()],
  };
}

export const premiumNews: APIGatewayProxyHandlerV2 = async (event) => {
  // API Gateway HTTP API v2 lowercases header keys. v2 protocol sends
  // PAYMENT-SIGNATURE; v1 sent X-PAYMENT — accept either for compat.
  const headers = event.headers ?? {};
  const sigHeader =
    headers["payment-signature"] ?? headers["x-payment"] ?? null;
  const topic = event.queryStringParameters?.topic ?? "general";
  const requirements = buildRequirements();

  if (!sigHeader) {
    return paymentRequiredResponse(buildPaymentRequired(topic));
  }

  let payload: PaymentPayload;
  try {
    payload = decodePaymentSignatureHeader(sigHeader) as PaymentPayload;
  } catch {
    return paymentRequiredResponse(
      buildPaymentRequired(topic, "Invalid PAYMENT-SIGNATURE header"),
    );
  }

  const facilitator = localFacilitator();

  // 1. Verify (signature + balance + amount) locally
  const verifyRes = await facilitator.verify(payload, requirements);
  if (!verifyRes.isValid) {
    return paymentRequiredResponse(
      buildPaymentRequired(topic, verifyRes.invalidReason ?? "verify_failed"),
    );
  }

  // 2. Settle on-chain — this Lambda's facilitator wallet submits
  //    USDC.transferWithAuthorization on Arbitrum Sepolia
  const settleRes = await facilitator.settle(payload, requirements);
  if (!settleRes.success) {
    return paymentRequiredResponse(
      buildPaymentRequired(topic, settleRes.errorReason ?? "settle_failed"),
    );
  }

  // 3. Bedrock generates the paid content
  const articles = await generateArticles(topic);

  // 4. Serve with the settled tx hash. v2 reads PAYMENT-RESPONSE; @x402/fetch
  //    also reads X-PAYMENT-RESPONSE — send both so v1 + v2 clients work.
  const settleHeader = encodePaymentResponseHeader(settleRes);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "PAYMENT-RESPONSE": settleHeader,
      "X-PAYMENT-RESPONSE": settleHeader,
      "Access-Control-Expose-Headers": "PAYMENT-RESPONSE,X-PAYMENT-RESPONSE",
    },
    body: JSON.stringify({ topic, articles }),
  };
};

// v2 servers must surface PaymentRequired via the PAYMENT-REQUIRED HTTP header
// (base64 JSON). @x402/core/client only falls back to body parsing for v1
// responses, so without this header the v2 client throws
// "Invalid payment required response". We also include the JSON in the body
// for human-readable debugging and v1 client compat.
function paymentRequiredResponse(
  paymentRequired: PaymentRequired,
): APIGatewayProxyResultV2 {
  return {
    statusCode: 402,
    headers: {
      "Content-Type": "application/json",
      "PAYMENT-REQUIRED": encodePaymentRequiredHeader(paymentRequired),
      "Access-Control-Expose-Headers": "PAYMENT-REQUIRED",
    },
    body: JSON.stringify(paymentRequired),
  };
}

// Bedrock-generated paid content. Each call returns a fresh, topic-specific
// research bundle — the agent's $0.01 USDC pays for actual Claude compute.
async function generateArticles(topic: string) {
  const system =
    "You write realistic-sounding industry research summaries for a paid news API. " +
    "Always return ONLY valid JSON — no prose, no code fences. " +
    "Each article must include specific company names, dollar amounts, and dates.";

  const prompt = `Generate 3 brief news article summaries about "${topic}" set in early 2026.
Format strictly as a JSON array:
[
  { "title": "...", "summary": "...", "source": "...", "publishedAt": "2026-..." },
  { "title": "...", "summary": "...", "source": "...", "publishedAt": "2026-..." },
  { "title": "...", "summary": "...", "source": "...", "publishedAt": "2026-..." }
]
Each summary 2-3 sentences. Mix incumbents and emerging players. Cite plausible publications as source.`;

  try {
    const raw = await invokeClaude(prompt, system, 1200);
    const json = extractJsonArray(raw);
    if (!Array.isArray(json) || json.length === 0) throw new Error("empty");
    return json;
  } catch (err) {
    console.warn(`[x402-api] Bedrock generation failed: ${(err as Error).message} — serving fallback`);
    const now = new Date().toISOString();
    return [
      {
        title: `${topic}: industry overview, 2026`,
        summary: `Snapshot of the ${topic} sector — major players, funding, and macro trends.`,
        source: "Giggy Premium Wire (fallback)",
        publishedAt: now,
      },
    ];
  }
}

function extractJsonArray(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fence?.[1] ?? text).trim();
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    return JSON.parse(candidate);
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
