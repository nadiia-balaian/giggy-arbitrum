# backend/

Main API and agent runner. Serverless Framework on AWS Lambda + API Gateway + DynamoDB.

## Endpoints

| Method | Path                          | Purpose                              | Phase |
| ------ | ----------------------------- | ------------------------------------ | ----- |
| POST   | `/tasks`                      | Mirror on-chain TaskCreated into DDB | 4     |
| GET    | `/tasks`                      | List tasks for the frontend          | 4     |
| GET    | `/tasks/{taskId}`             | Get one task with on-chain state     | 4     |
| GET    | `/tasks/{taskId}/activity`    | Live agent activity feed             | 4     |
| GET    | `/tasks/{taskId}/report`      | Generated report body                | 4     |

The **agent runner** is a separate Lambda triggered by an EventBridge cron every 30 seconds. It polls the tasks table for `Open` rows and runs the full work loop (pickup → x402 calls → Bedrock → submitProof). See `src/handlers/agent.ts`.

## DynamoDB tables

- `tasks` — taskId (PK), state (GSI), poster, bounty, specHash, createdAt
- `activity` — taskId (PK), timestamp (SK), kind, payload
- `reports` — taskId (PK), body, reportHash

## Setup

```bash
pnpm install
cp .env.example .env
# fill in AWS, Bedrock, CDP, and post-deploy values from contracts/ and x402-api/

pnpm offline   # local dev with serverless-offline
pnpm deploy    # ship to AWS
```

## Why x402-api is a separate project

Even though both deploy to AWS, keeping them separate tells judges a clearer story: *here's the paid API, here's the agent that pays it, they're different services talking over HTTP.* See [`../x402-api/`](../x402-api/).
