"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Brain,
  CheckCircle2,
  Coins,
  ExternalLink,
  FileCheck,
  Hammer,
  Hourglass,
  Lock,
  Newspaper,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { getMissionActivity, type ActivityRow } from "@/lib/api/missions";
import { cn } from "@/lib/utils";

const TERMINAL_STATUSES = new Set(["paid", "refunded"]);

type KindMeta = {
  icon: LucideIcon;
  label: string;
  /** Visual emphasis for the row. */
  tone: "default" | "chain" | "x402" | "error";
};

const KIND_META: Record<string, KindMeta> = {
  pickup: { icon: Bot, label: "Agent claimed mission", tone: "default" },
  chain_pickup: {
    icon: Lock,
    label: "On-chain pickup confirmed",
    tone: "chain",
  },
  thinking: { icon: Brain, label: "Planning research", tone: "default" },
  plan: { icon: Brain, label: "Research plan ready", tone: "default" },
  data_fetch: { icon: Hourglass, label: "Calling x402 API", tone: "default" },
  x402_payment: {
    icon: Coins,
    label: "x402 micropayment settled",
    tone: "x402",
  },
  data_received: {
    icon: Newspaper,
    label: "Received premium articles",
    tone: "default",
  },
  data_fetch_failed: {
    icon: XCircle,
    label: "Data fetch failed",
    tone: "error",
  },
  writing: { icon: Hammer, label: "Generating report with Claude", tone: "default" },
  report_ready: { icon: FileCheck, label: "Report generated", tone: "default" },
  chain_submit: {
    icon: Lock,
    label: "Proof submitted on-chain",
    tone: "chain",
  },
  submitted: {
    icon: Sparkles,
    label: "Mission ready for review",
    tone: "default",
  },
};

function shorten(hash: string): string {
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function MissionActivity({
  missionId,
  status,
}: {
  missionId: string;
  status: string;
}) {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const fresh = await getMissionActivity(missionId);
        if (mounted) setRows(fresh);
      } catch {
        // ignore transient errors
      }
    }

    refresh();
    if (TERMINAL_STATUSES.has(status)) return;

    const id = setInterval(refresh, 2500);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [missionId, status]);

  return (
    <section className="select-text rounded-3xl border-ink-3 bg-white p-7 shadow-doodle">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="size-5" />
          <h2 className="font-display text-2xl font-bold">Live Agent Activity</h2>
        </div>
        {!TERMINAL_STATUSES.has(status) && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/60 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-ink" />
            </span>
            Live
          </span>
        )}
      </div>

      {rows === null ? (
        <div className="mt-6 text-sm text-ink/60">Loading activity…</div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-ink/30 bg-cream/50 px-4 py-6 text-center text-sm text-ink/60">
          Agent hasn&apos;t picked this up yet. Waiting for activity…
        </div>
      ) : (
        <ol className="mt-5 flex flex-col gap-2">
          {rows.map((row, i) => {
            const meta = KIND_META[row.kind] ?? {
              icon: CheckCircle2,
              label: row.kind,
              tone: "default" as const,
            };
            const Icon = meta.icon;
            const isLast = i === rows.length - 1;
            const showSpinner =
              !TERMINAL_STATUSES.has(status) && isLast && status !== "submitted";

            return (
              <li
                key={`${row.timestamp}-${row.kind}`}
                className={cn(
                  "flex items-start gap-3 rounded-2xl px-4 py-3 transition",
                  meta.tone === "x402" &&
                    "border-2 border-ink-3 bg-yellow shadow-doodle-sm",
                  meta.tone === "chain" && "bg-sky/40",
                  meta.tone === "error" && "bg-red-100",
                  meta.tone === "default" && "bg-cream/60",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-ink-2 bg-white",
                    meta.tone === "x402" && "size-10 border-ink-3",
                    showSpinner && "animate-pulse",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      meta.tone === "x402" && "size-5",
                    )}
                    strokeWidth={meta.tone === "x402" ? 2.5 : 2}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "font-display font-bold tracking-tight",
                        meta.tone === "x402" ? "text-lg" : "text-sm",
                      )}
                    >
                      {meta.tone === "x402" ? "💸 " : ""}
                      {meta.label}
                    </span>
                    <time className="font-mono text-[0.7rem] tabular-nums text-ink/50">
                      {fmtTime(row.timestamp)}
                    </time>
                  </div>
                  {row.payload ? (
                    <p
                      className={cn(
                        "mt-0.5 break-words text-sm leading-relaxed text-ink/75",
                        meta.tone === "x402" && "text-ink/85",
                      )}
                    >
                      {row.payload}
                    </p>
                  ) : null}
                  {row.txHash ? (
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${row.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "mt-2 inline-flex items-center gap-1.5 rounded-full border-ink-2 bg-white px-3 py-1 font-mono text-xs press press-hover",
                        meta.tone === "x402" && "border-ink-3 font-bold",
                      )}
                    >
                      {shorten(row.txHash)}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
