import { getAgent } from "@/lib/taskmesh-data";
import {
  getBountyImplementationBoundary,
  type BountyChainActionRecord,
  type BountyEvidenceLink,
  type BountyLifecycleEvent,
  type BountyRecord,
  type PersistenceDisposition,
  type PayoutReceipt,
  type ProofSubmission,
  type SubAgentServicePayment,
} from "@/lib/bounty-domain";
import { getBountyStoreStatus, getStoredBounty, listStoredBounties, saveStoredBounty, type BountyStoreStatus } from "@/server/bounties/repository";
import {
  acceptBountyOnChain,
  cancelBountyOnChain,
  createBountyOnChain,
  type OnChainActionResult,
  submitWorkOnChain,
  verifyAndPayoutOnChain,
} from "@/server/stellar/bounty-board";

export type CreateBountyInput = {
  title: string;
  description: string;
  posterAgentId: string;
  rewardAmount: string;
  rewardAssetCode: string;
  desiredOutcome: string;
  requiredSkills: string[];
  verificationChecklist: string[];
  deadlineAt: string;
};

export type AcceptBountyInput = {
  workerAgentId: string;
};

export type SubmitWorkInput = {
  workerAgentId: string;
  summary: string;
  verifierNotes: string;
  artifactUri?: string;
  proofDigest?: string;
};

export type VerifyAndPayoutInput = {
  releasedBy: string;
  note?: string;
};

export type CancelBountyInput = {
  canceledBy: string;
  reason: string;
};

export type BountyMutationResult = {
  bounty: BountyRecord;
  persistence: BountyStoreStatus;
  actionDisposition: PersistenceDisposition;
  chainSync: OnChainActionResult | null;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function now() {
  return new Date().toISOString();
}

function appUrl() {
  return process.env.APP_URL?.trim() || "http://localhost:3000";
}

function ensureBounty(id: string) {
  const bounty = getStoredBounty(id);
  if (!bounty) {
    throw new Error(`Unknown bounty: ${id}`);
  }

  return bounty;
}

function persistBounty(bounty: BountyRecord) {
  saveStoredBounty(bounty);

  return {
    bounty: clone(bounty),
    persistence: getBountyStoreStatus(),
  };
}

function makeEvent(input: Omit<BountyLifecycleEvent, "id" | "at"> & { at?: string }): BountyLifecycleEvent {
  return {
    id: globalThis.crypto.randomUUID(),
    at: input.at ?? now(),
    actor: input.actor,
    message: input.message,
    type: input.type,
  };
}

function makeChainRecord(result: OnChainActionResult, at: string): BountyChainActionRecord {
  return {
    id: globalThis.crypto.randomUUID(),
    action: result.action,
    status: result.status,
    mode: result.mode,
    disposition: result.disposition,
    at,
    contractId: result.contractId,
    contractBountyId: result.contractBountyId,
    txHash: result.txHash,
    explorerUrl: result.explorerUrl,
    explorerLabel: result.explorerLabel,
    rpcUrl: result.rpcUrl,
    note: result.note,
    requestSummary: result.requestSummary,
    responseSummary: result.responseSummary,
  };
}

function appendEvidence(bounty: BountyRecord, evidence: BountyEvidenceLink) {
  bounty.evidenceLinks = [evidence, ...bounty.evidenceLinks.filter((entry) => entry.id !== evidence.id)];
}

function applyChainResult(bounty: BountyRecord, result: OnChainActionResult, recordedAt: string) {
  bounty.chainActivity.unshift(makeChainRecord(result, recordedAt));

  if (result.contractId) {
    bounty.escrow.contractId = result.contractId;
  }

  if (result.contractBountyId) {
    bounty.escrow.contractBountyId = result.contractBountyId;
  }

  if (result.txHash) {
    appendEvidence(bounty, {
      id: `${result.action}-${result.txHash}`,
      label: result.explorerLabel ?? `Soroban tx ${result.txHash}`,
      kind: result.action === "verify_and_payout" ? "payout_tx" : "contract_call",
      url: result.explorerUrl,
      txHash: result.txHash,
      source: result.mode === "real" ? "stellar-rpc" : "taskmesh-demo-chain-adapter",
      note: result.note,
      mode: result.mode,
      addedAt: recordedAt,
    });
  }

  bounty.activity.unshift(
    makeEvent({
      actor: result.mode === "real" ? "TaskMesh Soroban adapter" : "TaskMesh demo chain adapter",
      message: `${result.action} ${result.status.replaceAll("_", " ")}. ${result.note}`,
      type: "note",
      at: recordedAt,
    }),
  );
}

function slugifyTitle(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  return slug || "bounty";
}

function mutationResult(bounty: BountyRecord, chainSync: OnChainActionResult | null): BountyMutationResult {
  const persisted = persistBounty(bounty);

  return {
    bounty: persisted.bounty,
    persistence: persisted.persistence,
    actionDisposition: chainSync?.disposition ?? "persisted_locally_only",
    chainSync,
  };
}

export function listBounties() {
  return listStoredBounties()
    .map((bounty) => clone(bounty))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function getBounty(id: string) {
  const bounty = getStoredBounty(id);
  return bounty ? clone(bounty) : null;
}

export function getBountyPersistenceStatus() {
  return getBountyStoreStatus();
}

export function appendBountyNote(id: string, input: { actor: string; message: string }) {
  const bounty = ensureBounty(id);
  const recordedAt = now();

  bounty.updatedAt = recordedAt;
  bounty.activity.unshift(
    makeEvent({
      actor: input.actor,
      message: input.message,
      type: "note",
      at: recordedAt,
    }),
  );

  return mutationResult(bounty, null);
}

export async function createBounty(input: CreateBountyInput): Promise<BountyMutationResult> {
  const createdAt = now();
  const bountyId = `${slugifyTitle(input.title)}-${createdAt.slice(11, 19).replaceAll(":", "").toLowerCase()}`;
  const posterLabel = getAgent(input.posterAgentId)?.name ?? input.posterAgentId;

  const bounty: BountyRecord = {
    id: bountyId,
    title: input.title,
    description: input.description,
    status: "open",
    escrowState: "funded",
    posterAgentId: input.posterAgentId,
    posterLabel,
    reward: {
      amount: input.rewardAmount,
      displayAmount: `${input.rewardAmount} ${input.rewardAssetCode}`,
      assetCode: input.rewardAssetCode,
    },
    desiredOutcome: input.desiredOutcome,
    requiredSkills: input.requiredSkills,
    verificationChecklist: input.verificationChecklist,
    deadlineAt: input.deadlineAt,
    createdAt,
    updatedAt: createdAt,
    escrow: {
      network: "demo",
      memo: `bounty:${bountyId}`,
    },
    servicePayments: [],
    chainActivity: [],
    evidenceLinks: [],
    activity: [
      makeEvent({
        actor: posterLabel,
        message: "Created a funded bounty record in the TaskMesh backend. Soroban sync status is attached separately.",
        type: "created",
        at: createdAt,
      }),
    ],
    implementation: getBountyImplementationBoundary(),
  };

  const chainSync = await createBountyOnChain({
    bounty,
    metadataUri: `${appUrl()}/tasks/${bountyId}`,
  });

  applyChainResult(bounty, chainSync, createdAt);

  if (chainSync.contractId) {
    bounty.escrow.contractId = chainSync.contractId;
  }

  if (chainSync.contractBountyId) {
    bounty.escrow.contractBountyId = chainSync.contractBountyId;
  }

  if (chainSync.mode === "real") {
    bounty.escrow.network = "stellar-testnet";
    bounty.escrow.explorerUrl = chainSync.explorerUrl;
  }

  return mutationResult(bounty, chainSync);
}

export async function acceptBounty(id: string, input: AcceptBountyInput): Promise<BountyMutationResult> {
  const bounty = ensureBounty(id);
  if (bounty.status !== "open") {
    throw new Error(`Bounty ${id} cannot be accepted from status ${bounty.status}.`);
  }

  const acceptedAt = now();
  const workerLabel = getAgent(input.workerAgentId)?.name ?? input.workerAgentId;

  bounty.status = "accepted";
  bounty.escrowState = "accepted";
  bounty.workerAgentId = input.workerAgentId;
  bounty.workerLabel = workerLabel;
  bounty.updatedAt = acceptedAt;
  bounty.activity.unshift(
    makeEvent({
      actor: workerLabel,
      message: "Accepted the bounty. Escrow stays locked while the worker prepares proof.",
      type: "accepted",
      at: acceptedAt,
    }),
  );

  const chainSync = await acceptBountyOnChain({ bounty });
  applyChainResult(bounty, chainSync, acceptedAt);

  return mutationResult(bounty, chainSync);
}

export async function submitWork(id: string, input: SubmitWorkInput): Promise<BountyMutationResult> {
  const bounty = ensureBounty(id);
  if (bounty.status !== "accepted") {
    throw new Error(`Bounty ${id} cannot accept proof from status ${bounty.status}.`);
  }
  if (bounty.workerAgentId && bounty.workerAgentId !== input.workerAgentId) {
    throw new Error(`Only the accepted worker can submit proof for ${id}.`);
  }

  const submittedAt = now();
  const workerLabel = getAgent(input.workerAgentId)?.name ?? input.workerAgentId;
  const proofSubmission: ProofSubmission = {
    id: globalThis.crypto.randomUUID(),
    bountyId: id,
    workerAgentId: input.workerAgentId,
    summary: input.summary,
    artifactUri: input.artifactUri,
    proofDigest: input.proofDigest,
    verifierNotes: input.verifierNotes,
    submittedAt,
  };

  bounty.status = "submitted";
  bounty.escrowState = "proof_submitted";
  bounty.workerAgentId = input.workerAgentId;
  bounty.workerLabel = workerLabel;
  bounty.proofSubmission = proofSubmission;
  bounty.updatedAt = submittedAt;
  bounty.activity.unshift(
    makeEvent({
      actor: workerLabel,
      message: "Submitted proof for poster verification and payout review.",
      type: "submitted",
      at: submittedAt,
    }),
  );

  appendEvidence(bounty, {
    id: `proof-${proofSubmission.id}`,
    label: proofSubmission.summary,
    kind: "proof_artifact",
    url: proofSubmission.artifactUri,
    source: "taskmesh-backend",
    note: "Proof submission persisted in the TaskMesh JSON bounty store.",
    mode: "demo",
    addedAt: submittedAt,
  });

  const chainSync = await submitWorkOnChain({ bounty });
  applyChainResult(bounty, chainSync, submittedAt);

  return mutationResult(bounty, chainSync);
}

export async function verifyAndPayout(id: string, input: VerifyAndPayoutInput): Promise<BountyMutationResult> {
  const bounty = ensureBounty(id);
  if (bounty.status !== "submitted") {
    throw new Error(`Bounty ${id} cannot be paid from status ${bounty.status}.`);
  }

  const releasedAt = now();
  const chainSync = await verifyAndPayoutOnChain({ bounty });
  const payoutSucceeded = chainSync.status === "confirmed" && Boolean(chainSync.txHash);

  const payoutReceipt: PayoutReceipt | undefined = payoutSucceeded
    ? {
        id: globalThis.crypto.randomUUID(),
        bountyId: id,
        releasedAt,
        releasedBy: input.releasedBy,
        amount: bounty.reward.amount,
        assetCode: bounty.reward.assetCode,
        network: chainSync.mode === "real" ? "Soroban on Stellar testnet" : "Stellar testnet payout proof",
        payoutTxHash: chainSync.txHash,
        explorerUrl: chainSync.explorerUrl,
        explorerLabel: chainSync.txHash ? `Soroban payout tx ${chainSync.txHash}` : undefined,
        contractCallTxHash: chainSync.txHash,
        contractCallExplorerUrl: chainSync.explorerUrl,
        mode: chainSync.mode,
        settlementMethod: chainSync.mode === "real" && chainSync.txHash ? "soroban_contract_call" : "soroban_escrow",
        note:
          input.note ??
          (chainSync.mode === "real" && chainSync.txHash
            ? "Poster verification triggered a real Soroban contract call through the configured Stellar RPC."
            : "Payout was released through the currently configured settlement path."),
      }
    : undefined;

  if (payoutSucceeded) {
    bounty.status = "paid";
    bounty.escrowState = "released";
    bounty.payoutReceipt = payoutReceipt;
    bounty.escrow.payoutTxHash = payoutReceipt?.payoutTxHash;
    bounty.escrow.explorerUrl = payoutReceipt?.explorerUrl;
    bounty.updatedAt = releasedAt;
    bounty.activity.unshift(
      makeEvent({
        actor: input.releasedBy,
        message: `Verified proof and submitted on-chain payout tx ${payoutReceipt?.payoutTxHash}.`,
        type: "paid",
        at: releasedAt,
      }),
    );

    if (payoutReceipt?.explorerUrl || payoutReceipt?.payoutTxHash) {
      appendEvidence(bounty, {
        id: `payout-${payoutReceipt.id}`,
        label: payoutReceipt.explorerLabel ?? "Payout evidence",
        kind: "payout_tx",
        url: payoutReceipt.explorerUrl,
        txHash: payoutReceipt.payoutTxHash,
        source: payoutReceipt.mode === "real" ? "stellar-rpc" : "taskmesh-backend",
        note: payoutReceipt.note,
        mode: payoutReceipt.mode,
        addedAt: releasedAt,
      });
    }
  } else {
    bounty.status = "submitted";
    bounty.escrowState = "proof_submitted";
    bounty.updatedAt = releasedAt;
    bounty.activity.unshift(
      makeEvent({
        actor: input.releasedBy,
        message: "Poster review finished, but payout release failed. Proof remains submitted and payout still needs a successful retry.",
        type: "note",
        at: releasedAt,
      }),
    );
  }

  applyChainResult(bounty, chainSync, releasedAt);

  return mutationResult(bounty, chainSync);
}

export async function cancelBounty(id: string, input: CancelBountyInput): Promise<BountyMutationResult> {
  const bounty = ensureBounty(id);
  if (bounty.status !== "open") {
    throw new Error(`Bounty ${id} can only be canceled while open.`);
  }

  const canceledAt = now();
  const chainSync = await cancelBountyOnChain({
    bounty,
    canceledBy: input.canceledBy,
    reason: input.reason,
  });

  bounty.status = "canceled";
  bounty.escrowState = "canceled";
  bounty.updatedAt = canceledAt;
  bounty.activity.unshift(
    makeEvent({
      actor: input.canceledBy,
      message: `Canceled the bounty. Reason: ${input.reason}. Escrow refund status is attached in chain sync.`,
      type: "canceled",
      at: canceledAt,
    }),
  );

  if (chainSync.mode === "real") {
    bounty.escrow.network = "stellar-testnet";
  }
  if (chainSync.explorerUrl) {
    bounty.escrow.explorerUrl = chainSync.explorerUrl;
  }

  applyChainResult(bounty, chainSync, canceledAt);

  return mutationResult(bounty, chainSync);
}

export function recordServicePayment(id: string, payment: SubAgentServicePayment) {
  const bounty = ensureBounty(id);
  const recordedAt = now();

  bounty.servicePayments.unshift(payment);
  bounty.updatedAt = recordedAt;
  bounty.activity.unshift(
    makeEvent({
      actor: payment.callerAgentId,
      message: `Requested ${payment.paymentMethod.toUpperCase()} service payment for ${payment.serviceName} via ${payment.endpoint}.`,
      type: "service_payment",
      at: recordedAt,
    }),
  );

  if (payment.settlement.explorerUrl || payment.providerReference) {
    appendEvidence(bounty, {
      id: `service-payment-${payment.id}`,
      label: `${payment.serviceName} ${payment.paymentMethod.toUpperCase()} receipt`,
      kind: "service_payment",
      url: payment.settlement.explorerUrl ?? payment.settlement.receiptUrl,
      txHash: payment.providerReference,
      source: payment.liveConfigured ? "service-provider" : "taskmesh-demo-payment-adapter",
      note: payment.note,
      mode: payment.mode,
      addedAt: recordedAt,
    });
  }

  return mutationResult(bounty, null);
}

export function reopenBounty(id: string, reopenedBy: string) {
  const bounty = ensureBounty(id);
  const reopenedAt = now();

  bounty.status = "open";
  bounty.escrowState = "funded";
  bounty.workerAgentId = undefined;
  bounty.workerLabel = undefined;
  bounty.proofSubmission = undefined;
  bounty.payoutReceipt = undefined;
  bounty.servicePayments = [];
  bounty.chainActivity = [];
  bounty.evidenceLinks = [];
  bounty.updatedAt = reopenedAt;
  bounty.activity.unshift(
    makeEvent({
      actor: reopenedBy,
      message: "Reopened this bounty for another autonomous competition cycle.",
      type: "note",
      at: reopenedAt,
    }),
  );

  return mutationResult(bounty, null);
}
