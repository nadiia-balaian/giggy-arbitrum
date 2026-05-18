import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ok, notImplemented } from "../lib/response.js";

// POST /tasks
// Body: { taskId: string, poster: address, bounty: string, specHash: hex, specText: string }
// Mirrors an on-chain TaskCreated event into DynamoDB so the agent runner can poll it.
// Phase 4 will implement.
export const create: APIGatewayProxyHandlerV2 = async () => {
  return notImplemented("tasks.create — Phase 4");
};

// GET /tasks
// Returns all tasks (most recent first), used by the frontend list view.
// Phase 4 will implement.
export const list: APIGatewayProxyHandlerV2 = async () => {
  return ok({ tasks: [] });
};

// GET /tasks/{taskId}
// Returns the task metadata + current on-chain state.
// Phase 4 will implement.
export const get: APIGatewayProxyHandlerV2 = async (event) => {
  const taskId = event.pathParameters?.taskId;
  return notImplemented(`tasks.get(${taskId}) — Phase 4`);
};
