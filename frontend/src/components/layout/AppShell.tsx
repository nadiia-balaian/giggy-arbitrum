import * as React from "react";
import { Sidebar } from "./Sidebar";
import { Star } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-bg text-ink">
      <Sidebar />
      <main className="relative flex-1 px-10 py-8">
        {children}
      </main>
    </div>
  );
}
