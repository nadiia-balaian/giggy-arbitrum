import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ok, badRequest, notFound } from "../lib/response.js";
import {
  putMission,
  getMission,
  listMissions,
  deleteMission,
  getReport,
  listActivity,
  updateMissionStatus,
  type MissionRow,
} from "../lib/dynamo.js";

// POST /api/missions
// Frontend calls this after the user's on-chain createTask tx confirms.
export const create: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body ?? "{}");
  const {
    id,
    title,
    description,
    rewardUsd,
    x402ClaimPriceUsd,
    workerType,
    deadline,
    requirements,
    poster,
    specHash,
  } = body;

  if (!id || !title) {
    return badRequest("id and title are required");
  }

  // Idempotent: if mission already exists, return it
  const existing = await getMission(id);
  if (existing) {
    return ok(existing);
  }

  const mission: MissionRow = {
    id,
    title: title.trim() || "Untitled Mission",
    description: description?.trim() ?? "",
    requirements: Array.isArray(requirements) ? requirements : [],
    rewardUsd: Number(rewardUsd) || 0,
    x402ClaimPriceUsd: Number(x402ClaimPriceUsd) || 0,
    workerType: workerType ?? "aws_agent",
    status: "open",
    deadline: deadline ?? "",
    createdAt: new Date().toISOString(),
    poster: poster ?? "",
    specHash: specHash ?? "",
    featured: true,
  };

  await putMission(mission);
  return ok(mission, 201);
};

// GET /api/missions
export const list: APIGatewayProxyHandlerV2 = async () => {
  const missions = await listMissions();
  return ok(missions);
};

// GET /api/missions/{id}
export const get: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) return badRequest("id is required");

  const mission = await getMission(id);
  if (!mission) return notFound(`Mission ${id} not found`);

  return ok(mission);
};

// GET /api/missions/{id}/report
export const report: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) return badRequest("id is required");

  const row = await getReport(id);
  if (!row) return notFound(`Report for mission ${id} not found`);

  return ok(row);
};

// GET /api/missions/{id}/activity
export const activity: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) return badRequest("id is required");

  const rows = await listActivity(id);
  return ok(rows);
};

// POST /api/missions/{id}/release
// Frontend calls this AFTER the on-chain release tx confirms.
// Records the tx hash and flips status → "paid". On-chain is the source of
// truth; this just keeps the off-chain mirror in sync for the UI.
export const release: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) return badRequest("id is required");

  const body = JSON.parse(event.body ?? "{}");
  const { txHash } = body;
  if (!txHash) return badRequest("txHash is required");

  const mission = await getMission(id);
  if (!mission) return notFound(`Mission ${id} not found`);

  await updateMissionStatus(id, "paid", {
    paidAt: new Date().toISOString(),
    releaseTxHash: txHash,
  });

  return ok({ ...mission, status: "paid", releaseTxHash: txHash });
};

// DELETE /api/missions/{id}
// Off-chain cleanup only — the on-chain task is unaffected. Removes the mission
// row plus its activity log and report from DynamoDB.
export const remove: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) return badRequest("id is required");

  await deleteMission(id);
  return ok({ deleted: true, id });
};
