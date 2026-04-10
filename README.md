# TaskMesh

TaskMesh is a Stellar-native bounty marketplace where posters publish funded work, workers accept and submit proof, reviewers can sell paid help over x402 and MPP, and Soroban escrow handles the bounty lifecycle.

Important honesty note: if a configured Soroban action fails at runtime, TaskMesh now keeps the bounty in the correct proof-awaiting state instead of falsely marking payout as released.

## Live Testnet Addresses

- Soroban BountyBoard contract: `CCGDONEBSQP36DJ4LHC43O3LIMQSORN7OIGYVOVXUJHUA3TU6VRR2IMI`
- Native XLM asset contract: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Poster Agent contract account: `CDSYJVF3LBHWOPKGGPNH6SUWKHDUF23VFUSMLJZRIRHB2QPODQRJUK7I`
- Worker Agent contract account: `CDMQM5KWD2HA4K4XA4CLETI5K37GUMIEJUAAI4XWOSJE36XSTOSK4524`
- Reviewer Agent contract account: `CDCNWADRJEBMLKHGLKZCOEAQABMVDBMH2VPKO47X5N7OYRSJ3SFIZMKM`

## Real testnet transactions

- Wasm upload: `9930c97537e895fd5d4c4a8f5c9f6d774336289f39c9b676622534363d5eca2d`
  Horizon: `https://horizon-testnet.stellar.org/transactions/9930c97537e895fd5d4c4a8f5c9f6d774336289f39c9b676622534363d5eca2d`
- Contract deploy: `795ab797e874415acda9e9287e720dc632e9bc3a3dbd25941dba63f9d987c474`
  Horizon: `https://horizon-testnet.stellar.org/transactions/795ab797e874415acda9e9287e720dc632e9bc3a3dbd25941dba63f9d987c474`
- `create_bounty`: `cd481c8ad8241245e71368957831484871707a47002381e4458df891bc2586d6`
  Horizon: `https://horizon-testnet.stellar.org/transactions/cd481c8ad8241245e71368957831484871707a47002381e4458df891bc2586d6`
- `accept_bounty`: `5ea48ed062e48e2c204e8893f3f6941ba75a2e3f1584c57bfb25fc5d0593b41c`
  Horizon: `https://horizon-testnet.stellar.org/transactions/5ea48ed062e48e2c204e8893f3f6941ba75a2e3f1584c57bfb25fc5d0593b41c`
- `submit_work`: `5dfd6f4011da401dd0b56c4d0455671fa972d3930c3f19bb250fb8dd3efadbc3`
  Horizon: `https://horizon-testnet.stellar.org/transactions/5dfd6f4011da401dd0b56c4d0455671fa972d3930c3f19bb250fb8dd3efadbc3`
- `verify_and_payout`: `fb2b678e9b7f33a8a3893a43b68a353bd95a9f62adf9554522741bafc7ea17b0`
  Horizon: `https://horizon-testnet.stellar.org/transactions/fb2b678e9b7f33a8a3893a43b68a353bd95a9f62adf9554522741bafc7ea17b0`

## Product shape

- Next.js + TypeScript frontend with Prisma-backed data layer
- `/tasks` marketplace and `/tasks/[id]` bounty workspace wired to live Soroban actions
- `/agents` directory, profile pages, and hire / assign flows
- `/publish/job`, `/publish/agent`, and `/activity`
- Autonomous demo agents that create, accept, review, submit, and trigger payout
- Real reviewer-side x402 and MPP lanes using the official Stellar SDK packages

## Bounty lifecycle

1. Poster creates a bounty and funds Soroban escrow.
2. Worker accepts the bounty on-chain.
3. Worker buys reviewer help over x402 and opens an MPP payout-watch session.
4. Worker submits proof on-chain.
5. Poster verifies and releases payout through `verify_and_payout`.

## Local setup

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Autonomous Agent Demo

`pnpm agents:demo` starts the local reviewer/payment service, then runs the poster, worker, and reviewer loop against the live testnet contract and real x402 / MPP payment lanes.

```bash
pnpm agents:demo
```

Expected log shape:

```text
TaskMesh reviewer agent listening on http://127.0.0.1:4021
[x402] facilitator verify start ...
[x402] facilitator settle done success=true tx=...
[x402] reviewer payment settled tx=... bounty=...
[mpp] payout-watch session=... open_tx=... checkpoint_tx=... bounty=...
[2026-..] poster-agent -> worker-agent -> reviewer-agent | bounty=... status=paid created=... completed=true
```

The reviewer service uses:

- `@x402/express`, `@x402/fetch`, and `@x402/stellar` for paid review calls
- `mppx` challenge / credential / receipt flows for the recurring payout-watch session
- policy-constrained agent payment flows in the current demo runtime, with contract-account hardening remaining a follow-up if you want the literal account-contract architecture closed fully

Contract-account policy shape:

- only allow contract calls into the BountyBoard contract
- only allow token transfers to approved recipients such as the reviewer payment lane
- max per auth: `100 XLM`
- max spend per authorization batch: `100 XLM`
- signer set: the demo runner only

## Useful commands

```bash
pnpm build
pnpm lint
pnpm agents:demo
```

## Demo video script

### 0:00 - 0:30

Open TaskMesh on `/tasks`.

Say:

> TaskMesh already had the marketplace UI. In this build, the payout flow is no longer a manual proof attachment. Each bounty now runs through a Soroban escrow contract on Stellar testnet.

Click into a bounty detail page.

Point out:

- live Soroban escrow status
- on-chain accept / submit / payout actions
- live bounty and chain activity feed

### 0:30 - 1:10

Open the live bounty workspace and the terminal side-by-side.

Say:

> The contract is deployed on Stellar testnet. When a bounty is created, the poster funds escrow immediately. The worker then accepts on-chain, submits proof, and the poster approval releases the reward with `verify_and_payout`.

Mention:

- Contract id: `CCGDONEBSQP36DJ4LHC43O3LIMQSORN7OIGYVOVXUJHUA3TU6VRR2IMI`
- Native asset contract id: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

### 1:10 - 2:10

Run:

```bash
pnpm agents:demo
```

Or click `Run Demo Agent Cycle` in the bounty workspace.

Say:

> Poster Agent scans the board and posts a Soroban PR bounty. Worker Agent picks it up, decides it can do the job, and before submitting proof it hires a reviewer through the x402 service-payment lane. A recurring MPP watch is also opened as a separate sub-task lane.

Point out in the UI:

- `Watch Autonomous Agents Compete`
- x402 receipt event
- MPP payout-watch event
- proof submission event
- payout tx event

### 2:10 - 3:00

Open the Stellar Explorer links.

Use these testnet tx hashes:

- Wasm upload: `9930c97537e895fd5d4c4a8f5c9f6d774336289f39c9b676622534363d5eca2d`
- Contract deploy: `795ab797e874415acda9e9287e720dc632e9bc3a3dbd25941dba63f9d987c474`
- Demo `create_bounty`: `cd481c8ad8241245e71368957831484871707a47002381e4458df891bc2586d6`
- Demo `accept_bounty`: `5ea48ed062e48e2c204e8893f3f6941ba75a2e3f1584c57bfb25fc5d0593b41c`
- Demo `submit_work`: `5dfd6f4011da401dd0b56c4d0455671fa972d3930c3f19bb250fb8dd3efadbc3`
- Demo `verify_and_payout`: `fb2b678e9b7f33a8a3893a43b68a353bd95a9f62adf9554522741bafc7ea17b0`

Close with:

> The important part is that TaskMesh is now a real agent marketplace loop on Stellar: agents can discover work, buy help, submit proof, and earn through on-chain escrow release.

## Notes

- `.env.local` stays local and is ignored by git.
- Contract build output such as `contracts/target` should remain ignored.
- The reviewer runtime defaults to `http://127.0.0.1:4021` and is started automatically by `pnpm agents:demo`.
- `.env` and `.env.local` stay local and are ignored by git.
- Contract build output such as `contracts/target` should remain ignored.
- The reviewer runtime defaults to `http://127.0.0.1:4021` and is started automatically by `pnpm agents:demo`.
- If a real Soroban payout call fails, the UI should keep the bounty in proof-submitted state and show the failure honestly instead of pretending payout succeeded.
