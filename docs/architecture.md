# TaskMesh Architecture

TaskMesh is now split across four concrete layers:

1. product UI in the Next.js app
2. bounty lifecycle backend
3. Soroban escrow contract plus RPC adapter
4. optional service-payment lanes for agent-to-agent paid calls

## Core files

- [lib/bounty-domain.ts](/home/samfresh22/taskmesh/lib/bounty-domain.ts): shared domain types for bounty state, chain actions, payout receipts, evidence, and service payments
- [server/bounties/repository.ts](/home/samfresh22/taskmesh/server/bounties/repository.ts): repo-local JSON-backed persistence for bounty records
- [server/bounties/service.ts](/home/samfresh22/taskmesh/server/bounties/service.ts): lifecycle mutations, evidence recording, and API-facing action disposition
- [server/stellar/bounty-board.ts](/home/samfresh22/taskmesh/server/stellar/bounty-board.ts): Soroban adapter that attempts real RPC only when env is configured
- [lib/service-payments.ts](/home/samfresh22/taskmesh/lib/service-payments.ts): x402 and MPP adapter boundary with quote, authorization, and settlement models
- [contracts/bounty_board/src/lib.rs](/home/samfresh22/taskmesh/contracts/bounty_board/src/lib.rs): on-chain escrow state machine with token funding / payout / refund flows

## Bounty lifecycle mapping

TaskMesh uses one lifecycle across backend and contract:

1. `create_bounty`
2. `accept_bounty`
3. `submit_work`
4. `verify_and_payout`
5. `cancel_bounty`

The backend persists the richer off-chain record. The contract models the escrow authority in code, and the repo workflow now has a confirmed Stellar testnet deployment plus live backend RPC invocation proof.

## Phase C persistence model

Before Phase C, bounty mutation lived in process memory.

Now:

- bounty state persists to `.taskmesh/bounties.json` by default
- the file is seeded from `lib/taskmesh-data.ts` on first use
- every mutation rewrites the JSON payload transparently
- API responses expose the file path and store status

This is intentionally simple. It survives process restarts better than the old in-memory path without introducing a second database dependency for bounties.

## Phase C Soroban integration model

The server adapter exposes:

- `createBountyOnChain`
- `acceptBountyOnChain`
- `submitWorkOnChain`
- `verifyAndPayoutOnChain`
- `cancelBountyOnChain`

Each action returns a structured result with:

- `mode: real | demo`
- `status`
- `disposition`
- RPC metadata when attempted
- explorer URL when available

Three outcomes are explicit:

- `persisted_locally_only`
- `demo_mirrored`
- `stellar_rpc_attempted`

Configured live mode still does not mean the contract is production-ready. It means the repo can execute real RPC calls to a deployed contract id and record the resulting chain evidence honestly.

## Payment-lane architecture

The service payment path now separates:

- quote
- authorization
- settlement

If provider env vars are missing:

- TaskMesh returns an explicit demo-safe receipt

If provider env vars are present:

- TaskMesh attempts a real HTTP provider request
- failures are recorded as failures
- TaskMesh does not silently downgrade the result to demo success

## Evidence model

Bounty records can now accumulate:

- proof artifact evidence
- contract-call evidence
- payout transaction evidence
- service-payment evidence

This keeps the backend ready for explorer links and real proof surfaces even before the frontend consumes every field.

## Reality boundary

### Real now

- file-backed bounty persistence
- honest action-disposition reporting
- deployed Stellar testnet bounty-board contract
- Soroban adapter support across the full bounty lifecycle with confirmed live RPC invocation
- richer x402 / MPP adapter boundary
- payout and evidence metadata storage

### Real if configured

- Soroban RPC calls against a deployed contract id
- live provider calls for x402 / MPP-style service lanes

### Still not real yet

- repeatable automated deployment and rotation workflow in CI
- contract event indexing
- per-agent key management
- networked autonomous workers
