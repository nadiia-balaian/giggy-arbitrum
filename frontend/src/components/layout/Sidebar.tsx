"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  match: string[];
};

const NAV: NavItem[] = [
  { label: "Mission Market", href: "/", match: ["/"] },
  { label: "Create Mission", href: "/create", match: ["/create"] },
  { label: "Agent Dashboard", href: "/agent", match: ["/agent"] },
  { label: "Receipts", href: "/receipt", match: ["/receipt"] },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border-ink-2 bg-sky px-3 py-1.5 text-xs font-bold tracking-wide">
          <span className="size-2 rounded-full bg-green-500" />
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="rounded-full p-1.5 text-ink/40 transition-colors hover:bg-ink/10 hover:text-ink"
          title="Disconnect wallet"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        const metamask = connectors.find((c) => c.name === "MetaMask") ?? connectors[0];
        if (metamask) connect({ connector: metamask });
      }}
      className="rounded-2xl border-ink-2 bg-coral px-4 py-2.5 text-sm font-semibold shadow-doodle-sm hover:bg-coral/80"
    >
      Connect Wallet
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-6 border-r-[3px] border-ink bg-bg px-6 py-7">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full border-ink-3 bg-sky shadow-doodle-sm">
          <span className="block size-3 rounded-full bg-ink/0 ring-2 ring-ink" />
        </span>
        <span className="font-display text-3xl font-extrabold tracking-tight">
          Giggy
        </span>
      </Link>

      <nav className="mt-2 flex flex-col gap-2">
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-2xl px-4 py-2.5 text-[0.95rem] font-semibold tracking-tight transition-colors",
                active
                  ? "border-ink-2 bg-coral shadow-doodle-sm"
                  : "border-2 border-transparent hover:border-ink hover:bg-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t-2 border-dashed border-ink/40 pt-5">
        <WalletButton />
      </div>
    </aside>
  );
}
