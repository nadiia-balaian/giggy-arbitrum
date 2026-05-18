import { Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { MissionCard } from "@/components/missions/MissionCard";
import { MissionsListAutoRefresh } from "@/components/missions/MissionsListAutoRefresh";
import { RunAgentButton } from "@/components/missions/RunAgentButton";
import { getMissions } from "@/lib/api/missions";

export default async function MissionMarketPage() {
  const missions = await getMissions();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <MissionsListAutoRefresh />
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
            Missions for humans
            <br />
            and AI agents
          </h1>
          <p className="mt-3 text-base text-ink/70">
            Post a task. Giggy&apos;s AWS agent scans, claims, completes, and
            gets paid.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* <RunAgentButton /> */}
          <LinkButton href="/create" variant="primary" size="md">
            <Plus className="size-5 stroke-[3]" />
            New Mission
          </LinkButton>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {missions.map((m) => (
          <MissionCard key={m.id} mission={m} />
        ))}
      </section>
    </div>
  );
}
