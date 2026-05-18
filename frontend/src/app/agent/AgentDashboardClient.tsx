"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, ExternalLink, Sparkles, Zap } from "lucide-react";
import type { AgentSnapshot, Mission } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge, MissionStatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/agent/StatCard";
import { getAgentSnapshot, runAgentScan } from "@/lib/api/agent";
import { getMissions } from "@/lib/api/missions";
import { formatUsd } from "@/lib/utils";

type Banner = { tone: "mint" | "yellow"; text: string } | null;

const HISTORY_STATUSES = new Set<Mission["status"]>([
  "claimed",
  "submitted",
  "reviewing",
  "approved",
  "paid",
]);

function fmtSeconds(s: number): string {
  if (s < 0) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function fmtRelativeIso(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  return fmtSeconds(Math.floor(ms / 1000));
}

export function AgentDashboardClient({
  initialSnapshot,
  initialMissions,
}: {
  initialSnapshot: AgentSnapshot;
  initialMissions: Mission[];
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [missions, setMissions] = useState(initialMissions);
  const [scanning, setScanning] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  // Auto-refresh every 5s so post-claim / post-submit / post-paid state
  // appears without manual page refresh.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [s, m] = await Promise.all([getAgentSnapshot(), getMissions()]);
        setSnapshot(s);
        setMissions(m);
      } catch {
        // ignore transient errors
      }
    }, 5000);
    return () => clearInterval(id);
  }, []);

  async function onScan() {
    if (scanning) return;
    setScanning(true);
    setBanner(null);
    try {
      const { snapshot: nextSnap, claimedMission } = await runAgentScan();
      setSnapshot(nextSnap);
      setMissions(await getMissions());
      setBanner(
        claimedMission
          ? { tone: "mint", text: `Agent claimed: ${claimedMission.title}` }
          : { tone: "yellow", text: "Scan complete — no open missions to claim." },
      );
    } finally {
      setScanning(false);
      setTimeout(() => setBanner(null), 5000);
    }
  }

  // Mission history for this agent — anything past `open`, newest first.
  const history = missions
    .filter((m) => HISTORY_STATUSES.has(m.status))
    .sort((a, b) =>
      (b.claimedAt ?? b.createdAt).localeCompare(a.claimedAt ?? a.createdAt),
    );

  const totalEarned = missions
    .filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + Number(m.rewardUsd ?? 0), 0);

  const inFlight = missions.filter(
    (m) => m.status === "claimed" || m.status === "submitted" || m.status === "reviewing",
  ).length;

  const baseScanAddr = snapshot.agentAddress
    ? `https://sepolia.arbiscan.io/address/${snapshot.agentAddress}`
    : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Agent Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink/70">
            AWS Bedrock + EventBridge cron · live every 5s
          </p>
          {snapshot.agentAddress ? (
            <a
              href={baseScanAddr ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border-ink-2 bg-white px-3 py-1 font-mono text-xs shadow-doodle-sm press press-hover"
            >
              {snapshot.agentAddress}
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={snapshot.online ? "mint" : "muted"}>
            <Bot className="size-3.5" />
            {snapshot.online ? "Agent Online" : "Agent Offline"}
          </Badge>
          {/* <Button onClick={onScan} disabled={scanning} variant="primary" size="md">
            <Zap className="size-4 stroke-[3]" />
            {scanning ? "Scanning..." : "Run Agent Scan"}
          </Button> */}
        </div>
      </header>

      {banner ? (
        <div
          className={`flex items-center gap-2 rounded-2xl border-ink-3 px-4 py-3 shadow-doodle-sm ${
            banner.tone === "mint" ? "bg-mint" : "bg-yellow"
          }`}
        >
          <Sparkles className="size-4" />
          <span className="text-sm font-semibold">{banner.text}</span>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          tone="sky"
          label="Last Scan"
          value={fmtSeconds(snapshot.lastScanSecondsAgo)}
        />
        <StatCard
          tone="coral"
          label="In Flight"
          value={inFlight.toLocaleString()}
        />
        <StatCard
          tone="yellow"
          label="Missions Claimed"
          value={snapshot.missionsClaimed.toLocaleString()}
        />
        <StatCard
          tone="mint"
          label="Total Earned"
          value={formatUsd(totalEarned)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold">Agent History</h2>
        {history.length === 0 ? (
          <div className="rounded-3xl border-ink-3 bg-cream p-8 text-center text-sm text-ink/60 shadow-doodle">
            No missions handled yet. Post one from the home page, then click
            <span className="font-semibold"> Run Agent Scan</span>.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border-ink-3 bg-white shadow-doodle">
            <div className="hidden grid-cols-[2.4fr_1fr_1.1fr_1fr_auto] gap-4 border-b-2 border-ink/40 bg-cream px-6 py-3 text-[0.7rem] font-bold uppercase tracking-wider md:grid">
              <span>Mission</span>
              <span>Bounty</span>
              <span>Status</span>
              <span>Last Update</span>
              <span></span>
            </div>
            <ul className="divide-y-2 divide-ink/15">
              {history.map((m) => {
                const lastUpdate =
                  m.status === "paid"
                    ? fmtRelativeIso(m.submittedAt ?? m.claimedAt)
                    : m.status === "submitted"
                      ? fmtRelativeIso(m.submittedAt)
                      : fmtRelativeIso(m.claimedAt ?? m.createdAt);
                return (
                  <li
                    key={m.id}
                    className="grid grid-cols-1 gap-2 px-6 py-4 md:grid-cols-[2.4fr_1fr_1.1fr_1fr_auto] md:items-center md:gap-4"
                  >
                    <span className="truncate font-semibold tracking-tight">
                      {m.title}
                    </span>
                    <span className="font-mono text-sm tabular-nums">
                      {formatUsd(Number(m.rewardUsd ?? 0))}
                    </span>
                    <span>
                      <MissionStatusBadge status={m.status} />
                    </span>
                    <span className="text-sm text-ink/70">{lastUpdate}</span>
                    <Link
                      href={`/mission/${m.id}`}
                      className="inline-flex items-center gap-1 rounded-full border-ink-2 bg-white px-3 py-1 text-xs font-bold shadow-doodle-sm press press-hover md:justify-self-end"
                    >
                      View
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
