// Fund any wallet with Arbitrum Sepolia test USDC + ETH.
// Usage: node scripts/fund-wallet.mjs <address>

import dotenv from "dotenv";
dotenv.config();

import { CdpClient } from "@coinbase/cdp-sdk";

const address = process.argv[2];
if (!address) {
  console.error("Usage: node scripts/fund-wallet.mjs <0xAddress>");
  process.exit(1);
}

const cdp = new CdpClient();

console.log(`Funding ${address} on Arbitrum Sepolia...\n`);

try {
  const ethFaucet = await cdp.evm.requestFaucet({ address, network: "arbitrum-sepolia", token: "eth" });
  console.log(`✅ ETH: https://sepolia.arbiscan.io/tx/${ethFaucet.transactionHash}`);
} catch (e) {
  console.log(`⚠️  ETH faucet: ${e.message}`);
}

try {
  const usdcFaucet = await cdp.evm.requestFaucet({ address, network: "arbitrum-sepolia", token: "usdc" });
  console.log(`✅ USDC: https://sepolia.arbiscan.io/tx/${usdcFaucet.transactionHash}`);
} catch (e) {
  console.log(`⚠️  USDC faucet: ${e.message}`);
}

console.log("\nDone!");
