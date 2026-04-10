import { bountyToTaskRecord } from "@/lib/bounty-domain";
import { requestPaidService } from "@/lib/service-payments";
import { getAgent } from "@/lib/taskmesh-data";
import { generateExecutionResult } from "@/lib/task-execution";
import {
  acceptBounty,
  appendBountyNote,
  createBounty,
  getBounty,
  listBounties,
  recordServicePayment,
  submitWork,
  verifyAndPayout,
} from "@/server/bounties/service";

const DEFAULT_POSTER_AGENT_ID = "anchor-harbor";
const DEFAULT_WORKER_AGENT_ID = "patchlane";
const REVIEWER_AGENT_LABEL = "Reviewer Agent";

type DemoCycleResult = {
  created: boolean;
  completed: boolean;
  bountyId: string;
  bountyStatus: string;
};

function futureIso(daysAhead: number) {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
}

async function ensureDemoBounty(targetBountyId?: string) {
  const existing =
    (targetBountyId ? getBounty(targetBountyId) : null) ??
    listBounties().find((bounty) => bounty.status === "open" || bounty.status === "accepted" || bounty.status === "submitted");

  if (existing) {
    return {
      bounty: existing,
      created: false,
    };
  }

  const created = await createBounty({
    title: "Autonomous Soroban PR bounty",
    description: "Poster Agent opened this bounty automatically to demonstrate escrow creation, worker pickup, paid review, and on-chain payout.",
    posterAgentId: DEFAULT_POSTER_AGENT_ID,
    rewardAmount: "35",
    rewardAssetCode: "XLM",
    desiredOutcome: "A proof-ready PR review memo plus a reviewer receipt that shows the worker hired paid help via x402 before submitting.",
    requiredSkills: ["Soroban PR review", "x402 review"],
    verificationChecklist: [
      "Worker must accept the bounty on-chain before submitting proof.",
      "A paid reviewer receipt should appear separately from payout proof.",
      "Poster approval should release the reward through Soroban escrow.",
    ],
    deadlineAt: futureIso(7),
  });

  appendBountyNote(created.bounty.id, {
    actor: "Poster Agent",
    message: "Scanned the board and auto-published a Soroban PR bounty with funded escrow.",
  });

  return {
    bounty: created.bounty,
    created: true,
  };
}

export async function runAutonomousDemoCycle(targetBountyId?: string): Promise<DemoCycleResult> {
  let { bounty, created } = await ensureDemoBounty(targetBountyId);
  const posterLabel = bounty.posterLabel;
  const worker = getAgent(bounty.workerAgentId ?? DEFAULT_WORKER_AGENT_ID) ?? getAgent(DEFAULT_WORKER_AGENT_ID);

  if (!worker) {
    throw new Error("Default demo worker agent is missing from the TaskMesh seed directory.");
  }

  if (bounty.status === "open") {
    appendBountyNote(bounty.id, {
      actor: worker.name,
      message: "Polled `/tasks`, scored this bounty as a strong fit, and decided to compete.",
    });

    bounty = (await acceptBounty(bounty.id, { workerAgentId: worker.id })).bounty;
  }

  if (bounty.status === "accepted") {
    appendBountyNote(bounty.id, {
      actor: worker.name,
      message: "Requested a paid repo-risk scan over x402 before packaging the final proof.",
    });

    const x402Receipt = await requestPaidService({
      bountyId: bounty.id,
      callerAgentId: worker.id,
      paymentMethod: "x402",
      serviceName: "Repo risk scan",
      endpoint: "/repo-risk-scan",
    });
    bounty = recordServicePayment(bounty.id, x402Receipt.payment).bounty;

    appendBountyNote(bounty.id, {
      actor: REVIEWER_AGENT_LABEL,
      message: "Opened an MPP payout-watch lane so the final release appears as a separate recurring service stream.",
    });

    const mppReceipt = await requestPaidService({
      bountyId: bounty.id,
      callerAgentId: worker.id,
      paymentMethod: "mpp",
      serviceName: "Payout watch",
      endpoint: "/payout-watch",
    });
    bounty = recordServicePayment(bounty.id, mppReceipt.payment).bounty;

    const execution = generateExecutionResult(bountyToTaskRecord(bounty), worker);
    bounty = (
      await submitWork(bounty.id, {
        workerAgentId: worker.id,
        summary: execution.deliverySummary,
        verifierNotes: `${execution.artifact.summary} Reviewer receipts were recorded separately via x402 and MPP.`,
        artifactUri: `https://taskmesh.demo/artifacts/${execution.artifact.artifactId.toLowerCase()}`,
        proofDigest: execution.artifact.artifactId,
      })
    ).bounty;

    appendBountyNote(bounty.id, {
      actor: REVIEWER_AGENT_LABEL,
      message: "Returned the paid review packet and marked the proof safe for poster approval.",
    });
  }

  if (bounty.status === "submitted") {
    appendBountyNote(bounty.id, {
      actor: "Poster Agent",
      message: "Verified the worker proof and triggered `verify_and_payout` on Soroban testnet.",
    });

    bounty = (
      await verifyAndPayout(bounty.id, {
        releasedBy: posterLabel,
        note: "Poster Agent auto-approved the reviewer-cleared proof and released Soroban escrow.",
      })
    ).bounty;
  }

  if (bounty.status === "paid") {
    appendBountyNote(bounty.id, {
      actor: "Poster Agent",
      message: "Autonomous cycle completed. Explorer evidence now shows the reward moving on Stellar testnet.",
    });
  }

  return {
    created,
    completed: bounty.status === "paid",
    bountyId: bounty.id,
    bountyStatus: bounty.status,
  };
}
