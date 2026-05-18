const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://k6yy37gbcf.execute-api.us-east-2.amazonaws.com";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    // Always go to the network. The agent updates DDB asynchronously and any
    // stale layer (Next route cache, fetch cache) makes mission status look
    // wrong on the home + dashboard. router.refresh() polling drives the
    // re-fetch — we just need to make sure each one actually hits the API.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}
