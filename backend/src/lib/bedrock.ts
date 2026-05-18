import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const region = process.env.AWS_REGION ?? "us-east-2";
// Bedrock requires the inference profile ARN, not the raw model ID.
// Format: arn:aws:bedrock:<region>:<account>:inference-profile/global.anthropic.claude-sonnet-4-6
const modelId = process.env.BEDROCK_MODEL_ID ?? "";

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!client) {
    client = new BedrockRuntimeClient({ region });
  }
  return client;
}

/** Call Claude Sonnet on Bedrock. Returns the text response. */
export async function invokeClaude(
  prompt: string,
  system?: string,
  maxTokens = 4096,
): Promise<string> {
  const body: Record<string, unknown> = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) {
    body.system = system;
  }

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  });

  const response = await getClient().send(command);
  const parsed = JSON.parse(new TextDecoder().decode(response.body));

  // Anthropic response: { content: [{ type: "text", text: "..." }] }
  const text = parsed.content
    ?.filter((c: { type: string }) => c.type === "text")
    .map((c: { text: string }) => c.text)
    .join("");

  return text ?? "";
}
