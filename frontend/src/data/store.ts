import type {
  AgentDecision,
  AgentSnapshot,
  Mission,
} from "@/types";
import { seedMissions } from "./missions";
import { seedDecisions, seedSnapshot } from "./agent";

/**
 * Demo-only in-memory store. Resets on every server restart.
 *
 * TODO Backend: delete this module entirely once the API services in
 * `src/lib/api/*` are wired to a real backend / database.
 */

type Store = {
  missions: Mission[];
  agent: AgentSnapshot;
};

declare global {
  var __giggyStore: Store | undefined;
}

function createStore(): Store {
  return {
    missions: seedMissions.map((m) => ({ ...m })),
    agent: {
      ...seedSnapshot,
      decisions: seedDecisions.map((d) => ({ ...d })),
    },
  };
}

export const store: Store = globalThis.__giggyStore ?? createStore();
if (!globalThis.__giggyStore) globalThis.__giggyStore = store;

export function nextMissionId(): string {
  const n = store.missions.length + 1;
  return `m_${String(n).padStart(3, "0")}`;
}

export function nextDecisionId(): string {
  const n = store.agent.decisions.length + 1;
  return `d_${String(n).padStart(3, "0")}`;
}

export function upsertMission(mission: Mission) {
  const idx = store.missions.findIndex((m) => m.id === mission.id);
  if (idx >= 0) store.missions[idx] = mission;
  else store.missions.unshift(mission);
}

export function upsertDecision(decision: AgentDecision) {
  store.agent.decisions = [
    decision,
    ...store.agent.decisions.filter((d) => d.id !== decision.id),
  ];
}
