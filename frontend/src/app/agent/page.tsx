import { getAgentSnapshot } from "@/lib/api/agent";
import { getMissions } from "@/lib/api/missions";
import { AgentDashboardClient } from "./AgentDashboardClient";

export default async function AgentDashboardPage() {
  const [snapshot, missions] = await Promise.all([
    getAgentSnapshot(),
    getMissions(),
  ]);
  return (
    <AgentDashboardClient
      initialSnapshot={snapshot}
      initialMissions={missions}
    />
  );
}
