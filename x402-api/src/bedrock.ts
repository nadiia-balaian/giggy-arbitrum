import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const region = process.env.AWS_REGION ?? "us-east-2";
const modelId = process.env.BEDROCK_MODEL_ID ?? "";

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!client) client = new BedrockRuntimeClient({ region });
  return client;
}

export async function invokeClaude(
  prompt: string,
  system?: string,
  maxTokens = 1024,
): Promise<string> {
  const body: Record<string, unknown> = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) body.system = system;

  const response = await getClient().send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    }),
  );
  const parsed = JSON.parse(new TextDecoder().decode(response.body));
  return (
    parsed.content
      ?.filter((c: { type: string }) => c.type === "text")
      .map((c: { text: string }) => c.text)
      .join("") ?? ""
  );
}
