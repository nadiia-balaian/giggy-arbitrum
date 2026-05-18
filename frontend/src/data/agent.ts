import type { AgentDecision, AgentSnapshot } from "@/types";

/**
 * Seed decisions for the Agent Dashboard.
 *
 * TODO Backend: replace with `GET /api/agent/snapshot` once the backend is live.
 * In production these rows come from CloudWatch logs of the EventBridge cron
 * agent's last run.
 */
export const seedDecisions: AgentDecision[] = [
  {
    id: "d_001",
    missionId: "m_001",
    missionTitle: "Scrape E-commerce Pricing",
    reward: 150,
    x402Cost: 50,
    expectedValue: 100,
    trigger: "High Reward Tier",
    claimStatus: "CLAIMED",
  },
  {
    id: "d_002",
    missionId: "m_004",
    missionTitle: "Blog Post Generation",
    reward: 15,
    x402Cost: 30,
    expectedValue: -15,
    trigger: "Negative Spread",
    claimStatus: "IGNORED",
  },
  {
    id: "d_003",
    missionId: "m_005",
    missionTitle: "Image Classification (1k)",
    reward: 45,
    x402Cost: 5,
    expectedValue: 40,
    trigger: "Low Complexity Opt",
    claimStatus: "PROCESSING",
  },
  {
    id: "d_004",
    missionId: "m_002",
    missionTitle: "UI Feedback Loop",
    reward: 200,
    x402Cost: 0,
    expectedValue: 200,
    trigger: "Zero Cost Opportunity",
    claimStatus: "COMPLETED",
  },
  {
    id: "d_005",
    missionId: "m_006",
    missionTitle: "Legacy Data Migration",
    reward: 5,
    x402Cost: 50,
    expectedValue: -45,
    trigger: "High Risk/Cost ratio",
    claimStatus: "IGNORED",
  },
];

export const seedSnapshot: AgentSnapshot = {
  online: true,
  lastScanSecondsAgo: 42,
  missionsScanned: 12842,
  missionsClaimed: 84,
  expectedValueUsd: 1240,
  decisions: seedDecisions,
};
