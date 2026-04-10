# `bounty_board`

Soroban escrow contract for the TaskMesh bounty board.

## What is here now

- storage model for bounty state and escrow bookkeeping
- explicit lifecycle enum, stronger auth checks, and state guards
- contract methods:
  - `create_bounty`
  - `accept_bounty`
  - `submit_work`
  - `verify_and_payout`
  - `cancel_bounty`
- SAC token-client transfer calls for escrow funding, payout, and refund
- lifecycle events for indexing and backend sync

## What is still not proven here

- end-to-end integration tests against a funded testnet contract under repeatable CI automation
- operational policy around who controls poster/worker keys and how signatures are produced in production

## Data model

Each bounty stores:

- poster address
- reward token address
- reward amount
- metadata URI
- status
- accepted worker address
- proof submission metadata
- payout receipt metadata
- escrow funding / release / refund flags and timestamps
- created and updated timestamps

The current design assumes TaskMesh stores richer off-chain metadata in the backend, while Soroban stores the authoritative escrow and state transition record.

## Phase C backend integration

TaskMesh now includes a server-side Soroban adapter in [server/stellar/bounty-board.ts](/home/samfresh22/taskmesh/server/stellar/bounty-board.ts).

What that means:

- the backend can execute real RPC calls when the required env vars are configured
- otherwise it returns an explicit demo mirror result
- bounty API responses report whether each lifecycle action stayed local, mirrored in demo mode, or actually attempted Stellar RPC
- `cancel_bounty` is part of the same adapter surface alongside create, accept, submit, and verify

## Deployment path

A Stellar testnet deployment has already been completed from this repo workflow. Use [testnet-deploy-checklist.md](/home/samfresh22/taskmesh/contracts/bounty_board/testnet-deploy-checklist.md) as the clean reference for repeating, rotating, or auditing that path.
