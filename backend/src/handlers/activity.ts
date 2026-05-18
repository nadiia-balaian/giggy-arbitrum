import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ok, notImplemented } from "../lib/response.js";

// GET /tasks/{taskId}/activity
// Returns the agent's activity log for a task — the live "what is the agent doing" feed.
// Each row: { timestamp, kind: "thought" | "tool_call" | "x402_payment" | "submit", payload }.
// Phase 4 will implement.
export const list: APIGatewayProxyHandlerV2 = async () => {
  return ok({ activity: [] });
};

// GET /tasks/{taskId}/report
// Returns the generated report body. The on-chain proof is keccak256 of this content.
// Phase 4 will implement.
export const report: APIGatewayProxyHandlerV2 = async (event) => {
  const taskId = event.pathParameters?.taskId;
  return notImplemented(`activity.report(${taskId}) — Phase 4`);
};
