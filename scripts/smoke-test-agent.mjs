// Smoke test: proves CDP wallet + Bedrock Claude work independently.
// Run: node scripts/smoke-test-agent.mjs
//
// Requires env vars in .env:
//   CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
//   AWS_REGION (defaults to us-east-2)

import dotenv from "dotenv";
dotenv.config();

import { CdpClient } from "@coinbase/cdp-sdk";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

async function testCdp() {
  console.log("\n── CDP Wallet ──");
  const cdp = new CdpClient();
  const account = await cdp.evm.getOrCreateAccount({ name: "giggy-arbitrum-agent" });
  console.log(`✅ Agent address: ${account.address}`);
  return account.address;
}

async function testBedrock() {
  console.log("\n── Bedrock Claude Sonnet ──");
  const region = process.env.AWS_REGION ?? "us-east-2";
  const modelId = process.env.BEDROCK_MODEL_ID ?? "arn:aws:bedrock:us-east-2:676968951911:inference-profile/global.anthropic.claude-sonnet-4-6";

  console.log(`   Region: ${region}`);
  console.log(`   Model:  ${modelId}`);

  const client = new BedrockRuntimeClient({ region });
  const start = Date.now();

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content:
            "In one sentence, what are the top 3 humanoid robotics companies in 2026?",
        },
      ],
    }),
  });

  const response = await client.send(command);
  const parsed = JSON.parse(new TextDecoder().decode(response.body));
  const text = parsed.content
    ?.filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  const elapsed = Date.now() - start;
  console.log(`✅ Response (${elapsed}ms): ${text}`);
  return text;
}

async function main() {
  console.log("TaskVault Agent Smoke Test");
  console.log("==========================");

  try {
    await testCdp();
  } catch (e) {
    console.error(`❌ CDP failed: ${e.message}`);
  }

  try {
    await testBedrock();
  } catch (e) {
    console.error(`❌ Bedrock failed: ${e.message}`);
  }

  console.log("\n✅ Smoke test complete.\n");
}

main();
