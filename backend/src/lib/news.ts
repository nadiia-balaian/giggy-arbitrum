// Premium news fetch — gated by x402.
//
// The agent calls our deployed x402-api endpoint. If the API returns
// 402 Payment Required, the x402 interceptor signs a USDC transferWith-
// Authorization from the agent's wallet, the facilitator settles it
// on-chain, and the API serves the data. The settled tx hash bubbles
// back so the agent can log it as an `x402_payment` activity row.

import { x402Get } from "./x402client.js";

const API_URL = process.env.X402_API_URL ?? "";

export interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
}

interface NewsResponse {
  topic: string;
  articles: NewsArticle[];
}

export interface FetchNewsResult {
  articles: NewsArticle[];
  /** On-chain x402 micropayment tx hash if a payment was made. */
  paymentTxHash: string | null;
}

/** Fetch research data for a topic, paying via x402 if required. */
export async function fetchNews(topic: string): Promise<FetchNewsResult> {
  if (!API_URL) {
    throw new Error("X402_API_URL is not set");
  }
  const url = `${API_URL}/premium-news?topic=${encodeURIComponent(topic)}`;
  const result = await x402Get<NewsResponse>(url);
  return {
    articles: result.data.articles,
    paymentTxHash: result.txHash,
  };
}
