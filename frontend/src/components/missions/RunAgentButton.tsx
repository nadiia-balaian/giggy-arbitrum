"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { api } from "@/lib/api/client";

// Triggers POST /api/agent/scan, then polls the server component every few
// seconds so status changes (open → claimed → submitted) appear without the
// user manually refreshing. Useful for live demos without enabling the cron.
export function RunAgentButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onClick() {
    if (pending) return;
    setPending(true);

    try {
      await api("/api/agent/scan", { method: "POST" });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setPending(false);
      return;
    }

    // Poll for ~90s, refreshing every 3s so the mission list reflects the
    // agent's progress. Long enough for pickup → Bedrock → submit.
    let elapsed = 0;
    const tick = setInterval(() => {
      router.refresh();
      elapsed += 3000;
      if (elapsed >= 90_000) {
        clearInterval(tick);
        setPending(false);
      }
    }, 3000);
  }

  return (
    <>
      <Button
        onClick={onClick}
        disabled={pending}
        variant="ink"
        size="md"
        title="Trigger the agent to scan and claim the oldest open mission"
      >
        <Bot className="size-5" />
        {pending ? "Agent working…" : "Run Agent"}
      </Button>

      <Dialog
        open={errorMessage !== null}
        onClose={() => setErrorMessage(null)}
        title="Couldn't trigger the agent"
        message={errorMessage ?? ""}
        variant="danger"
      />
    </>
  );
}
