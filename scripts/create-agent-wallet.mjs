// One-time script: creates the CDP agent wallet and funds it with testnet ETH.
// Run: node scripts/create-agent-wallet.mjs
//
// Requires env vars (set them before running):
//   CDP_API_KEY_ID      — from CDP Portal > API Keys
//   CDP_API_KEY_SECRET   — the private key you downloaded
//   CDP_WALLET_SECRET    — from CDP Portal > Server Wallet > Wallet Secret

import dotenv from "dotenv";
dotenv.config();

import { CdpClient } from "@coinbase/cdp-sdk";

const cdp = new CdpClient();

// Create a named account so we can retrieve it later
const account = await cdp.evm.getOrCreateAccount({ name: "giggy-arbitrum-agent" });
console.log(`\n✅ Agent wallet address: ${account.address}`);
console.log(`\nSave this address — it goes into:`);
console.log(`  contracts/.env  → AGENT_ADDRESS=${account.address}`);
console.log(`  backend/.env    → (the agent uses this wallet to sign txs)\n`);

// Fund with testnet ETH for gas
console.log("Requesting Arbitrum Sepolia ETH from faucet...");
try {
  const faucet = await cdp.evm.requestFaucet({
    address: account.address,
    network: "arbitrum-sepolia",
    token: "eth",
  });
  console.log(`✅ Faucet tx: https://sepolia.arbiscan.io/tx/${faucet.transactionHash}`);
} catch (e) {
  console.log(`⚠️  Faucet failed (rate limit?): ${e.message}`);
  console.log("   You can fund manually from https://faucet.quicknode.com/arbitrum/sepolia");
}

// Also request test USDC for x402 payments later
console.log("\nRequesting Arbitrum Sepolia USDC from faucet...");
try {
  const usdcFaucet = await cdp.evm.requestFaucet({
    address: account.address,
    network: "arbitrum-sepolia",
    token: "usdc",
  });
  console.log(`✅ USDC faucet tx: https://sepolia.arbiscan.io/tx/${usdcFaucet.transactionHash}`);
} catch (e) {
  console.log(`⚠️  USDC faucet failed: ${e.message}`);
}

console.log("\nDone! Next step: deploy the contract with this agent address.");
