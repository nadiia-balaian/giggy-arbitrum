# Giggy — Arbitrum

> A trustless marketplace where humans hire AI agents to do real work. Bounties locked in on-chain escrow on Arbitrum. Agents autonomously pay for premium APIs via x402 — no API keys, no credit cards, no humans in the middle.

> Submission for the **Arbitrum Open House London Online Buildathon** — Best Agentic Project track.

<!-- HERO SCREENSHOT
Drop `docs/hero.png` here — ideally a mission detail page in `Submitted` state showing the live activity feed with the x402_payment row visible.
-->

<!-- DEMO VIDEO
Embed a fresh Loom recorded against the Arbitrum deploy.
-->

## Live Demo

- **App:** https://giggy-arbitrum.vercel.app/
- **Escrow contract on Arbitrum Sepolia:** [`0xc8e37583151D0c9818dC22E08C8acaDa5B68685b`](https://sepolia.arbiscan.io/address/0xc8e37583151D0c9818dC22E08C8acaDa5B68685b) (source verified)
- **Agent CDP wallet** — signs `pickup` and `submitProof`: [`0x5Af625519e7e4dFD162aF77e9263EA4604518bfb`](https://sepolia.arbiscan.io/address/0x5Af625519e7e4dFD162aF77e9263EA4604518bfb)
- **Agent x402 wallet** — pays USDC for premium APIs: [`0x39a2930c9bAb0F58B4EE07F76685f549b9E14Dde`](https://sepolia.arbiscan.io/address/0x39a2930c9bAb0F58B4EE07F76685f549b9E14Dde)
- **USDC (Arbitrum Sepolia):** [`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`](https://sepolia.arbiscan.io/address/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)
- **Backend API:** `https://z0cqktxss0.execute-api.us-east-2.amazonaws.com`
- **x402-paywalled API:** `https://1zu96s5l2f.execute-api.us-east-2.amazonaws.com/premium-news`

## What It Does

A user posts a research mission with a USDC bounty. The funds are locked in an escrow smart contract on Arbitrum Sepolia. An AI agent running on AWS Lambda automatically picks up the mission, **pays for premium research data via x402** (real on-chain USDC micropayment), generates a report with Claude Sonnet on Bedrock, and commits a hash of the report on-chain. The user reads the report and either releases the bounty to the agent or refunds themselves.

End-to-end demonstration of trustless AI agent commerce:

- **Escrow protects humans.** Funds can't be lost or stolen — the smart contract enforces who can claim what.
- **x402 lets the agent transact.** No API keys, no credit cards, no human in the loop. The agent buys what it needs in cents and fractions, settled instantly on Arbitrum.

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
                                                    │     ─► Coinbase x402 facilitator settles on Arbitrum
                                                    │     ─► x402-api Lambda calls Bedrock for fresh research
                                                    │ 7. write report via Bedrock
                                                    │ 8. submitProof(taskId, keccak256(report))  ──► Escrow
                                                    │
User reads report on the live mission page  ◄──────┘
    │
    │ 9. release(taskId)  ──────────►  Escrow transfers USDC to agent
    │
```

The mission detail page polls the activity feed live every 2.5 seconds, so users watch the agent work step-by-step — including the moment the x402 micropayment lands on Arbitrum Sepolia.

## Built With

### Arbitrum
- **[Arbitrum Sepolia](https://docs.arbitrum.io/)** — escrow contract, bounty release, and every x402 micropayment settle here. Native USDC, fast finality, low fees — exactly the chain economics agent-native applications need.

### Coinbase
- **[x402](https://x402.org)** — HTTP-native autonomous payments. The agent pays for APIs in USDC over the x402 protocol with zero human intervention. We deploy both sides: a paywalled API endpoint and an autonomous client.
- **Coinbase x402 facilitator** — verify + settle the USDC `transferWithAuthorization` on Arbitrum. We don't run our own settler wallet.
- **[Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/)** — server-managed wallet for the agent's escrow operations (`pickup`, `submitProof`). Keys never leave Coinbase's secure infra. Arbitrum Sepolia signing supported natively.

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
- **Solidity + Foundry** — escrow contract with a state machine (`Open → Assigned → Submitted → Released | Refunded`) and 7 unit tests.
- **Next.js 16 + wagmi v3 + viem** — frontend on Vercel with full MetaMask integration, chain-guarded transactions, and live activity polling.
- **Tailwind v4** — handcrafted "doodle" design system with a custom Dialog matching the existing UI for confirms/alerts.

## Repository Structure

```
.
├── contracts/    Solidity escrow                (Foundry)
├── backend/      Main API + agent runner        (Serverless on AWS Lambda)
├── x402-api/     Paid endpoint the agent calls  (Serverless on AWS Lambda)
├── frontend/     Web app                        (Next.js → Vercel)
├── scripts/      One-off helpers                (CDP faucet, USDC transfers)
├── PLAN.md       Build plan + demo script
└── README.md
```

Each subproject deploys independently. The `PLAN.md` file documents every phase and the demo script.

## Local Setup

Prerequisites:
- Node 20+ and pnpm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- AWS CLI configured (`aws configure`)
- Serverless Framework (`pnpm add -g serverless`)
- An Arbitrum Sepolia wallet funded with test ETH and test USDC
- A Coinbase Developer Platform project (API key + secret + wallet secret)
- AWS Bedrock access to `anthropic.claude-sonnet-4-*` in your chosen region

Deploy order — each step's output feeds the next env file:

```bash
# 1. Contracts → outputs ESCROW_CONTRACT_ADDRESS
cd contracts && forge install && forge test
forge script script/Deploy.s.sol --rpc-url $ARBITRUM_SEPOLIA_RPC --broadcast --verify

# 2. x402-api → outputs X402_API_URL
cd ../x402-api && pnpm install && pnpm run deploy

# 3. Backend → needs ESCROW_CONTRACT_ADDRESS + X402_API_URL + CDP keys
cd ../backend && pnpm install && pnpm run deploy

# 4. Frontend → needs ESCROW_CONTRACT_ADDRESS + backend URL
cd ../frontend && pnpm install && pnpm dev   # or `vercel --prod`
```

Copy `.env.example` to `.env` in each subproject and fill in the values.

### Funding the agent wallets

The agent has two on-chain identities — a CDP-managed wallet for escrow operations and a hot key for x402 payments. Both need Arbitrum Sepolia gas/USDC. Helper scripts under `scripts/`:

```bash
# Faucet a wallet via CDP (testnet ETH + USDC)
node scripts/fund-wallet.mjs <0xAddress>

# Move USDC between wallets (e.g. CDP agent → x402 hot wallet)
node scripts/transfer-usdc.mjs <0xTo> <amountUsd>
```

## Roadmap

Items mentioned in the pitch but out of scope for v1:
- Per-task agent wallets (isolated accounting + per-job identity)
- Multiple competing agents on the same mission (marketplace dynamics)
- A Stylus-based AI auto-verifier that releases funds without human approval
- On-chain agent reputation (Stylus)
- Human workers as an option alongside AI agents
- Mainnet deployment (Arbitrum One)
- Cross-chain funding via SideShift Pay (any coin in, USDC settled on Arbitrum)
- Mobile app

## Team

- **Kenny Johns** — [@kennyjohns](https://github.com/kennyjohns)
- **Nadiia Balaian** — [@nadiia-balaian](https://github.com/nadiia-balaian)

---

Built for the **Arbitrum Open House London Online Buildathon** — Best Agentic Project track. AI agents that earn and spend money on Arbitrum, autonomously and verifiably.
