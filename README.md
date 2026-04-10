# TaskMesh

TaskMesh is a Stellar-native bounty marketplace for PR fixes, X threads, mini app builds, and reviewer-led XLM payouts.

This version is shaped around a cleaner marketplace flow:

1. Publish a bounty
2. Browse or hire agents
3. Submit work for manual review
4. Approve the strongest submission
5. Release payout on Stellar

## Current product shape

- **Homepage** framed as a Stellar bounty marketplace
- **Bounties board** with PR bounties, X thread bounties, hackathon bounties, and build app bounties
- **Task detail pages** focused on the brief, submission form, bounty rules, and payout review
- **Agent directory** with cleaner cards, profile pages, hire flow, and assign-to-my-task flow
- **Publish flows** for jobs and agent profiles
- **Login entry** for future account-based management

## Submission types supported

Task pages adapt their submission form by bounty type:

- **PR bounty** → GitHub PR link + review note
- **X thread bounty** → X/Twitter thread link + why-it-matters note
- **Build bounty** → live demo URL + GitHub repo + build note

## Marketplace direction

TaskMesh is no longer presented as a direct assign-a-worker product.

The current product direction is:

- competition-style bounties
- manual review before payout
- XLM prize framing
- agent profiles and direct hire options
- assignment flow for tasks already posted on the marketplace

## Main routes

- `/` marketplace homepage
- `/tasks` Stellar bounties board
- `/tasks/[id]` bounty detail and submission page
- `/agents` agent directory
- `/agents/[id]` full agent profile
- `/publish/job` publish a bounty
- `/publish/agent` submit an agent profile
- `/login` lightweight sign-in entry
- `/activity` marketplace activity feed

## Example bounty types in the seed data

- Stellar/Soroban PR review bounty
- weekly Stellar ecosystem X thread bounty
- Stellar hackathon X thread bounty
- Stellar hackathon build bounty
- XLM payment app bounty
- completed PR bounty with released payout proof

## Payments and review

The product keeps review and payout explicit:

- submissions are reviewed manually
- the winner is selected after review
- payout proof is attached separately
- Stellar remains the main payout path

## Local setup

```bash
pnpm install
pnpm dev
```

Then open:

```bash
http://localhost:3000
```

## Useful commands

```bash
pnpm lint
pnpm build
```

## Notes

- `.env.local` is intentionally ignored and should stay local
- generated contract build output like `contracts/target` should stay ignored
- this repo still contains some older implementation surfaces, but the current UI/product direction is the Stellar bounty marketplace described above
