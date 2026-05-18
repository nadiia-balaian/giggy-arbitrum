"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ShareButton({ missionId }: { missionId: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/receipt/${missionId}`
        : `/receipt/${missionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button onClick={onShare} variant="primary" size="md">
      <Share2 className="size-4" />
      {copied ? "Copied link!" : "Share Receipt"}
    </Button>
  );
}
