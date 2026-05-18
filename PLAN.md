# TaskVault — Build Plan

> Hackathon submission for the Coinbase + AWS track, 2026.
> Optimize for **ship the demo**, not build the platform. Cut anything that doesn't show on stage.

## Status

- ✅ **Phase 0 — Setup** complete (monorepo + per-subproject scaffolds + READMEs in place).
- ⏳ **Phases 1 → 9** below.

## Architecture at a glance

Four subprojects, four deploy targets, one repo:

```
contracts/   →  Arbitrum Sepolia        →  TaskEscrow address
x402-api/    →  AWS API Gateway     →  https://...amazonaws.com  (independent)
backend/     →  AWS API Gateway     →  https://...amazonaws.com  (depends on contracts)
frontend/    →  Vercel              →  https://...vercel.app     (depends on contracts + backend)
```

The agent flow is a single Lambda (`agentRunner`) triggered by EventBridge cron every 30s. It polls the `tasks` DynamoDB table, claims one `Open` task per tick by calling `escrow.pickup` from the CDP-managed agent wallet, runs the work loop (Bedrock → fetch data → Bedrock), and submits a proof hash on-chain. The escrow contract enforces that **only the registered agent address can pick up or submit** — DynamoDB is *how* the agent finds work, not *who* is allowed to claim.

**Build philosophy:** vertical slices, each ending in something runnable. The agent loop is built against a *free* data fetch first; x402 wraps it last (Phase 7). If x402 has lib drift on demo day, the demo still completes — we lose the wow moment, not the submission.

---

## Phase 1 — Smart Contract

**Goal:** Deployed, verified `TaskEscrow` on Arbitrum Sepolia, callable from Arbiscan.

**Inputs**
- Foundry installed (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Arbitrum Sepolia deployer wallet funded with test ETH (faucet)
- CDP agent wallet provisioned, address known (constructor arg)
- Arbiscan API key

**Deliverables**
- `forge install foundry-rs/forge-std` committed
- All 7 tests in `test/TaskEscrow.t.sol` pass (`forge test -vv`)
- `TaskEscrow` deployed to Arbitrum Sepolia; address recorded in `contracts/addresses.json` and propagated to all `.env` files
- Arbiscan-verified source

**Acceptance**
- Arbiscan link loads verified source
- Smoke test from Arbiscan UI: connect wallet → approve USDC → `createTask` → see `TaskCreated` event
- ABI lands at `contracts/out/TaskEscrow.sol/TaskEscrow.json`

**Risks**
- Wrong USDC test address → triple-check against Base docs
- Arbiscan `--verify` flakiness → fall back to manual upload
- Deployer ETH balance low → top up *before* the deploy session

**Effort:** ~half-day

---

## Phase 2 — Frontend Skeleton

**Goal:** Live Vercel URL with a working `<ConnectButton />` and an empty task list shell. No backend integration yet.

**Inputs**
- WalletConnect Cloud project ID (free)
- Vercel account

**Deliverables**
- Phase 0 scaffold deployed to Vercel
- Header with title + ConnectButton, hero copy, empty list placeholder
- Wallet connect tested with **MetaMask, Coinbase Wallet, Rainbow** on the deployed URL (not just localhost)

**Acceptance**
- Public Vercel URL loads, no console errors
- Switching network prompts to Arbitrum Sepolia work end-to-end
- `NEXT_PUBLIC_*` env vars set in Vercel project settings (escrow + USDC + RPC)

**Risks**
- WalletConnect ID missing → wallets fail with cryptic errors. Add a banner if env not set
- wagmi v2 SSR hydration mismatch → already mitigated with `ssr: true` in `lib/wagmi.ts`; reverify after first deploy

**Effort:** ~half-day

---

## Phase 3 — Backend CRUD

**Goal:** Three HTTP endpoints + DynamoDB tables provisioned. Agent cron disabled for this phase (`AGENT_CRON_ENABLED=false`).

**Inputs**
- Phase 1 contract address (for activity queries that need on-chain state)
- AWS account configured, region selected

**Deliverables**
- `POST /tasks` — frontend calls after `createTask` confirms; idempotent on `taskId`; validates `taskId`, `poster`, `bounty`, `specHash`, `specText`
- `GET /tasks` — most-recent-first list, joins on-chain `state` with DDB row
- `GET /tasks/{taskId}` — single task with full metadata
- DDB tables `tasks`, `activity`, `reports` created (already in `serverless.yml`)
- CORS allowing the Vercel origin

**Acceptance**
- `curl` all three routes against the deployed URL, see persisted data
- Duplicate POST with same `taskId` → 200 / no-op, not a duplicate row
- Backend URL captured in `frontend/.env.local` as `NEXT_PUBLIC_BACKEND_URL`

**Risks**
- IAM scoping for DDB needs to be tight before going live
- API Gateway HTTP API (`httpApi:`) vs REST API differ in event shape — handlers already written for HTTP API

**Effort:** ~half-day

---

## Phase 4 — Frontend: Task Creation + Feed

**Goal:** End user can post a task and see it appear in the list. Tasks sit in `Open` state forever — there's no agent yet.

**Inputs:** Phases 1 + 2 + 3

**Deliverables**
- `app/post/page.tsx` form: topic input + bounty input
- Submit flow: `usdc.approve(escrow, bounty)` → wait → `escrow.createTask(bounty, keccak256(specText))` → wait → `POST /tasks` to backend with `taskId` from event logs + `specText`
- `app/page.tsx` list pulls `GET /tasks` and renders cards (state, bounty, poster, Arbiscan link)
- Loading / error states for both transactions and the API call

**Acceptance**
- Connect wallet → post task → both txs land on Arbiscan → task appears in list within a few seconds with `state = Open`
- Posting a second task shows both in the list
- Hard refresh, list still shows them (DDB-backed, not local state)

**Risks**
- USDC approval tx confirmed but `createTask` reverts due to gas estimate or insufficient balance → surface the revert reason
- Reading `taskId` from event logs requires waiting for receipt — wagmi's `useWaitForTransactionReceipt` handles this; verify it parses the log correctly

**Effort:** ~1 day

---

## Phase 5 — Agent Wallet + Bedrock + Agent Lambda (plumbing)

**Goal:** Prove the agent's three building blocks work independently before wiring them together. **No cron, no contract calls, no x402.**

**Inputs**
- CDP API key + secret + agent wallet provisioned
- Bedrock access for `anthropic.claude-sonnet-4-*` in chosen region

**Deliverables in `backend/src/lib/`**
- `cdp.ts` — wraps CDP SDK; exposes `walletAddress`, `signAndBroadcast(tx)`. Logs the agent's address on import
- `bedrock.ts` — `invokeClaude(prompt, system?)` returning text
- `dynamo.ts` — get/put/query helpers for the three tables
- A throwaway `POST /test/agent` Lambda (or `serverless invoke`) that: prints CDP wallet address → runs a Bedrock prompt → writes a row to DDB → returns the row

**Acceptance**
- Invoking the throwaway endpoint logs the agent address, returns a Claude-generated string, and persists a DDB row
- Three log lines: `[cdp]`, `[bedrock]`, `[dynamo]` confirming each layer

**Risks**
- **Bedrock model ID drift** — IDs are region+version specific; verify in console before coding
- CDP SDK shape may differ from docs; pin version
- Lambda cold start + Bedrock first call = 5–10s; acceptable for now

**Effort:** ~half-day

---

## Phase 5.5 — Agent Poller

**Goal:** Cron-triggered Lambda picks up `Open` tasks, runs the full work loop (with a **free** internal news fetch — x402 comes later), submits proof on-chain.

**Inputs:** Phase 5 plumbing, Phase 1 contract, Phase 3 backend

**Deliverables**
- `lib/escrow.ts` — viem-based wrapper for `pickup`, `submitProof`; uses CDP wallet for signing
- `lib/news.ts` — temporary free data fetch (hardcoded canned articles or a public free API). Will be replaced by x402-paid call in Phase 7. Same interface either way
- `handlers/agent.ts` full loop:
  1. Query DDB GSI `state-index` WHERE `state = "Open"`, oldest first, limit 1
  2. Conditional update `state = "Open" → "Picking"` to claim it
  3. Call `escrow.pickup(taskId)`; on success update DDB to `state = "Assigned"`
  4. Bedrock plan: data needs from spec
  5. For each need: call `news.fetch(topic)` (free for now)
  6. Bedrock writeup: report from data
  7. Write report to `reports` table; compute `keccak256(report)`
  8. Call `escrow.submitProof(taskId, hash)`; update DDB `state = "Submitted"`
- EventBridge cron enabled (`AGENT_CRON_ENABLED=true`)

**Acceptance**
- Post a task via Phase 4 UI → within 30s, agent picks it up
- Arbiscan shows pickup tx and submitProof tx, both signed by agent address
- DDB row ends in `state = "Submitted"` with populated `reportHash`
- Report body retrievable from `reports` table

**Risks**
- **Two cron ticks racing on the same task** → conditional DDB update + contract revert as belt-and-suspenders
- **Lambda timeout** if Bedrock + chain confirms exceed default. Bump `agentRunner` timeout to 300s in `serverless.yml`
- **Agent wallet runs out of Sepolia ETH** during testing → write a top-up snippet in `backend/scripts/`

**Effort:** ~1.5 days. Most complex phase.

---

## Phase 6 — Activity Feed (frontend + backend together)

**Goal:** Live "what is the agent doing" feed on the task detail page, plus release/refund buttons.

**Inputs:** Phases 4 + 5.5

**Deliverables**
- Backend: `GET /tasks/{taskId}/activity` returns rows sorted by timestamp; `GET /tasks/{taskId}/report` returns body if state ≥ Submitted
- Backend: agent runner writes an activity row for every step (`pickup`, `plan`, `data_fetch`, `writeup`, `submit`, plus state transitions). Each row has `kind`, `payload`, `timestamp`, optional `txHash`
- Frontend: `app/tasks/[id]/page.tsx` with three sections — Spec, Activity feed (polls `/activity` every 2s), Report (when present)
- Frontend: state-aware Release / Refund buttons with Arbiscan tx confirmation
- Arbiscan tx links inline in feed rows that have an `txHash`

**Acceptance**
- Post task → watch the feed populate in real time, every step visible
- Click **Release** when state is Submitted → `escrow.release(taskId)` → Arbiscan shows USDC moving to agent wallet
- Click **Refund** before pickup → `escrow.refund(taskId)` → USDC returns to poster
- Polling pauses or backs off when state ≥ `Submitted` (no infinite-poll on completed tasks)

**Risks**
- 2s polling × many users = ouch on Lambda costs. For demo: fine. For roadmap: SSE or WebSocket
- DDB sort key on `timestamp` — make sure rows write with `Date.now()` and not stringified ISO; pagination order matters

**Effort:** ~1 day

---

## Phase 7 — x402 Paid API

**Goal:** Replace the free `news.fetch` from Phase 5.5 with a real x402-paywalled endpoint. Agent autonomously pays USDC per call. **This is the wow moment.**

**Inputs**
- Phase 5.5 working end-to-end (free version)
- Recipient wallet for x402 payments (the API operator's wallet — not the agent's)
- Pinned `x402` lib version

**Deliverables**
- `x402-api/src/handler.ts` — replace stub verification with real x402 server lib. Returns `402` w/ payment requirements when no `X-PAYMENT`, `200` after valid payment
- `backend/src/lib/x402client.ts` — wraps `x402-axios` (or chosen client). Caller calls `fetch(url)` and the lib handles 402 → pay → retry transparently
- Swap `lib/news.ts` to use `x402client` against the deployed `x402-api` URL
- Activity feed renders an `x402_payment` row with the on-chain payment tx hash

**Acceptance**
- Post a task → activity feed shows an `x402_payment` step with a Arbiscan link
- Arbiscan: agent wallet's USDC went *down* by the price, recipient wallet's USDC went *up*
- Forged `X-PAYMENT` header to the API → still returns 402

**Risks**
- **x402 lib version churn** — Coinbase has shipped breaking changes. Pin once, don't upgrade
- **Mainnet vs testnet network param** — make sure both server and client use `arbitrum-sepolia`
- Verification logic might require a relayer / facilitator URL — check pinned lib's docs before Phase 7 start

**Effort:** ~half-day if libs cooperate, ~1 day if they don't

---

## Phase 8 — Polish

**Goal:** Demo-day ready. Tight, predictable, recoverable.

**Deliverables**
- Optional: frontend invokes agent Lambda directly via AWS SDK after `POST /tasks`, skipping the cron wait. Cron stays as safety net
- Pre-funded agent wallet: enough Sepolia ETH and USDC for ~50 demo runs
- Demo task template button: pre-fills form with a known-good prompt
- Error states polished: failed approve, rejected sign, agent stuck > 60s
- CSS polish: spacing, status pills, monospace addresses, Arbiscan favicon next to tx links
- `backend/scripts/topup-agent.sh` to refill agent wallet between rehearsals

**Acceptance**
- Three rehearsals end-to-end, each under 90 seconds, all completing in `Released` state
- Recovery path tested: refund a stuck task, post a new one immediately, all visible

**Effort:** ~half-day

---

## Phase 9 — Demo Materials

**Goal:** Submission-ready. Judges need to grok this in 60 seconds.

**Deliverables**
- `docs/hero.png` — screenshot of a Submitted task with activity feed visible
- 90-second Loom following the demo script (below)
- `docs/architecture.png` — diagram showing Frontend → Escrow → Backend → Agent Lambda → x402-api + Bedrock
- Top-level `README.md` filled in: live URLs, contract address, sample completed tx
- Public GitHub repo (first push happens here, after squash-cleaning history if it's noisy)
- Submission form completed
- Final project name decided and applied via repo-wide find-replace

**Demo script (90 seconds)**
1. (0:00) Show task list. "This is TaskVault." Click **New Task**
2. (0:10) Type "Top 3 humanoid robotics companies, $2 USDC bounty." Click Approve, sign. Click Post, sign
3. (0:25) Arbiscan link slides in, show locked USDC
4. (0:35) Activity feed lights up: *Agent picked up task* (Arbiscan link). *Planning…* *Calling premium-news API…*
5. (0:50) **Wow moment:** *402 Payment Required → paying $0.01 USDC* — show on-chain tx on Arbiscan
6. (1:05) *Generating report…* Report appears
7. (1:20) Click **Release Funds**, sign. *Bounty sent.* Show agent wallet balance went up
8. (1:30) "Two minutes, four on-chain transactions, one autonomous agent. That's TaskVault."

**Effort:** ~half-day

---

## Critical path

```
Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4 ──┐
                                              │
                        Phase 5 ──▶ Phase 5.5 ┴──▶ Phase 6 ──▶ Phase 7 ──▶ Phase 8 ──▶ Phase 9
```

If solo: linear top-to-bottom.
If 2+ people: Phase 2 (frontend skeleton) and Phase 3 (backend CRUD) can run in parallel after Phase 1. Phase 5 (agent plumbing) can start in parallel with Phase 4 (frontend posting) since they don't share code.

## Top 3 risks to watch

1. **Bedrock access provisioning delay** — request *today*, not the day Phase 5 starts
2. **x402 lib version churn** — pin once in Phase 7, don't upgrade
3. **Agent wallet running out of gas/USDC mid-demo** — top up the night before, top up between rehearsal and live demo

## Open items still blocking

- Bedrock region + exact Claude Sonnet model ID — confirm before Phase 5
- CDP project + agent wallet — provision before Phase 1 (need agent address for the constructor)
- Arbitrum Sepolia deployer wallet + faucet ETH — provision before Phase 1
- Arbiscan API key — provision before Phase 1 deploy
- WalletConnect Cloud project ID — provision before Phase 2
- Final project name — decide before Phase 9 (Vercel URL bakes into the demo)
