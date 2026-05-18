# Giggy — Frontend Demo

Frontend for the EasyA Consensus Hackathon (Coinbase x AWS track).

Giggy is a paid-mission platform: a user posts a task, an AWS-hosted cron
agent scans the market and claims the mission with the best expected value
(reward minus `x402` claim cost), the agent completes the work, an AWS review
agent approves the deliverable, and a `x402 / Base` receipt is generated.

This repo contains **only the frontend** — all data is mocked locally and
exposed through async service functions that are designed to be swapped for
real HTTP calls without changing any pages or components.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 (CSS-first theming via `@theme`)
- `lucide-react` for icons
- No state library, no auth, no wallet, no real chain integration

## Pages

| Route             | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `/`               | Mission Market — list of open / claimed missions         |
| `/create`         | Create Mission — funded brief form                       |
| `/mission/[id]`   | Mission Details — lifecycle, requirements, approve & pay |
| `/agent`          | Agent Dashboard — AWS cron agent decision engine + scan  |
| `/receipt/[id]`   | Review & Receipt — proof of execution + payout summary   |

## Demo flow

1. `/create` — fund + create a new mission.
2. Redirect to `/mission/<new id>`.
3. Visit `/agent` and click **Run Agent Scan** — the highest-EV open mission
   is claimed and a new row is prepended to the decision table.
4. Re-open the mission detail page — status now shows `Claimed`, plus the
   mock `x402` proof and the worker / agent name.
5. (Optional) When status is `submitted`, click **Approve & Pay** — the page
   redirects to `/receipt/<id>` with the final payout.

> The **Run Agent Scan** button is for demo control only. In production the
> scan runs on AWS EventBridge cron, not from the UI.

## Running locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Backend integration

The frontend never talks to data files directly. All data flows through
service modules in `src/lib/api/*`. Each function is annotated with a
`// TODO Backend:` comment naming the HTTP endpoint that should replace it.

```
src/lib/api/missions.ts   GET/POST /api/missions, /api/missions/:id, claim, submit
src/lib/api/agent.ts      GET /api/agent/snapshot, POST /api/agent/scan
src/lib/api/payments.ts   POST /api/payments/x402, GET /api/payments/payout/:id
src/lib/api/reviews.ts    POST /api/reviews/:missionId, GET /api/receipts/:id
```

To wire the real backend:

1. Replace each function body with a `fetch` call.
2. Keep the **function signature and return shape** identical (see
   `src/types/index.ts`).
3. Delete `src/data/store.ts` and the seed files in `src/data/`.

## Folder layout

```
src/
  app/                       Pages (App Router)
    page.tsx                 /
    create/page.tsx          /create
    mission/[id]/page.tsx    /mission/:id   (+ ApproveAction.tsx)
    agent/page.tsx           /agent         (+ AgentDashboardClient.tsx)
    receipt/[id]/page.tsx    /receipt/:id   (+ ShareButton.tsx)
  components/
    layout/                  AppShell, Sidebar
    missions/                MissionCard, LifecycleTimeline
    agent/                   StatCard, AgentDecisionTable
    receipts/                ReceiptCard
    ui/                      Button, Input, Textarea, Select, StatusBadge
  data/                      Seed mock data (delete when backend is live)
  lib/
    api/                     Async service wrappers — swap to fetch later
    utils.ts                 cn, delay, format helpers
  types/index.ts             Shared TS types
```

## Design notes

- Off-white `bg`, thick black `ink` borders everywhere, hard-offset
  `shadow-doodle` (4px / 4px / 0 / black) for the sticker-card look.
- Pastel palette: `coral`, `yellow`, `sky`, `mint`, `cream`.
- Display font: **Fraunces** (variable, with `SOFT` axis); body: **Geist Sans**.
- Desktop-first; the sidebar is fixed at 16rem (`w-64`).

## Out of scope

Real auth, wallet, x402, AWS, DB, escrow, persistence beyond the in-memory
store, mobile-first layout, tests.
