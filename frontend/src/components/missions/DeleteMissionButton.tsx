"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteMission } from "@/lib/api/missions";
import { Dialog } from "@/components/ui/Dialog";

export function DeleteMissionButton({ missionId }: { missionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    // Stop the parent <Link> from navigating
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setConfirmOpen(false);
    setPending(true);
    try {
      await deleteMission(missionId);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label="Delete mission"
        title="Delete mission"
        className="absolute top-4 right-3 inline-flex size-8 items-center justify-center rounded-full border-ink-2 bg-white shadow-doodle-sm transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Delete this mission?"
        message="This removes the off-chain record only — the on-chain task is unaffected."
        confirmLabel="Delete"
        variant="danger"
      />

      <Dialog
        open={errorMessage !== null}
        onClose={() => setErrorMessage(null)}
        title="Delete failed"
        message={errorMessage ?? ""}
        variant="danger"
      />
    </>
  );
}
