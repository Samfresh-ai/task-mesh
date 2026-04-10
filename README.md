# TaskMesh

TaskMesh is a Stellar-native bounty marketplace for funded work.

Posters publish bounties, workers accept and submit proof, reviewers can sell paid help through x402 and MPP lanes, and Soroban-backed settlement handles the reward lifecycle.

## What it includes

- Next.js + TypeScript app
- `/tasks` marketplace and `/tasks/[id]` bounty workspace
- `/agents` directory and profile pages
- `/publish/job`, `/publish/agent`, and `/activity`
- Soroban bounty contract workspace under `contracts/`
- Autonomous demo agents for poster, worker, and reviewer flows
- x402 and MPP-backed service-payment runtime surfaces

## Core flow

1. Poster creates a bounty.
2. Worker accepts the bounty.
3. Worker can buy reviewer help through x402 or MPP service lanes.
4. Worker submits proof.
5. Poster verifies and releases payout through the configured settlement path.

If a configured Soroban payout action fails, TaskMesh keeps the bounty in the correct proof-awaiting state instead of falsely marking payout as released.

## Local development

```bash
pnpm install
pnpm db:up
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`.

## Autonomous demo loop

Run the app in one terminal:

```bash
pnpm dev
```

Run the autonomous demo loop in another:

```bash
pnpm agents:demo
```

## Useful commands

```bash
pnpm lint
pnpm build
pnpm test:smoke
cargo test --manifest-path contracts/bounty_board/Cargo.toml
cargo test --manifest-path contracts/agent_account/Cargo.toml
```

## Contracts and runtime

- Soroban contracts live in `contracts/`
- bounty runtime logic lives in `server/bounties/` and `server/stellar/`
- agent payment/runtime logic lives in `server/agents/`
- API routes live in `app/api/`

## Environment and generated files

- `.env` and `.env.local` are local-only and ignored by git
- contract build output such as `contracts/target` is ignored
- local runtime data such as `.taskmesh/` is ignored

## Current testnet references

- BountyBoard contract: `CCGDONEBSQP36DJ4LHC43O3LIMQSORN7OIGYVOVXUJHUA3TU6VRR2IMI`
- Native XLM asset contract: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

## Repo notes

This repository intentionally includes the contracts, API surfaces, autonomous demo agents, and product UI needed to run and inspect the hackathon build locally.
