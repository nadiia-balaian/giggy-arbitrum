import type { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { useFacilitator } from "x402/verify";
import type { PaymentPayload, PaymentRequirements } from "x402/types";
import { invokeClaude } from "./bedrock.js";

// GET /premium-news?topic=...
//
// HTTP-native paid endpoint per the x402 spec.
//   1st call (no X-PAYMENT header): returns 402 + payment requirements.
//   2nd call (with valid X-PAYMENT): facilitator verifies + settles the USDC
//     micropayment on Arbitrum Sepolia, then we serve the data with the settled
//     tx hash in the X-PAYMENT-RESPONSE header.
//
// We delegate verify + settle to Coinbase's hosted facilitator (default URL,
// no api key needed for arbitrum-sepolia). That way this Lambda doesn't need
// its own ETH for gas — the facilitator pays.

const { verify, settle } = useFacilitator();

const RECIPIENT = (process.env.RECIPIENT_WALLET ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const USDC = (process.env.USDC_ADDRESS ??
  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d") as `0x${string}`;
const PRICE_USDC = process.env.PRICE_USDC ?? "0.01";

// Convert "0.01" USDC → "10000" (USDC has 6 decimals).
function priceToAtomic(usd: string): string {
  return BigInt(Math.round(Number(usd) * 1_000_000)).toString();
}

function buildRequirements(topic: string): PaymentRequirements {
  return {
    scheme: "exact",
    network: "arbitrum-sepolia",
    maxAmountRequired: priceToAtomic(PRICE_USDC),
    resource: `https://x402-api.taskvault.dev/premium-news?topic=${encodeURIComponent(topic)}`,
    description: "TaskVault premium news access",
    mimeType: "application/json",
    payTo: RECIPIENT,
    maxTimeoutSeconds: 60,
    asset: USDC,
    extra: {
      name: "USDC",
      version: "2",
    },
  };
}

export const premiumNews: APIGatewayProxyHandlerV2 = async (event) => {
  const headers = event.headers ?? {};
  const xPayment = headers["x-payment"] ?? headers["X-PAYMENT"];
  const topic = event.queryStringParameters?.topic ?? "general";
  const requirements = buildRequirements(topic);

  if (!xPayment) {
    return paymentRequired(requirements);
  }

  let payload: PaymentPayload;
  try {
    payload = JSON.parse(Buffer.from(xPayment, "base64").toString("utf8"));
  } catch {
    return paymentRequired(requirements, "Invalid X-PAYMENT header");
  }

  // 1. Verify the signature + balance + amount via the facilitator
  const verifyRes = await verify(payload, requirements);
  if (!verifyRes.isValid) {
    return paymentRequired(requirements, verifyRes.invalidReason ?? "verify_failed");
  }

  // 2. Settle on-chain — the facilitator submits the USDC transferWithAuthorization
  const settleRes = await settle(payload, requirements);
  if (!settleRes.success) {
    return paymentRequired(requirements, settleRes.errorReason ?? "settle_failed");
  }

  // 3. Generate genuinely tailored research via Bedrock (paid Claude compute)
  //    and serve it back along with the settled tx hash in X-PAYMENT-RESPONSE.
  const articles = await generateArticles(topic);
  return ok(
    { topic, articles },
    {
      "X-PAYMENT-RESPONSE": Buffer.from(
        JSON.stringify({
          success: true,
          transaction: settleRes.transaction,
          network: settleRes.network,
          payer: settleRes.payer,
        }),
      ).toString("base64"),
    },
  );
};

function paymentRequired(
  requirements: PaymentRequirements,
  errorReason?: string,
): APIGatewayProxyResultV2 {
  return {
    statusCode: 402,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      x402Version: 1,
      accepts: [requirements],
      error: errorReason ?? "Payment required",
    }),
  };
}

function ok(body: unknown, extra: Record<string, string> = {}): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...extra },
    body: JSON.stringify(body),
  };
}

// Bedrock-generated paid content. Each call returns a fresh, topic-specific
// research bundle — the agent's $0.01 USDC pays for actual Claude compute,
// not canned data. If Bedrock fails or returns malformed JSON we fall back
// to a generic stub so the API never 5xxs after the user has already paid.
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
        source: "TaskVault Premium Wire (fallback)",
        publishedAt: now,
      },
    ];
  }
}

// Tolerate code fences and trailing prose around the JSON array.
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
