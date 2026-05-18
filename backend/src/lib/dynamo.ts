import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION ?? "us-east-2";
const raw = new DynamoDBClient({ region });
const ddb = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});

const MISSIONS_TABLE = process.env.MISSIONS_TABLE ?? "taskvault-backend-dev-missions";
const ACTIVITY_TABLE = process.env.ACTIVITY_TABLE ?? "taskvault-backend-dev-activity";
const REPORTS_TABLE = process.env.REPORTS_TABLE ?? "taskvault-backend-dev-reports";
const AGENT_TABLE = process.env.AGENT_TABLE ?? "taskvault-backend-dev-agent";

// ─── Missions ───────────────────────────────────────────────

export interface MissionRow {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  rewardUsd: number;
  x402ClaimPriceUsd: number;
  workerType: string;
  status: string;
  deadline: string;
  createdAt: string;
  claimedBy?: string;
  claimedAt?: string;
  submittedAt?: string;
  deliverableUrl?: string;
  x402TxHash?: string;
  reportHash?: string;
  specHash?: string;
  poster?: string;
  featured?: boolean;
}

export async function putMission(m: MissionRow): Promise<void> {
  await ddb.send(new PutCommand({ TableName: MISSIONS_TABLE, Item: m }));
}

export async function getMission(id: string): Promise<MissionRow | null> {
  const res = await ddb.send(new GetCommand({ TableName: MISSIONS_TABLE, Key: { id } }));
  return (res.Item as MissionRow) ?? null;
}

export async function listMissions(): Promise<MissionRow[]> {
  const res = await ddb.send(new ScanCommand({ TableName: MISSIONS_TABLE }));
  const items = (res.Items ?? []) as MissionRow[];
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listMissionsByStatus(status: string): Promise<MissionRow[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: MISSIONS_TABLE,
      IndexName: "status-index",
      KeyConditionExpression: "#s = :s",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": status },
    }),
  );
  return (res.Items ?? []) as MissionRow[];
}

export async function deleteMission(id: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: MISSIONS_TABLE, Key: { id } }));
  // Best-effort cleanup of related rows. Activity rows share missionId as PK.
  const activity = await ddb.send(
    new QueryCommand({
      TableName: ACTIVITY_TABLE,
      KeyConditionExpression: "missionId = :m",
      ExpressionAttributeValues: { ":m": id },
    }),
  );
  for (const row of activity.Items ?? []) {
    await ddb.send(
      new DeleteCommand({
        TableName: ACTIVITY_TABLE,
        Key: { missionId: row.missionId, timestamp: row.timestamp },
      }),
    );
  }
  await ddb.send(new DeleteCommand({ TableName: REPORTS_TABLE, Key: { missionId: id } }));
}

export async function updateMissionStatus(
  id: string,
  status: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  let updateExpr = "SET #s = :s";
  const names: Record<string, string> = { "#s": "status" };
  const values: Record<string, unknown> = { ":s": status };

  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      updateExpr += `, #${k} = :${k}`;
      names[`#${k}`] = k;
      values[`:${k}`] = v;
    }
  }

  await ddb.send(
    new UpdateCommand({
      TableName: MISSIONS_TABLE,
      Key: { id },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}

// ─── Activity ───────────────────────────────────────────────

export interface ActivityRow {
  missionId: string;
  timestamp: number;
  kind: string;
  payload: string;
  txHash?: string;
}

export async function putActivity(row: ActivityRow): Promise<void> {
  await ddb.send(new PutCommand({ TableName: ACTIVITY_TABLE, Item: row }));
}

export async function listActivity(missionId: string): Promise<ActivityRow[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: ACTIVITY_TABLE,
      KeyConditionExpression: "missionId = :m",
      ExpressionAttributeValues: { ":m": missionId },
      ScanIndexForward: true,
    }),
  );
  return (res.Items ?? []) as ActivityRow[];
}

// ─── Reports ────────────────────────────────────────────────

export interface ReportRow {
  missionId: string;
  body: string;
  reportHash: string;
  createdAt: string;
}

export async function putReport(row: ReportRow): Promise<void> {
  await ddb.send(new PutCommand({ TableName: REPORTS_TABLE, Item: row }));
}

export async function getReport(missionId: string): Promise<ReportRow | null> {
  const res = await ddb.send(new GetCommand({ TableName: REPORTS_TABLE, Key: { missionId } }));
  return (res.Item as ReportRow) ?? null;
}

// ─── Agent state ────────────────────────────────────────────

export interface AgentStateRow {
  pk: string; // always "SINGLETON"
  online: boolean;
  lastScanAt: string;
  missionsScanned: number;
  missionsClaimed: number;
  expectedValueUsd: number;
}

export async function getAgentState(): Promise<AgentStateRow> {
  const res = await ddb.send(
    new GetCommand({ TableName: AGENT_TABLE, Key: { pk: "SINGLETON" } }),
  );
  return (res.Item as AgentStateRow) ?? {
    pk: "SINGLETON",
    online: true,
    lastScanAt: new Date().toISOString(),
    missionsScanned: 0,
    missionsClaimed: 0,
    expectedValueUsd: 0,
  };
}

export async function putAgentState(state: AgentStateRow): Promise<void> {
  await ddb.send(new PutCommand({ TableName: AGENT_TABLE, Item: state }));
}
