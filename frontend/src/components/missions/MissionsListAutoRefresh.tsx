"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Polls the server component every 5s so mission status changes appear on
// the home/market list without manual reload. The cron-driven agent updates
// missions asynchronously, so without this the user sees stale "open" cards
// long after the agent has actually claimed them.
export function MissionsListAutoRefresh({
  intervalMs = 5000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, router]);

  return null;
}
