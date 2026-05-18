/** Concatenate class names, filtering falsy values. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/** Resolve after `ms` milliseconds. Used to simulate network latency in mocks. */
export function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/** Format a number as USD with no decimals (matches the doodle UI style). */
export function formatUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/** Format a USD number with explicit + / - sign (used for EV cells). */
export function formatUsdSigned(n: number): string {
  if (n === 0) return "$0.00";
  const sign = n > 0 ? "+" : "-";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-5)}`;
}
