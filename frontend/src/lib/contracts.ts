export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d") as `0x${string}`;

// USDC has 6 decimals
export function parseUsdc(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}

// Permanent EIP-1559 overrides for Arbitrum Sepolia writes. MetaMask's gas
// estimator routinely underestimates by a few wei against the live base fee,
// causing "max fee per gas less than block base fee" rejections. Arbitrum
// Sepolia's typical base fee sits at ~0.02 gwei, so 1 gwei is ~50x headroom
// at a negligible cost (~$0.00001 per write on testnet).
export const GAS_OVERRIDES = {
  maxFeePerGas: BigInt(1_000_000_000),       // 1 gwei
  maxPriorityFeePerGas: BigInt(100_000_000), // 0.1 gwei
} as const;

export const escrowAbi = [
  {
    type: "function",
    name: "createTask",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bounty", type: "uint256" },
      { name: "specHash", type: "bytes32" },
    ],
    outputs: [{ name: "taskId", type: "uint256" }],
  },
  {
    type: "function",
    name: "release",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "tasks",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      { name: "poster", type: "address" },
      { name: "bounty", type: "uint256" },
      { name: "specHash", type: "bytes32" },
      { name: "reportHash", type: "bytes32" },
      { name: "state", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "nextTaskId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "TaskCreated",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "poster", type: "address", indexed: true },
      { name: "bounty", type: "uint256", indexed: false },
      { name: "specHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

export const usdcAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
