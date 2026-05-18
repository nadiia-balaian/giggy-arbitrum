import * as React from "react";
import { cn } from "@/lib/utils";
import type {
  AgentClaimStatus,
  MissionStatus,
  WorkerType,
} from "@/types";

type Tone =
  | "sky"
  | "coral"
  | "yellow"
  | "mint"
  | "ink"
  | "white"
  | "muted";

const toneClass: Record<Tone, string> = {
  sky: "bg-sky text-ink",
  coral: "bg-coral text-ink",
  yellow: "bg-yellow text-ink",
  mint: "bg-mint text-ink",
  ink: "bg-ink text-cream",
  white: "bg-white text-ink",
  muted: "bg-muted text-ink",
};

const base =
  "inline-flex items-center gap-1.5 rounded-full border-ink-2 px-3 py-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap";

export function Badge({
  tone = "white",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn(base, toneClass[tone], className)}>{children}</span>;
}

const missionStatusLabel: Record<MissionStatus, string> = {
  open: "Status: Open",
  claimed: "Status: Claimed",
  submitted: "Status: Submitted",
  reviewing: "Status: Reviewing",
  approved: "Status: Approved",
  paid: "Status: Paid",
};

const missionStatusTone: Record<MissionStatus, Tone> = {
  open: "white",
  claimed: "coral",
  submitted: "yellow",
  reviewing: "yellow",
  approved: "mint",
  paid: "mint",
};

export function MissionStatusBadge({
  status,
  shortLabel,
  className,
}: {
  status: MissionStatus;
  /** When true uses "Open" instead of "Status: Open". */
  shortLabel?: boolean;
  className?: string;
}) {
  const label = shortLabel
    ? missionStatusLabel[status].replace("Status: ", "")
    : missionStatusLabel[status];
  return (
    <Badge tone={missionStatusTone[status]} className={className}>
      {label}
    </Badge>
  );
}

const workerTypeLabel: Record<WorkerType, string> = {
  aws_agent: "AWS Agent Required",
  human: "Human Required",
  any: "Any Worker",
};

const workerTypeTone: Record<WorkerType, Tone> = {
  aws_agent: "white",
  human: "white",
  any: "white",
};

export function WorkerTypeBadge({
  workerType,
  className,
}: {
  workerType: WorkerType;
  className?: string;
}) {
  return (
    <Badge tone={workerTypeTone[workerType]} className={className}>
      {workerTypeLabel[workerType]}
    </Badge>
  );
}

const claimStatusTone: Record<AgentClaimStatus, Tone> = {
  CLAIMED: "coral",
  IGNORED: "muted",
  PROCESSING: "yellow",
  COMPLETED: "mint",
};

export function ClaimStatusBadge({
  status,
  className,
}: {
  status: AgentClaimStatus;
  className?: string;
}) {
  return (
    <Badge tone={claimStatusTone[status]} className={className}>
      {status}
    </Badge>
  );
}
