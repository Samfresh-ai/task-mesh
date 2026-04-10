# TaskMesh `bounty_board` Testnet Deploy Checklist

This repo does not claim a live deployment. This checklist is the Phase C path
to a real Soroban testnet deployment from a machine with the Stellar CLI and
testnet identities available.

## 1. Confirm the escrow implementation in your local toolchain

The contract now includes:

- token transfer into contract escrow during `create_bounty`
- token transfer from contract escrow to worker during `verify_and_payout`
- token refund from contract escrow back to poster during `cancel_bounty`
- focused unit-test coverage for open -> accepted -> submitted -> paid and open -> canceled

Before testnet deploy, verify that your local Stellar CLI / SDK version can build and execute the contract exactly as committed in this repo.

Verified locally in this repo:

- `cargo test` passes in `/home/samfresh22/taskmesh/contracts/bounty_board`
- `cargo build --target wasm32v1-none --release` succeeds and produces:
  - `/home/samfresh22/taskmesh/contracts/target/wasm32v1-none/release/bounty_board.wasm`

## 2. Prepare deployment inputs

- Poster deployer identity funded on Stellar testnet
- Reward token contract address for the asset you want the contract to hold
- RPC URL for testnet
- The network passphrase for Stellar testnet

Recommended env names for this repo:

```bash
export STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
export STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
export STELLAR_BOUNTY_REWARD_TOKEN_ADDRESS="C..."
export STELLAR_BOUNTY_POSTER_SECRET="S..."
export STELLAR_BOUNTY_WORKER_SECRET="S..."
```

## 3. Build the contract

The modern CLI path is:

```bash
cd contracts/bounty_board
stellar contract build
```

Equivalent verified fallback on this machine:

```bash
cd contracts/bounty_board
cargo build --target wasm32v1-none --release
```

If your installed CLI uses older Soroban subcommands, adapt the command to your local version.

## 4. Install and deploy on testnet

Exact subcommand flags vary by CLI version, but the normal flow is:

1. Install the built Wasm on testnet
2. Deploy a contract instance from that Wasm
3. Record the returned contract id

Typical commands look like:

```bash
stellar contract install --wasm target/wasm32v1-none/release/bounty_board.wasm --network testnet
stellar contract deploy --wasm-hash <installed_wasm_hash> --source <poster_identity> --network testnet
```

Do not treat those commands as copy-paste guaranteed. Confirm them against the CLI version on the deployment machine.

## 5. Feed the deployment back into TaskMesh

Set these env vars in the app runtime:

```bash
STELLAR_BOUNTY_BOARD_CONTRACT_ID="C..."
STELLAR_BOUNTY_REWARD_TOKEN_ADDRESS="C..."
STELLAR_BOUNTY_POSTER_SECRET="S..."
STELLAR_BOUNTY_WORKER_SECRET="S..."
STELLAR_BOUNTY_TOKEN_DECIMALS="7"
```

With those set, newly created bounties can attempt:

- `create_bounty`
- `accept_bounty`
- `submit_work`
- `verify_and_payout`
- `cancel_bounty`

through [`server/stellar/bounty-board.ts`](/home/samfresh22/taskmesh/server/stellar/bounty-board.ts).

## 6. Verify from TaskMesh

Run:

```bash
pnpm agents:demo
```

Expected outcome:

- poster, worker, and reviewer agents complete one full bounty loop
- review and sub-task payments settle through live x402 and MPP paths
- logs include live Soroban transaction hashes for bounty actions and service payments

## 7. Still missing even after deployment

- per-agent Stellar key management
- a real token custody policy for poster/worker identities
- contract event indexing back into the backend
- end-to-end integration tests against a funded testnet contract
