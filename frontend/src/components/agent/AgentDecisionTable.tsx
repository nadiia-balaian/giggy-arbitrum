import type { AgentDecision } from "@/types";
import { cn, formatUsd, formatUsdSigned } from "@/lib/utils";
import { ClaimStatusBadge } from "@/components/ui/StatusBadge";

export function AgentDecisionTable({
  decisions,
  className,
}: {
  decisions: AgentDecision[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border-ink-3 bg-white shadow-doodle",
        className,
      )}
    >
      <div className="hidden grid-cols-[2fr_1.4fr_1fr_1.4fr_1fr] gap-4 border-b-2 border-ink/40 bg-cream px-6 py-3 text-[0.7rem] font-bold uppercase tracking-wider md:grid">
        <span>Mission Title</span>
        <span>Reward vs x402 Cost</span>
        <span>Calculated EV</span>
        <span>Logic Trigger</span>
        <span className="text-right">Claim Status</span>
      </div>
      <ul className="divide-y-2 divide-ink/15">
        {decisions.map((d) => (
          <li
            key={d.id}
            className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-[2fr_1.4fr_1fr_1.4fr_1fr] md:items-center md:gap-4"
          >
            <span className="font-semibold tracking-tight">{d.missionTitle}</span>
            <span className="text-sm tabular-nums text-ink/80">
              {formatUsd(d.reward)} / {d.x402Cost} x402
            </span>
            <span
              className={cn(
                "font-mono text-sm font-bold tabular-nums",
                d.expectedValue > 0
                  ? "text-emerald-700"
                  : d.expectedValue < 0
                    ? "text-rose-700"
                    : "text-ink/70",
              )}
            >
              {formatUsdSigned(d.expectedValue)}
            </span>
            <span className="text-sm">{d.trigger}</span>
            <span className="md:justify-self-end">
              <ClaimStatusBadge status={d.claimStatus} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
