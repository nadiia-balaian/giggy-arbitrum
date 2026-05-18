import { Check } from "lucide-react";
import type { Mission, MissionStatus } from "@/types";
import { cn } from "@/lib/utils";

type StepKey = "created" | "claimed" | "submitted" | "approval";

type Step = {
  key: StepKey;
  label: string;
  /** Optional sub-line shown beneath the label. */
  detail?: string;
  state: "done" | "current" | "pending";
};

const STATUS_ORDER: MissionStatus[] = [
  "open",
  "claimed",
  "submitted",
  "reviewing",
  "approved",
  "paid",
];

function fmtDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date}, ${time}`;
}

export function LifecycleTimeline({ mission }: { mission: Mission }) {
  const idx = STATUS_ORDER.indexOf(mission.status);

  const stepState = (need: MissionStatus, current: MissionStatus): Step["state"] => {
    const needIdx = STATUS_ORDER.indexOf(need);
    const curIdx = STATUS_ORDER.indexOf(current);
    if (curIdx > needIdx) return "done";
    if (curIdx === needIdx) return "current";
    return "pending";
  };

  const steps: Step[] = [
    {
      key: "created",
      label: "Mission Created",
      detail: fmtDateTime(mission.createdAt),
      state:
        idx >= 0
          ? idx === 0
            ? "current"
            : "done"
          : "pending",
    },
    {
      key: "claimed",
      label: "Agent Claimed",
      detail:
        mission.claimedBy && mission.claimedAt
          ? `${fmtDateTime(mission.claimedAt)} · ${mission.claimedBy}`
          : undefined,
      state: stepState("claimed", mission.status),
    },
    {
      key: "submitted",
      label: "Work Submitted",
      detail: mission.submittedAt
        ? `${fmtDateTime(mission.submittedAt)}${mission.deliverableUrl ? ` · ${mission.deliverableUrl}` : ""}`
        : undefined,
      state: stepState("submitted", mission.status),
    },
    {
      key: "approval",
      label: "Approval",
      detail:
        mission.status === "submitted" || mission.status === "reviewing"
          ? "Awaiting verification"
          : mission.status === "approved" || mission.status === "paid"
            ? "Verified"
            : undefined,
      state: stepState("approved", mission.status),
    },
  ];

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => (
        <li key={step.key} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full border-ink-3 shadow-doodle-sm",
                step.state === "done" && "bg-mint",
                step.state === "current" && "bg-yellow",
                step.state === "pending" && "bg-white",
              )}
            >
              {step.state === "done" ? (
                <Check className="size-4 stroke-[3]" />
              ) : step.state === "current" ? (
                <span className="size-2.5 rounded-full bg-ink" />
              ) : null}
            </span>
            {i < steps.length - 1 ? (
              <span
                className={cn(
                  "mt-1 mb-1 w-1 flex-1 rounded-full",
                  step.state === "done" ? "bg-ink" : "bg-ink/20",
                )}
              />
            ) : null}
          </div>
          <div className="pb-6 pt-0.5">
            <p className="font-display text-lg font-bold leading-tight">{step.label}</p>
            {step.detail ? (
              <p className="text-xs text-ink/70">{step.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
