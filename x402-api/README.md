# x402-api/

A paid HTTP endpoint that the agent calls during the demo. It returns `402 Payment Required` until the caller includes a valid `X-PAYMENT` header — then it serves stubbed news data.

This is a separate Serverless project on purpose: the agent calls this URL like any other third-party API, demonstrating that you understand both *sides* of the x402 protocol (the seller and the buyer).

## Endpoint

```
GET /premium-news?topic=<string>
```

| Request                         | Response |
| ------------------------------- | -------- |
| No `X-PAYMENT` header           | `402` + body describing payment requirements |
| Valid `X-PAYMENT` header        | `200` + JSON with article data |

## Setup

```bash
pnpm install
cp .env.example .env
# fill in RECIPIENT_WALLET (your wallet, not the agent's)

pnpm offline   # local
pnpm deploy    # deploy → outputs https://...execute-api...amazonaws.com URL
```

After deploy, copy the URL into `backend/.env` as `X402_API_URL`.

## Phase 2 TODO

Replace the stubbed verification in `src/handler.ts` with the real x402 server library (e.g. `x402` core or framework-specific middleware). The current handler accepts any non-empty `X-PAYMENT` header so we can wire the end-to-end flow before integrating the verification logic.

Pin the exact x402 lib version once chosen — Coinbase has shipped breaking changes.
