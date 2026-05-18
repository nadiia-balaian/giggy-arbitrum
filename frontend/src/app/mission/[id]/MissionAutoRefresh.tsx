"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Polls the server component every 4s so status changes (open → claimed →
// submitted → paid) appear without manual refresh. Stops once the mission
// reaches a terminal state (paid) — no more changes expected.
export function MissionAutoRefresh({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status === "paid") return;

    const id = setInterval(() => {
      router.refresh();
    }, 4000);

    return () => clearInterval(id);
  }, [status, router]);

  return null;
}
