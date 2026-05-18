import { CdpClient } from "@coinbase/cdp-sdk";
import { encodeFunctionData, type Abi } from "viem";

let client: CdpClient | null = null;

function getCdp(): CdpClient {
  if (!client) {
    client = new CdpClient();
  }
  return client;
}

/** Returns the agent's EVM address (creates if first run, reuses if exists). */
export async function getAgentAddress(): Promise<string> {
  const cdp = getCdp();
  const account = await cdp.evm.getOrCreateAccount({ name: "giggy-arbitrum-agent" });
  return account.address;
}

/** Send a raw transaction from the agent wallet. Returns tx hash. */
export async function sendTransaction(params: {
  to: string;
  data?: string;
  value?: bigint;
}): Promise<string> {
  const cdp = getCdp();
  const address = await getAgentAddress();
  const result = await cdp.evm.sendTransaction({
    address,
    transaction: {
      to: params.to as `0x${string}`,
      data: params.data as `0x${string}` | undefined,
      value: params.value ? `0x${params.value.toString(16)}` : undefined,
    },
    network: "arbitrum-sepolia",
  });
  return result.transactionHash;
}

/** Encode + send a contract call from the agent wallet. Returns tx hash. */
export async function callContract(params: {
  to: string;
  abi: Abi;
  functionName: string;
  args: unknown[];
}): Promise<string> {
  const data = encodeFunctionData({
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
  });
  return sendTransaction({ to: params.to, data });
}
