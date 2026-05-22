import { Bot, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { MissionReport } from "@/lib/api/missions";

const AUTOVERIFIER_ADDRESS =
  process.env.NEXT_PUBLIC_AUTOVERIFIER_ADDRESS ??
  "0xe970F43a3CDd2BB5cc1B903540E73Af8d4489498";

interface Props {
  report: MissionReport;
}

/**
 * AI verdict panel shown above the deliverable on the mission detail page.
 * Renders nothing if no attestation has landed yet (the verifier Lambda may
 * still be running, or the verdict step may have failed).
 */
export function AIVerdict({ report }: Props) {
  if (
    report.verdictPassed === undefined ||
    report.verdictScoreBps === undefined
  ) {
    return null;
  }

  const passed = report.verdictPassed;
  const scorePct = (report.verdictScoreBps / 100).toFixed(2);
  const reasoning = report.verdictReasoning ?? "(no reasoning recorded)";

  // Mint = pass, coral = fail. Matches the rest of the doodle palette.
  const bg = passed ? "bg-mint" : "bg-coral";
  const PillIcon = passed ? CheckCircle2 : XCircle;
  const pillLabel = passed ? "PASS" : "FAIL";
  const pillBg = passed ? "bg-white text-ink" : "bg-white text-ink";

  return (
    <section className={`rounded-3xl border-ink-3 p-6 shadow-doodle ${bg}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="size-5" />
          <h2 className="font-display text-2xl font-bold">AI Verdict</h2>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border-ink-2 px-3 py-1 text-sm font-bold shadow-doodle-sm ${pillBg}`}
          >
            <PillIcon className="size-4" />
            {pillLabel}
          </span>
          <span className="font-display text-3xl font-extrabold tracking-tight">
            {scorePct}%
          </span>
        </div>
      </div>

      <details className="group mt-4 select-text rounded-2xl border-ink-2 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Why this verdict
          <span className="ml-2 text-ink/50 group-open:hidden">(click to expand)</span>
        </summary>
        <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink/85">
          {reasoning}
        </p>
        {report.verdictReasoningHash ? (
          <p className="mt-3 break-all font-mono text-[10px] uppercase tracking-wide text-ink/60">
            keccak256(reasoning) · {report.verdictReasoningHash}
          </p>
        ) : null}
      </details>

      <div className="mt-4 flex flex-col gap-2 border-t border-dashed border-ink/30 pt-3 text-xs text-ink/75">
        <p>
          Recorded on Arbitrum Sepolia by the{" "}
          <a
            href={`https://sepolia.arbiscan.io/address/${AUTOVERIFIER_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono underline"
          >
            AutoVerifier
          </a>{" "}
          contract. The verdict is advisory — the poster decides whether to
          release or refund.
        </p>
        {report.verdictTxHash ? (
          <a
            href={`https://sepolia.arbiscan.io/tx/${report.verdictTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border-ink-2 bg-white px-3 py-1 font-mono text-xs press press-hover"
          >
            attest tx · {report.verdictTxHash.slice(0, 10)}…{report.verdictTxHash.slice(-8)}
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
