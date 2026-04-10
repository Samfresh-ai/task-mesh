import type { TaskRecord } from "@/lib/taskmesh-data";

export const bountyStatusValues = ["open", "accepted", "submitted", "paid", "canceled"] as const;
export type BountyStatus = (typeof bountyStatusValues)[number];

export const escrowStateValues = ["draft", "funded", "accepted", "proof_submitted", "released", "canceled"] as const;
export type EscrowState = (typeof escrowStateValues)[number];

export const boundaryStageValues = ["real_now", "scaffolded", "stubbed_demo"] as const;
export type BoundaryStage = (typeof boundaryStageValues)[number];

export const integrationModeValues = ["real", "demo"] as const;
export type IntegrationMode = (typeof integrationModeValues)[number];

export const persistenceDispositionValues = ["persisted_locally_only", "demo_mirrored", "stellar_rpc_attempted"] as const;
export type PersistenceDisposition = (typeof persistenceDispositionValues)[number];

export const chainActionTypeValues = ["create_bounty", "accept_bounty", "submit_work", "verify_and_payout", "cancel_bounty"] as const;
export type ChainActionType = (typeof chainActionTypeValues)[number];

export const chainActionStatusValues = ["skipped", "mirrored", "submitted", "confirmed", "failed"] as const;
export type ChainActionStatus = (typeof chainActionStatusValues)[number];

export const servicePaymentMethodValues = ["x402", "mpp"] as const;
export type ServicePaymentMethod = (typeof servicePaymentMethodValues)[number];

export const servicePaymentStatusValues = ["requested", "quoted", "authorized", "settled", "active", "failed"] as const;
export type ServicePaymentStatus = (typeof servicePaymentStatusValues)[number];

export type BountyLifecycleEventType =
  | "created"
  | "accepted"
  | "submitted"
  | "paid"
  | "canceled"
  | "service_payment"
  | "note";

export type BountyReward = {
  amount: string;
  displayAmount: string;
  assetCode: string;
  issuer?: string;
};

export type SorobanEscrowReference = {
  network: "stellar-testnet" | "stellar-mainnet" | "demo";
  contractId?: string;
  contractBountyId?: string;
  sacAddress?: string;
  fundedTxHash?: string;
  payoutTxHash?: string;
  explorerUrl?: string;
  memo?: string;
};

export type ProofSubmission = {
  id: string;
  bountyId: string;
  workerAgentId: string;
  summary: string;
  artifactUri?: string;
  proofDigest?: string;
  verifierNotes: string;
  submittedAt: string;
};

export type BountyEvidenceLink = {
  id: string;
  label: string;
  kind: "contract_call" | "payout_tx" | "service_payment" | "proof_artifact";
  url?: string;
  txHash?: string;
  source: string;
  note: string;
  mode: IntegrationMode;
  addedAt: string;
};

export type BountyChainActionRecord = {
  id: string;
  action: ChainActionType;
  status: ChainActionStatus;
  mode: IntegrationMode;
  disposition: PersistenceDisposition;
  at: string;
  contractId?: string;
  contractBountyId?: string;
  txHash?: string;
  explorerUrl?: string;
  explorerLabel?: string;
  rpcUrl?: string;
  note: string;
  requestSummary: string;
  responseSummary?: string;
};

export type PayoutReceipt = {
  id: string;
  bountyId: string;
  releasedAt: string;
  releasedBy: string;
  amount: string;
  assetCode: string;
  network: string;
  payoutTxHash?: string;
  explorerUrl?: string;
  explorerLabel?: string;
  contractCallTxHash?: string;
  contractCallExplorerUrl?: string;
  mode: IntegrationMode;
  settlementMethod: "soroban_escrow" | "manual_testnet_proof" | "soroban_contract_call";
  note: string;
};

export type ServicePaymentQuote = {
  id: string;
  amount: string;
  currency: string;
  quotedAt: string;
  expiresAt?: string;
  pricingUnit?: string;
  providerUrl?: string;
  mode: IntegrationMode;
};

export type ServicePaymentAuthorization = {
  status: "not_required" | "pending" | "authorized" | "failed";
  scheme: "x402_header" | "mpp_stream" | "demo_receipt";
  authorizedAt?: string;
  reference?: string;
  note: string;
};

export type ServicePaymentSettlement = {
  status: "pending" | "settled" | "active" | "failed";
  settledAt?: string;
  reference?: string;
  explorerUrl?: string;
  receiptUrl?: string;
  network?: string;
  note: string;
};

export type SubAgentServicePayment = {
  id: string;
  bountyId: string;
  callerAgentId: string;
  providerAgentId: string;
  serviceName: string;
  endpoint: string;
  paymentMethod: ServicePaymentMethod;
  status: ServicePaymentStatus;
  amount: string;
  currency: string;
  mode: IntegrationMode;
  liveConfigured: boolean;
  providerUrl?: string;
  quotedAt?: string;
  settledAt?: string;
  providerReceiptId?: string;
  providerReference?: string;
  quote: ServicePaymentQuote;
  authorization: ServicePaymentAuthorization;
  settlement: ServicePaymentSettlement;
  note: string;
};

export type BountyLifecycleEvent = {
  id: string;
  type: BountyLifecycleEventType;
  actor: string;
  message: string;
  at: string;
};

export type BountyImplementationBoundary = {
  bountyApi: BoundaryStage;
  sorobanContract: BoundaryStage;
  sorobanDeployment: BoundaryStage;
  payoutRelease: BoundaryStage;
  servicePayments: BoundaryStage;
  persistence: BoundaryStage;
};

export type BountyRecord = {
  id: string;
  sourceTaskId?: string;
  title: string;
  description: string;
  status: BountyStatus;
  escrowState: EscrowState;
  posterAgentId: string;
  posterLabel: string;
  workerAgentId?: string;
  workerLabel?: string;
  reward: BountyReward;
  desiredOutcome: string;
  requiredSkills: string[];
  requiredCapabilityId?: string;
  verificationChecklist: string[];
  deadlineAt: string;
  createdAt: string;
  updatedAt: string;
  escrow: SorobanEscrowReference;
  proofSubmission?: ProofSubmission;
  payoutReceipt?: PayoutReceipt;
  servicePayments: SubAgentServicePayment[];
  chainActivity: BountyChainActionRecord[];
  evidenceLinks: BountyEvidenceLink[];
  activity: BountyLifecycleEvent[];
  implementation: BountyImplementationBoundary;
};

export function getBountyImplementationBoundary(): BountyImplementationBoundary {
  return {
    bountyApi: "real_now",
    sorobanContract: "real_now",
    sorobanDeployment: "real_now",
    payoutRelease: "real_now",
    servicePayments: "real_now",
    persistence: "real_now",
  };
}

function mapTaskStatusToBountyStatus(task: TaskRecord): BountyStatus {
  switch (task.status) {
    case "open":
      return "open";
    case "in_progress":
      return "accepted";
    case "delivered":
      return "submitted";
    case "settled":
      return "paid";
  }
}

function mapEscrowStatusToEscrowState(task: TaskRecord): EscrowState {
  switch (task.escrowStatus) {
    case "funded":
      return "funded";
    case "worker_committed":
      return "accepted";
    case "proof_submitted":
      return "proof_submitted";
    case "released":
      return "released";
  }
}

function mapActivityType(taskKind: TaskRecord["activity"][number]["kind"]): BountyLifecycleEventType {
  switch (taskKind) {
    case "task_posted":
      return "created";
    case "task_accepted":
      return "accepted";
    case "delivery_submitted":
      return "submitted";
    case "payment_update":
      return "paid";
    case "comment":
      return "note";
  }
}

function mapServicePaymentStatus(status: TaskRecord["subAgentCalls"][number]["status"]): ServicePaymentStatus {
  switch (status) {
    case "quoted":
      return "quoted";
    case "paid":
      return "settled";
    case "active":
      return "active";
  }
}

export function bountyStatusToTaskStatus(status: BountyStatus): TaskRecord["status"] {
  switch (status) {
    case "open":
      return "open";
    case "accepted":
      return "in_progress";
    case "submitted":
      return "delivered";
    case "paid":
      return "settled";
    case "canceled":
      return "open";
  }
}

export function bountyEscrowStateToTaskEscrowState(state: EscrowState): TaskRecord["escrowStatus"] {
  switch (state) {
    case "draft":
      return "funded";
    case "funded":
      return "funded";
    case "accepted":
      return "worker_committed";
    case "proof_submitted":
      return "proof_submitted";
    case "released":
      return "released";
    case "canceled":
      return "funded";
  }
}

export function taskToBountyRecord(task: TaskRecord): BountyRecord {
  const proofSubmission = task.proofArtifact
    ? {
        id: `${task.id}-proof`,
        bountyId: task.id,
        workerAgentId: task.workerAgentId ?? task.assignedAgentId ?? "unassigned-worker",
        summary: task.proofArtifact.summary,
        artifactUri: task.proofArtifact.artifactUrl,
        verifierNotes: task.proofArtifact.verificationLabel,
        submittedAt: task.proofArtifact.submittedAt,
      }
    : undefined;

  const payoutReceipt =
    task.status === "settled"
      ? {
          id: `${task.id}-payout`,
          bountyId: task.id,
          releasedAt: task.settlement.updatedAt,
          releasedBy: task.postedBy,
          amount: String(task.rewardAmount),
          assetCode: task.rewardAsset,
          network: task.settlement.network,
          payoutTxHash: task.payoutTxLabel ?? task.settlement.proofValue,
          explorerUrl: task.payoutTxUrl ?? task.settlement.proofUrl,
          explorerLabel: task.payoutTxLabel ? `Payout tx ${task.payoutTxLabel}` : undefined,
          mode: "demo" as const,
          settlementMethod: "manual_testnet_proof" as const,
          note: task.settlement.memo,
        }
      : undefined;

  return {
    id: task.id,
    sourceTaskId: task.id,
    title: task.title,
    description: task.description,
    status: mapTaskStatusToBountyStatus(task),
    escrowState: mapEscrowStatusToEscrowState(task),
    posterAgentId: task.posterAgentId,
    posterLabel: task.postedBy,
    workerAgentId: task.workerAgentId ?? task.assignedAgentId,
    reward: {
      amount: String(task.rewardAmount),
      displayAmount: task.rewardLabel,
      assetCode: task.rewardAsset,
    },
    desiredOutcome: task.desiredOutcome,
    requiredSkills: task.requiredSkills,
    requiredCapabilityId: task.requiredCapabilityId,
    verificationChecklist: task.operatorBrief,
    deadlineAt: task.deadline,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    escrow: {
      network: "demo",
      payoutTxHash: task.payoutTxLabel ?? task.settlement.proofValue,
      memo: task.settlement.memo,
    },
    proofSubmission,
    payoutReceipt,
    servicePayments: task.subAgentCalls.map((call) => ({
      id: call.id,
      bountyId: task.id,
      callerAgentId: call.callerAgentId,
      providerAgentId: call.serviceAgentId,
      serviceName: call.serviceLabel,
      endpoint: call.endpointLabel,
      paymentMethod: call.paymentLane,
      status: mapServicePaymentStatus(call.status),
      amount: call.amountLabel.split(" ")[0] ?? call.amountLabel,
      currency: call.amountLabel.split(" ")[1] ?? task.rewardAsset,
      mode: "demo",
      liveConfigured: false,
      quotedAt: call.at,
      settledAt: call.status === "paid" || call.status === "active" ? call.at : undefined,
      providerReceiptId: call.receiptLabel,
      providerReference: call.receiptLabel,
      quote: {
        id: `${call.id}-quote`,
        amount: call.amountLabel.split(" ")[0] ?? call.amountLabel,
        currency: call.amountLabel.split(" ")[1] ?? task.rewardAsset,
        quotedAt: call.at,
        pricingUnit: "service_call",
        mode: "demo",
      },
      authorization: {
        status: "authorized",
        scheme: call.paymentLane === "x402" ? "x402_header" : "mpp_stream",
        authorizedAt: call.at,
        reference: call.receiptLabel,
        note: "Seeded demo payment metadata carried over from Phase B.",
      },
      settlement: {
        status: call.status === "active" ? "active" : "settled",
        settledAt: call.at,
        reference: call.receiptLabel,
        note: "Seeded demo payment metadata carried over from Phase B.",
      },
      note: call.summary,
    })),
    chainActivity: [],
    evidenceLinks: [
      ...(proofSubmission
        ? [
            {
              id: `${task.id}-proof-evidence`,
              label: proofSubmission.summary,
              kind: "proof_artifact" as const,
              url: proofSubmission.artifactUri,
              source: "taskmesh-demo-seed",
              note: "Proof artifact imported from seeded task data.",
              mode: "demo" as const,
              addedAt: proofSubmission.submittedAt,
            },
          ]
        : []),
      ...(payoutReceipt
        ? [
            {
              id: `${task.id}-payout-evidence`,
              label: payoutReceipt.payoutTxHash ? `Payout tx ${payoutReceipt.payoutTxHash}` : "Payout reference",
              kind: "payout_tx" as const,
              url: payoutReceipt.explorerUrl,
              txHash: payoutReceipt.payoutTxHash,
              source: "taskmesh-demo-seed",
              note: "Payout proof imported from seeded task data.",
              mode: "demo" as const,
              addedAt: payoutReceipt.releasedAt,
            },
          ]
        : []),
    ],
    activity: task.activity.map((entry) => ({
      id: entry.id,
      type: mapActivityType(entry.kind),
      actor: entry.actor,
      message: entry.message,
      at: entry.at,
    })),
    implementation: getBountyImplementationBoundary(),
  };
}

export function bountyToTaskRecord(bounty: BountyRecord): TaskRecord {
  const status: TaskRecord["status"] =
    bounty.status === "open"
      ? "open"
      : bounty.status === "accepted"
        ? "in_progress"
        : bounty.status === "submitted"
          ? "delivered"
          : "settled";

  const escrowStatus: TaskRecord["escrowStatus"] =
    bounty.escrowState === "funded"
      ? "funded"
      : bounty.escrowState === "accepted"
        ? "worker_committed"
        : bounty.escrowState === "proof_submitted"
          ? "proof_submitted"
          : "released";

  const rewardAmount = Number(bounty.reward.amount);
  const proofArtifact = bounty.proofSubmission
    ? {
        label: bounty.proofSubmission.summary,
        summary: bounty.proofSubmission.summary,
        submittedAt: bounty.proofSubmission.submittedAt,
        artifactUrl: bounty.proofSubmission.artifactUri,
        verificationLabel: bounty.proofSubmission.verifierNotes,
      }
    : undefined;

  const delivery = bounty.proofSubmission
    ? {
        summary: bounty.proofSubmission.summary,
        deliverableUrl: bounty.proofSubmission.artifactUri,
        submittedAt: bounty.proofSubmission.submittedAt,
      }
    : undefined;

  const settlementStatus: TaskRecord["settlement"]["status"] =
    bounty.payoutReceipt || bounty.escrow.payoutTxHash ? "released" : bounty.proofSubmission ? "proof_required" : "pending";

  return {
    id: bounty.id,
    title: bounty.title,
    description: bounty.description,
    reward: bounty.reward.amount,
    rewardAsset: bounty.reward.assetCode,
    rewardAmount: Number.isFinite(rewardAmount) ? rewardAmount : 0,
    rewardLabel: bounty.reward.displayAmount,
    rewardXlm: Number.isFinite(rewardAmount) ? rewardAmount : 0,
    requiredSkills: bounty.requiredSkills,
    requiredSkillTag: bounty.requiredSkills[0] ?? bounty.reward.assetCode,
    requiredCapabilityId: bounty.requiredCapabilityId,
    executionProfile: "code_review",
    desiredOutcome: bounty.desiredOutcome,
    operatorBrief: bounty.verificationChecklist,
    posterAgentId: bounty.posterAgentId,
    postedBy: bounty.posterLabel,
    escrowStatus,
    deadline: bounty.deadlineAt,
    status,
    workerAgentId: bounty.workerAgentId,
    assignedAgentId: bounty.workerAgentId,
    suggestedAgentIds: bounty.workerAgentId ? [bounty.workerAgentId] : [bounty.posterAgentId],
    proofArtifact,
    delivery,
    payoutTxLabel: bounty.payoutReceipt?.payoutTxHash ?? bounty.escrow.payoutTxHash,
    payoutTxUrl: bounty.payoutReceipt?.explorerUrl ?? bounty.escrow.explorerUrl,
    paymentLayerInfo:
      bounty.servicePayments.length > 0
        ? "Soroban escrow is the reward layer, while x402 and MPP appear as separate service-payment lanes used by agents during execution."
        : "Soroban escrow remains the authoritative reward layer for this bounty.",
    paymentLayers: [
      {
        id: `${bounty.id}-reward-layer`,
        kind: "soroban_escrow",
        title: "Soroban escrow",
        state: (status === "settled" ? "released" : "authoritative") as "released" | "authoritative",
        amountLabel: bounty.reward.displayAmount,
        description:
          bounty.escrow.network === "stellar-testnet"
            ? `Reward escrow for ${bounty.reward.displayAmount} on Stellar testnet.`
            : `Reward escrow for ${bounty.reward.displayAmount} in the TaskMesh demo runtime.`,
      },
      ...bounty.servicePayments.map((payment) => ({
        id: payment.id,
        kind: payment.paymentMethod,
        title: payment.serviceName,
        state: (payment.status === "settled" ? "used" : payment.status === "active" ? "active" : "available") as "used" | "active" | "available",
        amountLabel: `${payment.amount} ${payment.currency}`,
        description:
          payment.paymentMethod === "x402"
            ? payment.mode === "real"
              ? `Paid reviewer or helper service settled over x402. ${payment.note}`
              : `Reviewer or helper service recorded through the x402 adapter lane. ${payment.note}`
            : payment.mode === "real"
              ? `Recurring support lane tracked through Stellar MPP. ${payment.note}`
              : `Recurring support lane recorded through the MPP adapter path. ${payment.note}`,
      })),
    ],
    subAgentCalls: bounty.servicePayments.map((payment) => ({
      id: payment.id,
      callerAgentId: payment.callerAgentId,
      serviceAgentId: payment.providerAgentId,
      serviceLabel: payment.serviceName,
      endpointLabel: payment.endpoint,
      paymentLane: payment.paymentMethod,
      amountLabel: `${payment.amount} ${payment.currency}`,
      status: payment.status === "active" ? "active" : "paid",
      at: payment.settledAt ?? payment.quotedAt ?? bounty.updatedAt,
      summary: payment.note,
      receiptLabel: payment.providerReceiptId,
    })),
    createdAt: bounty.createdAt,
    updatedAt: bounty.updatedAt,
    settlement: {
      status: settlementStatus,
      network: bounty.escrow.network === "stellar-testnet" ? "Soroban on Stellar testnet" : bounty.escrow.network,
      amountLabel: bounty.reward.displayAmount,
      proofLabel: "Payout tx",
      proofValue: bounty.payoutReceipt?.payoutTxHash ?? bounty.escrow.payoutTxHash,
      proofUrl: bounty.payoutReceipt?.explorerUrl ?? bounty.escrow.explorerUrl,
      memo:
        bounty.payoutReceipt?.note ??
        bounty.proofSubmission?.verifierNotes ??
        bounty.escrow.memo ??
        "Poster verification gates payout release.",
      updatedAt: bounty.updatedAt,
    },
    activity: bounty.activity.map((entry) => ({
      id: entry.id,
      kind:
        entry.type === "created"
          ? "task_posted"
          : entry.type === "accepted"
            ? "task_accepted"
            : entry.type === "submitted"
              ? "delivery_submitted"
              : entry.type === "paid"
                ? "payment_update"
                : "comment",
      actor: entry.actor,
      message: entry.message,
      at: entry.at,
    })),
  };
}
