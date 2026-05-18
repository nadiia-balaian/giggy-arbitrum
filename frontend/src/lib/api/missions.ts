import type { CreateMissionInput, Mission, SubmitDeliverablePayload } from "@/types";
import { api } from "./client";

// GET /api/missions
export async function getMissions(): Promise<Mission[]> {
  return api<Mission[]>("/api/missions");
}

// GET /api/missions/:id
export async function getMissionById(id: string): Promise<Mission | null> {
  try {
    return await api<Mission>(`/api/missions/${id}`);
  } catch {
    return null;
  }
}

// DELETE /api/missions/:id — off-chain cleanup only. On-chain mission untouched.
export async function deleteMission(id: string): Promise<void> {
  await api(`/api/missions/${id}`, { method: "DELETE" });
}

// POST /api/missions/:id/release — call AFTER the on-chain release tx confirms.
// Updates the off-chain mirror to status "paid" + records the tx hash.
export async function recordRelease(id: string, txHash: string): Promise<void> {
  await api(`/api/missions/${id}/release`, {
    method: "POST",
    body: JSON.stringify({ txHash }),
  });
}

export interface MissionReport {
  missionId: string;
  body: string;
  reportHash: string;
  createdAt: string;
}

// GET /api/missions/:id/report
export async function getMissionReport(id: string): Promise<MissionReport | null> {
  try {
    return await api<MissionReport>(`/api/missions/${id}/report`);
  } catch {
    return null;
  }
}

export interface ActivityRow {
  missionId: string;
  timestamp: number;
  kind: string;
  payload: string;
  txHash?: string;
}

// GET /api/missions/:id/activity
export async function getMissionActivity(id: string): Promise<ActivityRow[]> {
  try {
    return await api<ActivityRow[]>(`/api/missions/${id}/activity`);
  } catch {
    return [];
  }
}

// POST /api/missions
export async function createMission(input: CreateMissionInput): Promise<Mission> {
  const id = `m_${Date.now()}`;
  return api<Mission>("/api/missions", {
    method: "POST",
    body: JSON.stringify({
      id,
      title: input.title.trim() || "Untitled Mission",
      description: input.description.trim(),
      requirements: input.successCriteria
        .split(/\n|;|\r/)
        .map((s) => s.trim())
        .filter(Boolean),
      rewardUsd: Number(input.rewardUsd) || 0,
      x402ClaimPriceUsd: Number(input.x402ClaimPriceUsd) || 0,
      workerType: input.workerType,
      deadline: input.deadline,
    }),
  });
}

// Triggers the agent to scan and claim open missions.
export async function claimMission(
  id: string,
  _claimedBy: string = "Agent",
): Promise<Mission | null> {
  await api("/api/agent/scan", { method: "POST" });
  // Give agent a moment to claim, then return updated mission
  await new Promise((r) => setTimeout(r, 3000));
  return getMissionById(id);
}

// Submission is handled by the agent automatically after claim.
export async function submitDeliverable(
  id: string,
  _payload: SubmitDeliverablePayload,
): Promise<Mission | null> {
  return getMissionById(id);
}
