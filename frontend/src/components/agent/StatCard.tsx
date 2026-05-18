import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "sky" | "coral" | "yellow" | "mint" | "white";

const toneClass: Record<Tone, string> = {
  sky: "bg-sky",
  coral: "bg-coral",
  yellow: "bg-yellow",
  mint: "bg-mint",
  white: "bg-white",
};

export function StatCard({
  label,
  value,
  tone = "sky",
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-3xl border-ink-3 px-5 py-4 shadow-doodle",
        toneClass[tone],
        className,
      )}
    >
      <span className="rounded-full border-ink-2 bg-white/70 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider w-fit">
        {label}
      </span>
      <span className="font-display text-3xl font-extrabold leading-none">
        {value}
      </span>
    </div>
  );
}
