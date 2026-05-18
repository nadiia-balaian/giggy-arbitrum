# contracts/

Solidity escrow that holds USDC bounties for tasks. Built with Foundry.

## State machine

```
Open → Assigned → Submitted → Released
  │        │          │
  └────────┴──────────┴──→ Refunded   (poster pulls funds back at any time before Released)
```

Only the registered agent address (set in the constructor) can call `pickup` and `submitProof`. Multi-agent support is a roadmap item.

## Setup

```bash
# 1. Install Foundry once: https://book.getfoundry.sh/getting-started/installation
curl -L https://foundry.paradigm.xyz | bash && foundryup

# 2. Install forge-std
forge install foundry-rs/forge-std --no-commit

# 3. Run tests
forge test -vv
```

## Deploy to Arbitrum Sepolia

```bash
cp .env.example .env
# fill in PRIVATE_KEY, AGENT_ADDRESS, ARBISCAN_API_KEY

source .env
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --broadcast \
  --verify

# Copy the deployed address into addresses.json + each subproject's .env
```

## ABI

After `forge build`, ABIs land at `out/TaskEscrow.sol/TaskEscrow.json`. Both `backend/` and `frontend/` consume that file directly.
