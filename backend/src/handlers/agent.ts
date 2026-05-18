import type { APIGatewayProxyHandlerV2, ScheduledHandler } from "aws-lambda";
import { ok } from "../lib/response.js";
import { getAgentAddress } from "../lib/cdp.js";
import { invokeClaude } from "../lib/bedrock.js";
import { fetchNews } from "../lib/news.js";
import * as escrow from "../lib/escrow.js";
import {
  listMissionsByStatus,
  updateMissionStatus,
  putActivity,
  putReport,
  getAgentState,
  putAgentState,
  type MissionRow,
} from "../lib/dynamo.js";

// ─── Helpers ────────────────────────────────────────────────

async function log(missionId: string, kind: string, payload: string, txHash?: string) {
  await putActivity({
    missionId,
    timestamp: Date.now(),
    kind,
    payload,
    txHash,
  });
}

// ─── Core scan logic (used by both HTTP trigger and cron) ───

async function runScan(): Promise<{
  scanned: number;
  claimed: MissionRow | null;
}> {
  const agentAddress = await getAgentAddress();
  console.log(`[agent] address: ${agentAddress}`);

  // 1. Find open missions
  const openMissions = await listMissionsByStatus("open");
  console.log(`[agent] found ${openMissions.length} open missions`);

  if (openMissions.length === 0) {
    return { scanned: 0, claimed: null };
  }

  // Pick oldest open mission
  const mission = openMissions.sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  )[0]!;

  console.log(`[agent] picking up mission ${mission.id}: ${mission.title}`);

  // 2. Claim it in DynamoDB first (prevents race with next cron tick)
  await updateMissionStatus(mission.id, "claimed", {
    claimedBy: agentAddress,
    claimedAt: new Date().toISOString(),
  });
  await log(mission.id, "pickup", `Agent ${agentAddress} claimed this mission`);

  // 3. Call escrow.pickup on-chain
  try {
    // Mission ID for on-chain is numeric. We use the DDB id which may be a string.
    // For v1 the on-chain taskId is passed as part of the mission data.
    // If specHash exists, we know it was created on-chain.
    // For now, skip on-chain pickup if no numeric taskId is available.
    if (mission.specHash) {
      const txHash = await escrow.pickup(Number(mission.id));
      await log(mission.id, "chain_pickup", "On-chain pickup confirmed", txHash);
      await updateMissionStatus(mission.id, "claimed", { x402TxHash: txHash });
    }
  } catch (e) {
    console.log(`[agent] on-chain pickup skipped or failed: ${(e as Error).message}`);
    await log(mission.id, "chain_pickup", `Skipped on-chain pickup: ${(e as Error).message}`);
  }

  // 4. Plan the research
  await log(mission.id, "thinking", "Planning research approach...");
  const plan = await invokeClaude(
    `You are a research agent. A user posted this mission:\n\nTitle: ${mission.title}\nDescription: ${mission.description}\nRequirements: ${mission.requirements.join(", ")}\n\nPlan your research approach in 2-3 bullet points. Be specific about what data you need.`,
    "You are a concise research planning agent. Keep responses under 150 words.",
    300,
  );
  await log(mission.id, "plan", plan);

  // 5. Fetch data via x402-paid API. The first call returns 402, the agent's
  //    CDP wallet signs a USDC micropayment, the facilitator settles on-chain,
  //    and we get the data back. The settled tx hash is logged as an
  //    `x402_payment` activity row so the UI can render a Arbiscan link.
  await log(mission.id, "data_fetch", "Calling premium news API...");
  let articles: Awaited<ReturnType<typeof fetchNews>>["articles"] = [];
  try {
    const newsResult = await fetchNews(mission.title);
    articles = newsResult.articles;
    if (newsResult.paymentTxHash) {
      await log(
        mission.id,
        "x402_payment",
        "Paid premium API via x402",
        newsResult.paymentTxHash,
      );
    }
    await log(mission.id, "data_received", `Received ${articles.length} articles`);
  } catch (e) {
    await log(
      mission.id,
      "data_fetch_failed",
      `News fetch failed: ${(e as Error).message}`,
    );
  }

  // 6. Generate the report
  await log(mission.id, "writing", "Generating report with Claude...");
  const report = await invokeClaude(
    `You are a research agent writing a report for this mission:\n\nTitle: ${mission.title}\nDescription: ${mission.description}\nRequirements: ${mission.requirements.join(", ")}\n\nResearch data:\n${articles.map((a) => `- ${a.title}: ${a.summary}`).join("\n")}\n\nWrite a comprehensive but concise research report (300-500 words). Include specific findings, key players, and actionable insights. Format with markdown headers.`,
    "You are a professional research analyst. Write clear, factual reports.",
    1500,
  );
  await log(mission.id, "report_ready", "Report generated");

  // 7. Store the report
  const { keccak256, toBytes } = await import("viem");
  const reportHash = keccak256(toBytes(report));
  await putReport({
    missionId: mission.id,
    body: report,
    reportHash,
    createdAt: new Date().toISOString(),
  });

  // 8. Submit proof on-chain
  try {
    if (mission.specHash) {
      const { txHash } = await escrow.submitProof(Number(mission.id), report);
      await log(mission.id, "chain_submit", "Proof submitted on-chain", txHash);
    }
  } catch (e) {
    console.log(`[agent] on-chain submit skipped or failed: ${(e as Error).message}`);
    await log(mission.id, "chain_submit", `Skipped on-chain submit: ${(e as Error).message}`);
  }

  // 9. Update status to submitted
  await updateMissionStatus(mission.id, "submitted", {
    submittedAt: new Date().toISOString(),
    deliverableUrl: `/api/missions/${mission.id}/report`,
  });
  await log(mission.id, "submitted", "Mission complete — awaiting review");

  // 10. Update agent state
  const state = await getAgentState();
  state.lastScanAt = new Date().toISOString();
  state.missionsScanned += 1;
  state.missionsClaimed += 1;
  state.expectedValueUsd += mission.rewardUsd - mission.x402ClaimPriceUsd;
  await putAgentState(state);

  return { scanned: openMissions.length, claimed: { ...mission, status: "submitted" } };
}

// ─── HTTP: GET /api/agent/snapshot ──────────────────────────

export const snapshot: APIGatewayProxyHandlerV2 = async () => {
  const state = await getAgentState();
  const agentAddress = await getAgentAddress();

  return ok({
    online: true,
    lastScanSecondsAgo: Math.floor(
      (Date.now() - new Date(state.lastScanAt).getTime()) / 1000,
    ),
    missionsScanned: state.missionsScanned,
    missionsClaimed: state.missionsClaimed,
    expectedValueUsd: state.expectedValueUsd,
    agentAddress,
    decisions: [], // TODO: populate from activity table if needed by frontend
  });
};

// ─── HTTP: POST /api/agent/scan (demo button) ──────────────
// Returns 202 immediately and runs the scan async.
// Frontend polls GET /api/missions/:id to see progress.

export const scan: APIGatewayProxyHandlerV2 = async () => {
  console.log("[agent] manual scan triggered via API");

  // Fire-and-forget: invoke ourselves as the cron handler
  const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
  const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? "us-east-2" });
  await lambda.send(
    new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME?.replace("agentScan", "agentCron") ??
        "giggy-arbitrum-backend-dev-agentCron",
      InvocationType: "Event", // async — returns immediately
      Payload: Buffer.from("{}"),
    }),
  );

  return ok({ triggered: true, message: "Agent scan started. Poll mission status for updates." }, 202);
};

// ─── EventBridge cron ───────────────────────────────────────

export const cron: ScheduledHandler = async () => {
  console.log("[agent] cron tick");
  await runScan();
};
