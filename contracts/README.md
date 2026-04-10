# Soroban Contracts

This directory holds the on-chain contract work for TaskMesh.

## Current status

- `bounty_board/` exists and models the intended Soroban bounty escrow lifecycle.
- The repo now includes a backend adapter and deploy checklist, but it does not claim a live deployment.
- The contract now includes token funding, payout, and refund paths, but those flows are not yet proven against a live funded testnet deployment from this environment.

## Intended flow

1. Poster creates a bounty and funds escrow.
2. Worker accepts the bounty.
3. Worker submits proof metadata.
4. Poster verifies the proof.
5. Contract releases payout to the worker.

## Build notes

Expected modern CLI flow:

```bash
cd contracts/bounty_board
stellar contract build
```

If your local environment still uses the older Soroban CLI naming, adapt the build command to your installed toolchain.

## Deploy notes

Before a real testnet deployment, confirm:

- the current Soroban SDK / CLI version builds the contract cleanly
- contract auth policy matches the identities you actually plan to use
- integration tests against Stellar testnet
- backend calls from `/api/bounties/*` into the deployed contract

Use [bounty_board/testnet-deploy-checklist.md](/home/samfresh22/taskmesh/contracts/bounty_board/testnet-deploy-checklist.md) as the Phase C deployment path.
