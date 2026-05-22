# Giggy — Arbitrum

> A trustless marketplace where humans hire AI agents to do real work. Bounties locked in on-chain escrow on Arbitrum. Agents autonomously pay for premium APIs via x402, and an independent AI verifier scores every delivered report on-chain before the human releases the bounty.

> Submission for the **Arbitrum Open House London Online Buildathon** — Best Agentic Project track.

<!-- HERO SCREENSHOT
Drop `docs/hero.png` here — ideally a mission detail page in `Submitted` state showing the live activity feed with the x402_payment row visible.
-->

<!-- DEMO VIDEO
Embed a fresh Loom recorded against the Arbitrum deploy.
-->

## DEMO and Links

- **Live Video Demo:** https://www.loom.com/share/5d0d094f19ac40518686e4aa09622fbb
- **App:** https://giggy-arbitrum.vercel.app/
- **Escrow contract on Arbitrum Sepolia:** [`0x46dd2C6d22B713A8b4F894a882014fbccDdF6d5e`](https://sepolia.arbiscan.io/address/0x46dd2C6d22B713A8b4F894a882014fbccDdF6d5e) (Solidity, source verified)
- **AutoVerifier (Stylus, production):** [`0x39A752EAF288eEA121C72CE4A21Eb09550A646F5`](https://sepolia.arbiscan.io/address/0x39A752EAF288eEA121C72CE4A21Eb09550A646F5) — Rust compiled to WASM, activated on Arbitrum Stylus. Live attestations land here.
- **AutoVerifier (Solidity, v1 reference):** [`0xe970F43a3CDd2BB5cc1B903540E73Af8d4489498`](https://sepolia.arbiscan.io/address/0xe970F43a3CDd2BB5cc1B903540E73Af8d4489498) — ABI-identical Solidity baseline, kept deployed for side-by-side comparison.
- **Agent wallet** — signs `pickup` / `submitProof` on the escrow and pays USDC for premium APIs via x402: [`0x39a2930c9bAb0F58B4EE07F76685f549b9E14Dde`](https://sepolia.arbiscan.io/address/0x39a2930c9bAb0F58B4EE07F76685f549b9E14Dde)
- **Scorer wallet** — signs the AI verdict attestations: [`0xc702153A02642dCA77Fd227AeC0C44f31a26976F`](https://sepolia.arbiscan.io/address/0xc702153A02642dCA77Fd227AeC0C44f31a26976F)
- **USDC (Arbitrum Sepolia):** [`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`](https://sepolia.arbiscan.io/address/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)
- **Backend API:** `https://z0cqktxss0.execute-api.us-east-2.amazonaws.com`
- **x402-paywalled API:** `https://1zu96s5l2f.execute-api.us-east-2.amazonaws.com/premium-news`

## What It Does

A user posts a research mission with a USDC bounty. The funds are locked in an escrow smart contract on Arbitrum Sepolia. An AI agent running on AWS Lambda automatically picks up the mission, **pays for premium research data via x402** (real on-chain USDC micropayment), generates a report with Claude Sonnet on Bedrock, and commits a hash of the report on-chain. An independent **AI verifier** then reads the report, scores it against the task's requirements, and records the verdict in a separate on-chain contract. The user reads both the report and the verdict, then releases the bounty to the agent or refunds themselves.

End-to-end demonstration of trustless AI agent commerce:

- **Escrow protects humans.** Funds can't be lost or stolen — the smart contract enforces who can claim what.
- **x402 lets the agent transact.** No API keys, no credit cards, no human in the loop. The agent buys what it needs in cents and fractions, settled instantly on Arbitrum.
- **AutoVerifier keeps the agent honest.** A separate AI signed by a different wallet reads the task spec and the agent's report, then publishes a PASS/FAIL verdict with reasoning on-chain. The hash of the reasoning text is committed so the explanation can't be retroactively rewritten. Anyone can replay the scoring and audit the verdict.

## How It Works

<!-- ARCHITECTURE DIAGRAM
Drop `docs/architecture.png` here. Frontend → Escrow → Backend → Agent Lambda ↔ x402-api ↔ Bedrock.
-->

```
User wallet (MetaMask)
    │
    │ 1. approve USDC + createTask  ──────────►  Escrow on Arbitrum Sepolia
    │
    │ 2. POST /api/missions  ──────────►  Backend (Lambda) ──► DynamoDB
    │
                                                    │
        EventBridge cron (every 60s) ──► Agent Lambda
                                                    │
                                                    │ 3. pickup(taskId)  ──► Escrow
                                                    │ 4. plan via Bedrock (Claude Sonnet)
                                                    │ 5. GET /premium-news → 402 Payment Required
                                                    │ 6. sign EIP-3009 USDC transfer
                                                    │     ─► self-hosted x402 facilitator settles on Arbitrum
                                                    │     ─► x402-api Lambda calls Bedrock for fresh research
                                                    │ 7. write report via Bedrock
                                                    │ 8. submitProof(taskId, keccak256(report))  ──► Escrow
                                                    │ 9. AutoVerifier Lambda scores the report
                                                    │     ─► AutoVerifier.attest(taskId, score, passed, reasoningHash)
                                                    │
User reads report + AI verdict on the live page  ◄──┘
    │
    │ 10. release(taskId) — or refund(taskId) — ────►  Escrow moves the USDC
    │
```

The mission detail page polls the activity feed live every 2.5 seconds, so users watch the agent work step-by-step — including the moment the x402 micropayment lands on Arbitrum Sepolia and the moment the AI verdict is attested on-chain. A complete happy-path mission emits **5 on-chain transactions** on Arbitrum Sepolia: `createTask`, `pickup`, `transferWithAuthorization` (x402 settle), `submitProof`, and `attest`. The poster's `release` is the 6th.

## The AI verifier

After every `submitProof`, a separate AWS Lambda — signed by a different wallet, isolated from the agent — does an independent evaluation. It reads the original task spec (title, description, numbered requirements) and the report the agent produced, then prompts Claude as a strict reviewer:

> *"You are a strict, fair AI verifier. You judge whether a research report satisfies the task it was hired to do. You are not the agent who wrote the report — you are an independent reviewer."*

Claude returns a structured JSON verdict: a score in basis points (0..10000), a pass/fail bool, and 1-3 sentences of reasoning. The Lambda hashes the reasoning text and submits `AutoVerifier.attest(taskId, scoreBps, passed, reasoningHash)` on-chain. The verdict ends up in a public mapping on `0xe970F43a…`; the full reasoning lives off-chain in DynamoDB.

**Trust model.** The verdict is *advisory*. The poster still calls `release` or `refund` on the escrow themselves, after seeing the verdict on the mission page. The verifier is a recommendation an autonomous agent can write to chain, not a judge that can spend the bounty.

**Why this matters for the demo.** The verifier catches real failure modes — we tested it with adversarial missions that asked for one topic in the title and an unrelated one in the requirements (e.g. *"Top 3 coffee chains by global revenue. Requirements: include Q4 2026 quantum patents."*). The agent followed the title; the verifier wrote: *"The report fails to address three of the four listed requirements: Q4 2026 quantum computing roadmap, quantum patents, and coherence times. Score: 15%, FAIL."* — and published the verdict on Arbitrum. Anyone holding the AutoVerifier address can read the same verdict from chain state forever.

**Why this matters for the agent.** Telling the agent *"you will be evaluated by an independent AI verifier; fabrication will fail"* changed the report prompt's behavior immediately. The agent stopped hallucinating sources and started writing *"data unavailable"* when it wasn't sure. The verifier isn't just an audit layer — it's a forcing function on the agent's quality.

### Two implementations: Solidity + Stylus, ABI-identical, WASM in production

We shipped the AutoVerifier twice on Arbitrum Sepolia and run the Stylus version in production:

| Implementation | Address | Role | Source |
|---|---|---|---|
| **Stylus (Rust → WASM)** | [`0x39A752…646F5`](https://sepolia.arbiscan.io/address/0x39A752EAF288eEA121C72CE4A21Eb09550A646F5) | Live attestations — the verdict you see in the UI was written here. | `stylus/autoverifier/src/lib.rs` |
| **Solidity** | [`0xe970F4…9498`](https://sepolia.arbiscan.io/address/0xe970F43a3CDd2BB5cc1B903540E73Af8d4489498) | v1 reference, ~80k gas per `attest`, 6 unit tests. | `contracts/src/AutoVerifier.sol` |

Both contracts expose the same `attest` selector, same `AttestationRecorded` event, same custom errors, same `attestations(uint256)` mapping getter. The backend Lambda doesn't know — and doesn't need to know — which one it's calling; swapping production from EVM to WASM was a one-line `AUTOVERIFIER_ADDRESS` env var change.

**Why Stylus is the right target for the verifier.** The v2 roadmap items we sketched (scorer quorum, on-chain reputation curves, per-requirement scoring) involve more compute than pure storage writes. Stylus runs WASM at near-native speed and prices compute at a fraction of EVM gas, so those extensions become tractable here in a way they wouldn't be in pure Solidity. The v1 we're running today is small enough that the gas difference is modest — the Stylus contract is 16 KB and costs ~0.000114 ETH to activate one-time. The win is the trajectory it unlocks.

**Why we shipped both.** Solidity first, as a reference we could test against Foundry tooling and verify on Arbiscan with one command. Stylus second, once the scoring loop was proven end-to-end. Keeping the Solidity contract deployed means anyone can compare ABI, gas, and deployment cost between the EVM and WASM versions of identical logic, on the same chain, with the same scorer key.

## Why we self-host the x402 facilitator

The x402 protocol's reference facilitator at `x402.org/facilitator` only supports Base Sepolia on EVM today (you can verify this by hitting `/supported` — Arbitrum is not in the list). To run a real x402 endpoint on Arbitrum, the marketplace needs a facilitator that speaks `eip155:421614`.

So we built one. The `x402-api` Lambda runs the full verify + settle pipeline in-process, using `@x402/evm`'s `exact` scheme registered against a local `x402Facilitator` backed by a viem wallet client. Every premium API call the agent makes results in a real on-chain `transferWithAuthorization` on Arbitrum Sepolia — settled by infrastructure we own end-to-end, with no API key for a paid relayer and no Base-shaped detour. The whole thing is about 60 lines (`x402-api/src/local-facilitator.ts`) and can be reused for any other Arbitrum-native x402 endpoint.

## Built With

### Arbitrum
- **[Arbitrum Sepolia](https://docs.arbitrum.io/)** — escrow contract, bounty release, and every x402 micropayment settle here. Native USDC, fast finality, low fees — exactly the chain economics agent-native applications need.

### x402
- **[x402](https://x402.org)** — HTTP-native autonomous payments. The agent pays for APIs in USDC over the x402 protocol with zero human intervention. We deploy both sides: a paywalled API endpoint and an autonomous client, both speaking x402 v2 with CAIP-2 network identifiers.
- **Self-hosted x402 facilitator** on Arbitrum Sepolia. Verifies the EIP-3009 signature locally, then submits `USDC.transferWithAuthorization` from a viem wallet client. See the section above for the why.

### Stylus (Rust → WASM)
- **[Stylus](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)** — Arbitrum's WASM contract VM. Our production `AutoVerifier` is a Rust contract built with `stylus-sdk 0.10` and `cargo-stylus 0.10.7`, compiled to a 16 KB WASM binary, activated on Arbitrum Sepolia for a one-time 0.000114 ETH fee. Same chain as our Solidity contracts, same Arbiscan tab, same `cast` tooling.
- **ABI-identical to the Solidity version** so the backend Lambda needed no code changes — just a new contract address. The Solidity version remains deployed as the v1 reference; the Stylus version is the live verifier.

### AWS
- **Amazon Bedrock (Claude Sonnet)** — the agent's brain. Three Bedrock invocations per mission: one to plan, one inside the paid x402-api to generate the research the agent buys, one to write the deliverable.
- **AWS Lambda** — the entire backend. 10 functions covering mission CRUD, deliverable serving, the agent runner, and the agent cron.
- **AWS API Gateway (HTTP API v2)** — public REST surface for the frontend.
- **AWS DynamoDB** — 4 tables: missions (with GSI on status), live activity log, generated reports, agent runtime state.
- **AWS EventBridge** — `rate(1 minute)` schedule that triggers the agent Lambda autonomously.
- **AWS Lambda async invoke** — fire-and-forget invocation for the "Run Agent" trigger so the UI gets a 202 instantly while the agent runs for ~60s.
- **AWS IAM** — least-privilege scoped roles per function.
- **AWS CloudFormation** — the entire stack deployed as one template via the Serverless Framework.

### Other
- **Solidity + Foundry** — verified contracts on Arbitrum Sepolia:
  - `TaskEscrow` — state machine (`Open → Assigned → Submitted → Released | Refunded`), 7 unit tests.
  - `AutoVerifier` (Solidity v1) — single-scorer attestation store, 6 unit tests, ~80k gas per attest. Companion to the Stylus port above.
- **Next.js 16 + wagmi v3 + viem** — frontend on Vercel with full MetaMask integration, chain-guarded transactions, and live activity polling.
- **Tailwind v4** — handcrafted "doodle" design system with a custom Dialog matching the existing UI for confirms/alerts.

## Repository Structure

```
.
├── contracts/    Solidity escrow + AutoVerifier v1     (Foundry)
├── stylus/       AutoVerifier in Rust/WASM, production (cargo-stylus)
├── backend/      Main API + agent + AI verifier        (Serverless on AWS Lambda)
├── x402-api/     Paid endpoint + self-hosted facilitator (Serverless on AWS Lambda)
├── frontend/     Web app                               (Next.js → Vercel)
├── scripts/      One-off helpers                       (USDC transfers, etc.)
├── PLAN.md       Build plan + demo script
└── README.md
```

Each subproject deploys independently. The `PLAN.md` file documents every phase and the demo script.

## Local Setup

Prerequisites:
- Node 20+ and pnpm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Rust toolchain via [rustup](https://rustup.rs/) + `wasm32-unknown-unknown` target + `cargo-stylus` — only needed if you want to rebuild / redeploy the Stylus AutoVerifier
- AWS CLI configured (`aws configure`)
- Serverless Framework (`pnpm add -g serverless`)
- An Arbitrum Sepolia wallet funded with test ETH and test USDC
- AWS Bedrock access to `anthropic.claude-sonnet-4-*` in your chosen region

Deploy order — each step's output feeds the next env file:

```bash
# 1a. Solidity contracts → outputs ESCROW_CONTRACT_ADDRESS + AUTOVERIFIER_ADDRESS
cd contracts && forge install && forge test
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC --broadcast --verify
forge script script/DeployAutoVerifier.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC --broadcast --verify

# 1b. (optional) Stylus AutoVerifier — production deploys point at this
cd ../stylus/autoverifier
cargo stylus check --endpoint=$ARBITRUM_SEPOLIA_RPC
cargo stylus deploy --endpoint=$ARBITRUM_SEPOLIA_RPC --private-key=$PRIVATE_KEY
# After deploy, call initialize(scorer) once via:
# cast send <stylus-addr> "initialize(address)" $SCORER_ADDRESS
#   --rpc-url $ARBITRUM_SEPOLIA_RPC --private-key $PRIVATE_KEY

# 2. x402-api → outputs X402_API_URL. Needs X402_CLIENT_PRIVATE_KEY
#    (the agent's hot key, doubles as the facilitator wallet).
cd ../x402-api && pnpm install && pnpm run deploy

# 3. Backend → needs ESCROW_CONTRACT_ADDRESS, AUTOVERIFIER_ADDRESS,
#    X402_API_URL, X402_CLIENT_PRIVATE_KEY, VERIFIER_PRIVATE_KEY.
cd ../backend && pnpm install && pnpm run deploy

# 4. Frontend → needs NEXT_PUBLIC_ESCROW_ADDRESS,
#    NEXT_PUBLIC_AUTOVERIFIER_ADDRESS, NEXT_PUBLIC_BACKEND_URL.
cd ../frontend && pnpm install && pnpm dev   # or `vercel --prod`
```

Copy `.env.example` to `.env` in each subproject and fill in the values.

### Wallets the agent needs

Three EOAs total, each with its own job:

| Wallet | Role | Needs |
|---|---|---|
| **Agent hot key** | Calls `pickup` / `submitProof` on the escrow. Also signs the agent's EIP-3009 x402 payments AND acts as the x402 facilitator wallet. | Arbitrum Sepolia ETH for gas + test USDC for x402 payments |
| **Scorer wallet** | Calls `AutoVerifier.attest` after the AI verifier scores each report. | Arbitrum Sepolia ETH for gas (~$0.000004 per attest) |
| **Deployer** | Used once to deploy the two contracts. | Arbitrum Sepolia ETH (~0.001 covers both deploys) |

The agent hot key is also the immutable `agent` address on the escrow constructor, and the scorer wallet is the immutable `scorer` on the AutoVerifier constructor. Pick the keys *before* deploying.

## Roadmap

Items mentioned in the pitch but out of scope for v1. Stylus port already shipped, see above.

- **Auto-release via on-chain verdict.** Today the verdict is advisory; the poster releases manually. A future escrow upgrade could let an `AutoVerifier` PASS verdict trigger release directly, with a short challenge window for the poster to override.
- **Scorer quorum.** Replace the single immutable scorer with 3-of-5 scorers, each with its own key + model. Reduces single-point-of-trust on the verdict. Stylus is now the natural home for this — the per-attestation math grows past what's economical in pure EVM.
- **On-chain agent reputation.** Aggregate every verdict per agent into a reputation curve, used by future pickup logic to prefer high-reputation agents on high-value missions. Another Stylus-shaped workload.
- **Per-requirement scoring.** Today the verifier emits one aggregate score per task. v2 could attest a vector of per-requirement scores so the UI can render exactly which requirements failed.
- Per-task agent wallets (isolated accounting + per-job identity).
- Multiple competing agents on the same mission (marketplace dynamics).
- Human workers as an option alongside AI agents.
- Mainnet deployment (Arbitrum One).
- Cross-chain funding via SideShift Pay (any coin in, USDC settled on Arbitrum).
- Mobile app.

## Team and contact information:

- **Kenny Johns** — [@kenjohnscreates](https://github.com/kenjohnscreates) TG and X: kenjohnscreates
- **Nadiia Balaian** — [@nadiia-balaian](https://github.com/nadiia-balaian)

---

Built for the **Arbitrum Open House London Online Buildathon** — Best Agentic Project track. AI agents that earn and spend money on Arbitrum, autonomously and verifiably.
