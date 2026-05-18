import type { APIGatewayProxyResultV2 } from "aws-lambda";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json",
};

export function ok(body: unknown, status = 200): APIGatewayProxyResultV2 {
  return { statusCode: status, headers: cors, body: JSON.stringify(body) };
}

export function notImplemented(reason: string): APIGatewayProxyResultV2 {
  return { statusCode: 501, headers: cors, body: JSON.stringify({ error: "not_implemented", reason }) };
}

export function badRequest(reason: string): APIGatewayProxyResultV2 {
  return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "bad_request", reason }) };
}

export function notFound(reason: string): APIGatewayProxyResultV2 {
  return { statusCode: 404, headers: cors, body: JSON.stringify({ error: "not_found", reason }) };
}
