import { keccak256, toBytes } from "viem";
import { callContract } from "./cdp.js";

const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS ?? "";

// Minimal ABI — only the functions the agent calls
const escrowAbi = [
  {
    type: "function",
    name: "pickup",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "submitProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "reportHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

export async function pickup(taskId: number): Promise<string> {
  return callContract({
    to: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "pickup",
    args: [BigInt(taskId)],
  });
}

export async function submitProof(
  taskId: number,
  reportBody: string,
): Promise<{ txHash: string; reportHash: string }> {
  const reportHash = keccak256(toBytes(reportBody));
  const txHash = await callContract({
    to: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "submitProof",
    args: [BigInt(taskId), reportHash],
  });
  return { txHash, reportHash };
}
