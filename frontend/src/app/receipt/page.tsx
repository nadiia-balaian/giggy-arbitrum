import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getMissions } from "@/lib/api/missions";
import { Badge } from "@/components/ui/StatusBadge";
import { formatUsd } from "@/lib/utils";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ReceiptsIndexPage() {
  const missions = await getMissions();
  const paid = missions.filter((m) => m.status === "paid");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
          Receipts
        </h1>
        <p className="text-base text-ink/70">
          Proof of work and escrow release for every paid mission.
        </p>
      </header>

      {paid.length === 0 ? (
        <section className="rounded-3xl border-ink-3 bg-white p-10 text-center shadow-doodle">
          <p className="font-display text-2xl font-bold">No receipts yet</p>
          <p className="mt-2 text-sm text-ink/70">
            Receipts appear here once a mission&apos;s escrow is released to
            the agent.
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {paid.map((m) => (
            <Link
              key={m.id}
              href={`/receipt/${m.id}`}
              className="group flex flex-col gap-4 rounded-3xl border-ink-3 bg-yellow p-6 shadow-doodle press press-hover"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge tone="mint">Released</Badge>
                <span className="font-display text-2xl font-extrabold leading-none">
                  {formatUsd(m.rewardUsd)}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold leading-tight">
                {m.title}
              </h3>

              <dl className="mt-auto flex flex-col gap-1.5 border-t-2 border-dashed border-ink/40 pt-3 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="font-bold uppercase tracking-wider text-ink/60">
                    Mission
                  </dt>
                  <dd className="font-mono">{m.id}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="font-bold uppercase tracking-wider text-ink/60">
                    Paid
                  </dt>
                  <dd>{fmtDate(m.paidAt)}</dd>
                </div>
                {m.releaseTxHash ? (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-bold uppercase tracking-wider text-ink/60">
                      Release tx
                    </dt>
                    <dd className="font-mono">
                      {m.releaseTxHash.slice(0, 10)}…
                    </dd>
                  </div>
                ) : null}
              </dl>

              <span className="inline-flex items-center gap-1 self-end text-sm font-bold tracking-tight">
                View proof{" "}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
