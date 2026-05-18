import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getMissionActivity,
  getMissionById,
  getMissionReport,
} from "@/lib/api/missions";
import { ReceiptCard, type ReceiptProof } from "@/components/receipts/ReceiptCard";
import { ShareButton } from "./ShareButton";

const ACTIVITY_TX_KIND = {
  pickup: "chain_pickup",
  x402: "x402_payment",
  submit: "chain_submit",
} as const;

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mission = await getMissionById(id);
  if (!mission) notFound();

  const [activity, report] = await Promise.all([
    getMissionActivity(id),
    getMissionReport(id),
  ]);

  const txByKind = (kind: string) =>
    activity.find((a) => a.kind === kind && a.txHash)?.txHash;

  const proof: ReceiptProof = {
    mission,
    pickupTxHash: txByKind(ACTIVITY_TX_KIND.pickup) ?? mission.x402TxHash,
    x402TxHash: txByKind(ACTIVITY_TX_KIND.x402),
    submitTxHash: txByKind(ACTIVITY_TX_KIND.submit),
    releaseTxHash: mission.releaseTxHash,
    reportHash: report?.reportHash ?? mission.reportHash,
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8">
      <div className="self-start">
        <Link
          href="/receipt"
          className="inline-flex items-center gap-2 rounded-full border-ink-2 bg-white px-4 py-1.5 text-sm font-semibold shadow-doodle-sm press press-hover"
        >
          <ArrowLeft className="size-4" />
          All receipts
        </Link>
      </div>

      <header className="text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Proof of Work &amp; Escrow Release
        </h1>
        <p className="mt-1 text-sm text-ink/70">
          On-chain proof for mission{" "}
          <span className="font-mono">{mission.id}</span>.
        </p>
      </header>

      <ReceiptCard proof={proof} />

      <ShareButton missionId={mission.id} />
    </div>
  );
}
