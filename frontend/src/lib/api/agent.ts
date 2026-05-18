import type { AgentSnapshot, Mission } from "@/types";
import { api } from "./client";
import { getMissions } from "./missions";

// GET /api/agent/snapshot
export async function getAgentSnapshot(): Promise<AgentSnapshot> {
  return api<AgentSnapshot>("/api/agent/snapshot");
}

// POST /api/agent/scan — triggers the agent Lambda asynchronously.
// Returns immediately; frontend should poll mission status for updates.
export async function runAgentScan(): Promise<{
  snapshot: AgentSnapshot;
  claimedMission: Mission | null;
}> {
  await api("/api/agent/scan", { method: "POST" });

  // Wait a few seconds for the agent to claim a mission
  await new Promise((r) => setTimeout(r, 4000));

  const [snapshot, missions] = await Promise.all([
    getAgentSnapshot(),
    getMissions(),
  ]);

  // Find the most recently claimed mission
  const claimedMission =
    missions
      .filter((m) => m.status === "claimed" || m.status === "submitted")
      .sort((a, b) => (b.claimedAt ?? "").localeCompare(a.claimedAt ?? ""))[0] ?? null;

  return { snapshot, claimedMission };
}
