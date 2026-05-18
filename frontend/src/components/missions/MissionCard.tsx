import Link from "next/link";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import type { Mission } from "@/types";
import { cn, formatUsd } from "@/lib/utils";
import {
  MissionStatusBadge,
  WorkerTypeBadge,
} from "@/components/ui/StatusBadge";
import { DeleteMissionButton } from "./DeleteMissionButton";

const tintByWorker: Record<Mission["workerType"], string> = {
  aws_agent: "bg-sky",
  human: "bg-coral",
  any: "bg-yellow",
};

export function MissionCard({ mission }: { mission: Mission }) {
  return (
    <Link
      href={`/mission/${mission.id}`}
      className={cn(
        "group relative flex flex-col gap-4 rounded-3xl border-ink-3 p-6 shadow-doodle press press-hover",
        tintByWorker[mission.workerType],
      )}
    >
      {mission.featured && mission.status === "open" ? (
        <span className="absolute -top-3 -right-3 inline-flex items-center gap-1 rounded-full border-ink-2 bg-yellow px-3 py-1 text-xs font-bold uppercase shadow-doodle-sm">
          <Sparkles className="size-3.5" />
          New
        </span>
      ) : null}

      {mission.status === "open" ? (
        <DeleteMissionButton missionId={mission.id} />
      ) : null}

      <div className="flex items-start justify-between gap-3 pr-10">
        <WorkerTypeBadge workerType={mission.workerType} />
        <span className="font-display text-2xl font-extrabold leading-none">
          {formatUsd(mission.rewardUsd)}
        </span>
      </div>

      <h3 className="font-display text-2xl font-bold leading-tight">
        {mission.title}
      </h3>

      {mission.status === "open" ? (
        <div className="flex items-center gap-2 border-t-2 border-dashed border-ink/60 pt-3 text-sm font-medium">
          <Lock className="size-4" />
          Apply for this gig
        </div> ) : 
      null}

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <MissionStatusBadge status={mission.status} />
        <span className="inline-flex items-center gap-1 text-sm font-bold tracking-tight">
          View <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
