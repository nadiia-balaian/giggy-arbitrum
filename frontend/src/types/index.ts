export type MissionStatus =
  | "open"
  | "claimed"
  | "submitted"
  | "reviewing"
  | "approved"
  | "paid";

export type WorkerType = "aws_agent" | "human" | "any";

export type Mission = {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  rewardUsd: number;
  x402ClaimPriceUsd: number;
  workerType: WorkerType;
  status: MissionStatus;
  /** ISO date string (yyyy-mm-dd or full ISO). */
  deadline: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Worker / agent identifier once claimed. */
  claimedBy?: string;
  /** Timestamp when claimed. */
  claimedAt?: string;
  /** Timestamp when work was submitted. */
  submittedAt?: string;
  /** Filename / URL of submitted deliverable. */
  deliverableUrl?: string;
  /** Optional admin note shown on detail page. */
  adminNote?: string;
  /** Marks a card as featured on the market. */
  featured?: boolean;
  /** On-chain pickup tx (recorded when the agent claims). */
  x402TxHash?: string;
  /** Keccak256 of the agent's deliverable, committed on submitProof. */
  reportHash?: string;
  /** Keccak256 of the mission spec, committed at createTask. */
  specHash?: string;
  /** Release tx hash — escrow released USDC to the agent. */
  releaseTxHash?: string;
  /** ISO timestamp the release tx was recorded. */
  paidAt?: string;
};

export type AgentTrigger =
  | "High Reward Tier"
  | "Negative Spread"
  | "Low Complexity Opt"
  | "Zero Cost Opportunity"
  | "High Risk/Cost ratio";

export type AgentClaimStatus =
  | "CLAIMED"
  | "IGNORED"
  | "PROCESSING"
  | "COMPLETED";

export type AgentDecision = {
  id: string;
  missionId: string;
  missionTitle: string;
  reward: number;
  x402Cost: number;
  /** Reward minus x402 cost minus mock complexity factor. */
  expectedValue: number;
  trigger: AgentTrigger;
  claimStatus: AgentClaimStatus;
};

export type AgentSnapshot = {
  online: boolean;
  /** Seconds since last cron scan. */
  lastScanSecondsAgo: number;
  missionsScanned: number;
  missionsClaimed: number;
  expectedValueUsd: number;
  /** EVM address of the CDP-managed agent wallet. */
  agentAddress?: string;
  decisions: AgentDecision[];
};

export type CreateMissionInput = {
  title: string;
  description: string;
  rewardUsd: number;
  x402ClaimPriceUsd: number;
  workerType: WorkerType;
  /** yyyy-mm-dd. */
  deadline: string;
  successCriteria: string;
};

export type SubmitDeliverablePayload = {
  deliverableUrl: string;
  notes?: string;
};

