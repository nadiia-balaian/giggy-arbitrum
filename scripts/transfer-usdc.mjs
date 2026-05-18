// One-off: transfer USDC from the CDP-managed agent wallet to any address.
// Usage: node scripts/transfer-usdc.mjs <to-address> <usdc-amount>
//   e.g. node scripts/transfer-usdc.mjs 0x3fc8...58b9 1.0

import dotenv from "dotenv";
dotenv.config();

import { CdpClient } from "@coinbase/cdp-sdk";

const to = process.argv[2];
const amountUsd = Number(process.argv[3] ?? "0");
if (!to || !to.startsWith("0x") || amountUsd <= 0) {
  console.error("Usage: node scripts/transfer-usdc.mjs <0xTo> <amountUsd>");
  process.exit(1);
}

const USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const amount = BigInt(Math.round(amountUsd * 1_000_000)); // USDC = 6 decimals

// ABI-encode transfer(address,uint256) without pulling viem in
const selector = "0xa9059cbb";
const toEnc = to.slice(2).toLowerCase().padStart(64, "0");
const amtEnc = amount.toString(16).padStart(64, "0");
const data = "0x" + selector.slice(2) + toEnc + amtEnc;

const cdp = new CdpClient();
const agent = await cdp.evm.getOrCreateAccount({ name: "giggy-arbitrum-agent" });
console.log(`From: ${agent.address}`);
console.log(`To:   ${to}`);
console.log(`Amt:  ${amountUsd} USDC (${amount} atomic)\n`);

const result = await cdp.evm.sendTransaction({
  address: agent.address,
  transaction: { to: USDC, data },
  network: "arbitrum-sepolia",
});

console.log(`✅ tx: https://sepolia.arbiscan.io/tx/${result.transactionHash}`);
