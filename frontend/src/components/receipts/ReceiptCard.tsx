import { ExternalLink } from "lucide-react";
import type { Mission } from "@/types";
import { Badge } from "@/components/ui/StatusBadge";
import { formatUsd } from "@/lib/utils";

const ARBISCAN_TX = "https://sepolia.arbiscan.io/tx/";
const ARBISCAN_ADDR = "https://sepolia.arbiscan.io/address/";

export type ReceiptProof = {
  mission: Mission;
  pickupTxHash?: string;
  x402TxHash?: string;
  submitTxHash?: string;
  releaseTxHash?: string;
  reportHash?: string;
};

function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function Dotted() {
  return <div className="my-4 border-t-2 border-dashed border-ink/60" />;
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-baseline gap-3">
      <span className="text-[0.7rem] font-bold uppercase tracking-wider text-ink/70">
        {label}
      </span>
      <span
        className={
          mono
            ? "font-mono text-sm break-all"
            : "text-sm font-medium leading-snug"
        }
      >
        {value}
      </span>
    </div>
  );
}

function TxLink({ hash, label }: { hash?: string; label: string }) {
  if (!hash) {
    return (
      <Row
        label={label}
        value={<span className="text-ink/50">not recorded</span>}
      />
    );
  }
  return (
    <Row
      label={label}
      value={
        <a
          href={`${ARBISCAN_TX}${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-sm break-all underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          {hash}
          <ExternalLink className="size-3 shrink-0" />
        </a>
      }
    />
  );
}

export function ReceiptCard({ proof }: { proof: ReceiptProof }) {
  const { mission } = proof;
  const released = Boolean(proof.releaseTxHash);

  return (
    <article className="relative mx-auto w-full max-w-2xl rounded-3xl border-ink-3 bg-yellow p-7 shadow-doodle-lg">
      <div className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full border-ink-2 bg-cream px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider shadow-doodle-sm">
        Receipt · Mission {mission.id}
      </div>

      <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight">
        {released ? "Escrow Released" : "Awaiting Release"}
      </h2>
      <p className="mt-1 text-sm font-medium">{mission.title}</p>

      <Dotted />

      <div className="flex flex-col gap-3">
        <Row label="Mission ID" value={mission.id} mono />
        <Row label="Created" value={fmtDateTime(mission.createdAt)} />
        <Row
          label="Agent"
          value={
            mission.claimedBy ? (
              <a
                href={`${ARBISCAN_ADDR}${mission.claimedBy}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm break-all underline decoration-dotted underline-offset-2 hover:decoration-solid"
              >
                {mission.claimedBy}
              </a>
            ) : (
              <span className="text-ink/50">—</span>
            )
          }
        />
        <Row label="Claimed" value={fmtDateTime(mission.claimedAt)} />
        <Row label="Submitted" value={fmtDateTime(mission.submittedAt)} />
        <Row label="Paid" value={fmtDateTime(mission.paidAt)} />
      </div>

      <Dotted />

      <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-wider text-ink/70">
        On-chain proof
      </p>
      <div className="flex flex-col gap-3">
        <TxLink hash={proof.pickupTxHash} label="Pickup tx" />
        <TxLink hash={proof.x402TxHash} label="x402 payment" />
        <TxLink hash={proof.submitTxHash} label="Submit-proof tx" />
        <TxLink hash={proof.releaseTxHash} label="Release tx" />
      </div>

      <Dotted />

      <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-wider text-ink/70">
        Commitments
      </p>
      <div className="flex flex-col gap-3">
        <Row
          label="Spec hash"
          value={mission.specHash ?? <span className="text-ink/50">—</span>}
          mono
        />
        <Row
          label="Report hash"
          value={
            proof.reportHash ?? mission.reportHash ?? (
              <span className="text-ink/50">—</span>
            )
          }
          mono
        />
      </div>

      <Dotted />

      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-xl font-bold">Total Payout</span>
        <span className="inline-flex items-center gap-2">
          <span className="font-display text-3xl font-extrabold">
            {formatUsd(mission.rewardUsd)}
          </span>
          <Badge tone={released ? "mint" : "white"}>
            {released ? "Confirmed" : "Pending"}
          </Badge>
        </span>
      </div>
    </article>
  );
}
