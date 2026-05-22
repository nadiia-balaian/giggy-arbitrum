// AI verdict pipeline.
//
// After the agent submits a proof on-chain, this module:
//   1. Scores the report against the original task spec using Claude.
//   2. Hashes the reasoning text and submits an AutoVerifier.attest()
//      transaction from the dedicated scorer wallet.
//   3. Returns the verdict so the caller can persist it + show it in the UI.
//
// Trust model: a single registered scorer key signs verdicts. The verdict
// is *advisory* — the poster still calls escrow.release/refund themselves
// after reading it on the mission page. This makes the AI a transparent
// recommendation, not an unchallengeable judge.

import {
  createWalletClient,
  http,
  publicActions,
  keccak256,
  stringToHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { invokeClaude } from "./bedrock.js";
import type { MissionRow, ReportRow } from "./dynamo.js";

const PRIVATE_KEY = (process.env.VERIFIER_PRIVATE_KEY || "") as Hex;
const AUTOVERIFIER_ADDRESS = (process.env.AUTOVERIFIER_ADDRESS || "") as `0x${string}`;
const RPC_URL =
  process.env.ARBITRUM_SEPOLIA_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";

// Minimal ABI — we only call attest()
const autoVerifierAbi = [
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId",        type: "uint256" },
      { name: "scoreBps",      type: "uint16"  },
      { name: "passed",        type: "bool"    },
      { name: "reasoningHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

let cachedClient: ReturnType<typeof buildClient> | null = null;
let cachedAddress: `0x${string}` | null = null;

function buildClient() {
  if (!PRIVATE_KEY.startsWith("0x")) {
    throw new Error("VERIFIER_PRIVATE_KEY env var is missing or malformed");
  }
  if (!AUTOVERIFIER_ADDRESS.startsWith("0x")) {
    throw new Error("AUTOVERIFIER_ADDRESS env var is missing");
  }
  const account = privateKeyToAccount(PRIVATE_KEY);
  cachedAddress = account.address;
  return createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(RPC_URL),
  }).extend(publicActions);
}

function client() {
  return cachedClient ?? (cachedClient = buildClient());
}

export function getScorerAddress(): `0x${string}` {
  if (cachedAddress) return cachedAddress;
  client();
  return cachedAddress!;
}

export interface Verdict {
  scoreBps: number;        // 0..10000
  passed: boolean;
  reasoning: string;        // human-readable, 1-3 sentences
  reasoningHash: `0x${string}`;
  txHash: `0x${string}`;
}

const SYSTEM = `You are a strict, fair AI verifier. You judge whether a research report
satisfies the task it was hired to do. You are not the agent who wrote the report —
you are an independent reviewer. Be concise and decisive.`;

function scoringPrompt(mission: MissionRow, report: string): string {
  const reqs = mission.requirements.length
    ? mission.requirements.map((r) => `- ${r}`).join("\n")
    : "- (no explicit requirements; judge by description)";

  return `Evaluate the agent's report against the task spec.

TASK SPEC
Title: ${mission.title}
Description: ${mission.description || "(none)"}
Requirements:
${reqs}

REPORT SUBMITTED BY THE AGENT
<report>
${report}
</report>

Decide whether this report adequately addresses the task. Score on quality, completeness,
and relevance to the requirements. Be strict — a report that drifts off-topic, hallucinates
sources, or skips listed requirements should fail.

Return ONLY valid JSON, no prose, no code fences:
{
  "scoreBps": <integer 0..10000, where 10000 = perfect>,
  "passed":   <true if scoreBps >= 7000, else false>,
  "reasoning": "<1-3 sentence explanation of the verdict>"
}`;
}

interface RawVerdict {
  scoreBps: number;
  passed: boolean;
  reasoning: string;
}

function extractJson(text: string): RawVerdict {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fence?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice = start === -1 || end === -1 ? candidate : candidate.slice(start, end + 1);
  return JSON.parse(slice) as RawVerdict;
}

function clampBps(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10_000, v));
}

/**
 * Score a report with Claude and submit an on-chain attestation. The taskId
 * is the *on-chain* escrow taskId (numeric). The mission.id in DynamoDB
 * mirrors that, so callers can pass Number(mission.id).
 *
 * Throws if Claude fails to return parseable JSON or if the on-chain tx
 * reverts. Callers should catch and log a "verdict_failed" activity row
 * so the mission can still be released manually.
 */
export async function scoreAndAttest(
  mission: MissionRow,
  reportBody: string,
  taskId: number,
): Promise<Verdict> {
  const raw = await invokeClaude(scoringPrompt(mission, reportBody), SYSTEM, 600);
  const parsed = extractJson(raw);

  const scoreBps = clampBps(parsed.scoreBps);
  const passed = Boolean(parsed.passed);
  const reasoning = String(parsed.reasoning ?? "").slice(0, 1000);
  const reasoningHash = keccak256(stringToHex(reasoning));

  const c = client();
  const txHash = await c.writeContract({
    address: AUTOVERIFIER_ADDRESS,
    abi: autoVerifierAbi,
    functionName: "attest",
    args: [BigInt(taskId), scoreBps, passed, reasoningHash],
  });
  await c.waitForTransactionReceipt({ hash: txHash });

  return { scoreBps, passed, reasoning, reasoningHash, txHash };
}
