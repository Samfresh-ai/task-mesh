import * as StellarSdk from "@stellar/stellar-sdk";

import type { BountyRecord, ChainActionStatus, ChainActionType, IntegrationMode, PersistenceDisposition } from "@/lib/bounty-domain";
import { authorizePreparedContractAccountTransaction } from "@/server/stellar/contract-account";

const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";
const DEFAULT_EXPLORER_BASE_URL = "https://stellar.expert/explorer/testnet";

export const bountyBoardEnvRequirements = {
  shared: [
    "STELLAR_RPC_URL",
    "STELLAR_NETWORK_PASSPHRASE",
    "STELLAR_BOUNTY_BOARD_CONTRACT_ID",
    "STELLAR_BOUNTY_REWARD_TOKEN_ADDRESS",
    "STELLAR_BOUNTY_RUNNER_SECRET",
  ],
  posterActions: ["STELLAR_BOUNTY_POSTER_ACCOUNT_ID"],
  workerActions: ["STELLAR_BOUNTY_WORKER_ACCOUNT_ID"],
  optional: [
    "STELLAR_BOUNTY_TOKEN_DECIMALS",
    "STELLAR_BOUNTY_TIMEOUT_SECONDS",
    "STELLAR_BOUNTY_POLL_ATTEMPTS",
    "STELLAR_EXPLORER_TX_BASE_URL",
  ],
} as const;

export type BountyBoardConfigStatus = {
  mode: IntegrationMode;
  rpcUrl: string;
  networkPassphrase: string;
  contractId?: string;
  rewardTokenAddress?: string;
  tokenDecimals: number;
  posterSignerConfigured: boolean;
  workerSignerConfigured: boolean;
  explorerTxBaseUrl: string;
  requirements: typeof bountyBoardEnvRequirements;
  actionAvailability: Record<ChainActionType, boolean>;
};

export type OnChainActionResult = {
  action: ChainActionType;
  mode: IntegrationMode;
  status: ChainActionStatus;
  disposition: PersistenceDisposition;
  note: string;
  requestSummary: string;
  responseSummary?: string;
  contractId?: string;
  contractBountyId?: string;
  txHash?: string;
  explorerUrl?: string;
  explorerLabel?: string;
  rpcUrl?: string;
};

export type CreateBountyOnChainInput = {
  bounty: BountyRecord;
  metadataUri: string;
};

export type AcceptBountyOnChainInput = {
  bounty: BountyRecord;
};

export type SubmitWorkOnChainInput = {
  bounty: BountyRecord;
};

export type VerifyAndPayoutOnChainInput = {
  bounty: BountyRecord;
};

export type CancelBountyOnChainInput = {
  bounty: BountyRecord;
  canceledBy: string;
  reason: string;
};

type ActionExecutionInput = {
  action: ChainActionType;
  method: "create_bounty" | "accept_bounty" | "submit_work" | "verify_and_payout" | "cancel_bounty";
  args: StellarSdk.xdr.ScVal[];
  requestSummary: string;
  demoContractBountyId?: string;
};

type RuntimeConfig = {
  rpcUrl: string;
  networkPassphrase: string;
  contractId?: string;
  rewardTokenAddress?: string;
  tokenDecimals: number;
  timeoutSeconds: number;
  pollAttempts: number;
  runnerSecret?: string;
  posterAccountId?: string;
  workerAccountId?: string;
  explorerTxBaseUrl: string;
};

function trimEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getRuntimeConfig(): RuntimeConfig {
  return {
    rpcUrl: trimEnv("STELLAR_RPC_URL") ?? DEFAULT_RPC_URL,
    networkPassphrase: trimEnv("STELLAR_NETWORK_PASSPHRASE") ?? StellarSdk.Networks.TESTNET,
    contractId: trimEnv("STELLAR_BOUNTY_BOARD_CONTRACT_ID"),
    rewardTokenAddress: trimEnv("STELLAR_BOUNTY_REWARD_TOKEN_ADDRESS"),
    tokenDecimals: Number(trimEnv("STELLAR_BOUNTY_TOKEN_DECIMALS") ?? "7"),
    timeoutSeconds: Number(trimEnv("STELLAR_BOUNTY_TIMEOUT_SECONDS") ?? "60"),
    pollAttempts: Number(trimEnv("STELLAR_BOUNTY_POLL_ATTEMPTS") ?? "12"),
    runnerSecret: trimEnv("STELLAR_BOUNTY_RUNNER_SECRET"),
    posterAccountId: trimEnv("STELLAR_BOUNTY_POSTER_ACCOUNT_ID"),
    workerAccountId: trimEnv("STELLAR_BOUNTY_WORKER_ACCOUNT_ID"),
    explorerTxBaseUrl: trimEnv("STELLAR_EXPLORER_TX_BASE_URL") ?? DEFAULT_EXPLORER_BASE_URL,
  };
}

function getInvokerAccountId(action: ChainActionType, config: RuntimeConfig) {
  if (action === "accept_bounty" || action === "submit_work") {
    return config.workerAccountId;
  }

  return config.posterAccountId;
}

function canAttemptReal(action: ChainActionType, config: RuntimeConfig) {
  const hasSharedConfig = Boolean(config.contractId && config.rewardTokenAddress && config.rpcUrl && config.networkPassphrase);
  const invokerAccountId = getInvokerAccountId(action, config);
  return hasSharedConfig && Boolean(config.runnerSecret && invokerAccountId);
}

function buildExplorerUrl(txHash: string, config: RuntimeConfig) {
  return `${config.explorerTxBaseUrl.replace(/\/$/, "")}/tx/${txHash}`;
}

function toContractAmount(amount: string, decimals: number) {
  const normalized = amount.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid reward amount for Soroban contract call: ${amount}`);
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const paddedFraction = `${fractionPart}${"0".repeat(decimals)}`.slice(0, decimals);
  const units = `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, "");

  return BigInt(units || "0");
}

function makeDemoResult(input: ActionExecutionInput, note: string): OnChainActionResult {
  return {
    action: input.action,
    mode: "demo",
    status: "mirrored",
    disposition: "demo_mirrored",
    note,
    requestSummary: input.requestSummary,
    responseSummary: "No Soroban RPC call was attempted. TaskMesh recorded a demo-safe adapter mirror only.",
    contractBountyId: input.demoContractBountyId,
  };
}

function makeFailedRealResult(input: ActionExecutionInput, config: RuntimeConfig, error: unknown): OnChainActionResult {
  const message = error instanceof Error ? error.message : String(error);

  return {
    action: input.action,
    mode: "real",
    status: "failed",
    disposition: "persisted_locally_only",
    note: "A configured Soroban RPC call was attempted and failed. The backend lifecycle was kept locally for traceability.",
    requestSummary: input.requestSummary,
    responseSummary: message,
    contractId: config.contractId,
    rpcUrl: config.rpcUrl,
  };
}

async function executeAction(input: ActionExecutionInput): Promise<OnChainActionResult> {
  const config = getRuntimeConfig();

  if (!canAttemptReal(input.action, config)) {
    return makeDemoResult(
      input,
      "Soroban RPC/contract/signer env is incomplete for this action, so TaskMesh used the explicit demo-safe adapter path.",
    );
  }

  try {
    const invokerAccountId = getInvokerAccountId(input.action, config);
    const runner = StellarSdk.Keypair.fromSecret(config.runnerSecret!);
    const server = new StellarSdk.rpc.Server(config.rpcUrl, {
      allowHttp: config.rpcUrl.startsWith("http://"),
    });
    const sourceAccount = await server.getAccount(runner.publicKey());
    const contract = new StellarSdk.Contract(config.contractId!);

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: String(StellarSdk.BASE_FEE),
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call(input.method, ...input.args))
      .setTimeout(config.timeoutSeconds)
      .build();

    const prepared = await server.prepareTransaction(transaction);
    const latestLedger = await server.getLatestLedger();
    const signedEntries = await authorizePreparedContractAccountTransaction({
      accountId: invokerAccountId!,
      signerSecret: config.runnerSecret!,
      networkPassphrase: config.networkPassphrase,
      transaction: prepared,
      validUntilLedger: latestLedger.sequence + 120,
    });
    if (signedEntries === 0) {
      throw new Error(`No contract-account auth entries were produced for ${invokerAccountId}.`);
    }
    prepared.sign(runner);

    const submission = await server.sendTransaction(prepared);

    if (submission.status === "ERROR") {
      return {
        action: input.action,
        mode: "real",
        status: "failed",
        disposition: "persisted_locally_only",
        note: "The Soroban RPC accepted the request but rejected the transaction before it was enqueued.",
        requestSummary: input.requestSummary,
        responseSummary: `RPC sendTransaction returned ERROR for ${submission.hash}.`,
        contractId: config.contractId,
        rpcUrl: config.rpcUrl,
        txHash: submission.hash,
        explorerUrl: buildExplorerUrl(submission.hash, config),
        explorerLabel: `Soroban tx ${submission.hash}`,
      };
    }

    const final = await server.pollTransaction(submission.hash, {
      attempts: config.pollAttempts,
    });

    if (final.status !== StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        action: input.action,
        mode: "real",
        status: final.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED ? "failed" : "submitted",
        disposition:
          final.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED ? "persisted_locally_only" : "stellar_rpc_attempted",
        note:
          final.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED
            ? "The Soroban transaction reached the network and failed."
            : "The Soroban transaction was submitted but final confirmation was not observed within the polling window.",
        requestSummary: input.requestSummary,
        responseSummary: `RPC transaction status: ${final.status}.`,
        contractId: config.contractId,
        rpcUrl: config.rpcUrl,
        txHash: submission.hash,
        explorerUrl: buildExplorerUrl(submission.hash, config),
        explorerLabel: `Soroban tx ${submission.hash}`,
      };
    }

    const nativeResult = final.returnValue ? StellarSdk.scValToNative(final.returnValue) : undefined;

    return {
      action: input.action,
      mode: "real",
      status: "confirmed",
      disposition: "stellar_rpc_attempted",
      note: "TaskMesh submitted a real Soroban contract invocation through the configured Stellar RPC.",
      requestSummary: input.requestSummary,
      responseSummary: nativeResult == null ? "Contract call confirmed." : `Contract return value: ${String(nativeResult)}`,
      contractId: config.contractId,
      contractBountyId:
        input.action === "create_bounty" && nativeResult != null
          ? String(nativeResult)
          : input.demoContractBountyId,
      rpcUrl: config.rpcUrl,
      txHash: submission.hash,
      explorerUrl: buildExplorerUrl(submission.hash, config),
      explorerLabel: `Soroban tx ${submission.hash}`,
    };
  } catch (error) {
    return makeFailedRealResult(input, config, error);
  }
}

export function getBountyBoardConfigStatus(): BountyBoardConfigStatus {
  const config = getRuntimeConfig();

  return {
    mode: config.contractId && config.runnerSecret && (config.posterAccountId || config.workerAccountId) ? "real" : "demo",
    rpcUrl: config.rpcUrl,
    networkPassphrase: config.networkPassphrase,
    contractId: config.contractId,
    rewardTokenAddress: config.rewardTokenAddress,
    tokenDecimals: config.tokenDecimals,
    posterSignerConfigured: Boolean(config.posterAccountId),
    workerSignerConfigured: Boolean(config.workerAccountId),
    explorerTxBaseUrl: config.explorerTxBaseUrl,
    requirements: bountyBoardEnvRequirements,
    actionAvailability: {
      create_bounty: canAttemptReal("create_bounty", config),
      accept_bounty: canAttemptReal("accept_bounty", config),
      submit_work: canAttemptReal("submit_work", config),
      verify_and_payout: canAttemptReal("verify_and_payout", config),
      cancel_bounty: canAttemptReal("cancel_bounty", config),
    },
  };
}

export async function createBountyOnChain(input: CreateBountyOnChainInput): Promise<OnChainActionResult> {
  const config = getRuntimeConfig();
  const posterAccountId = config.posterAccountId;
  const demoContractBountyId = `demo-${Date.now()}`;
  const deadlineUnix = Math.floor(new Date(input.bounty.deadlineAt).getTime() / 1000);

  if (!canAttemptReal("create_bounty", config)) {
    return makeDemoResult(
      {
        action: "create_bounty",
        method: "create_bounty",
        args: [],
        requestSummary: `create_bounty poster=${posterAccountId ?? "demo-poster"} reward=${input.bounty.reward.amount} ${input.bounty.reward.assetCode}`,
        demoContractBountyId,
      },
      "Soroban create_bounty is running in demo mode because contract or signer env is missing.",
    );
  }

  return executeAction({
    action: "create_bounty",
    method: "create_bounty",
    args: [
      StellarSdk.Address.fromString(posterAccountId ?? "GBRPYHIL2CI3FH4A4BWQ4D3V6Q4LBH7JYF32FQUA6L2OD37A6A5PH4VI").toScVal(),
      StellarSdk.nativeToScVal(input.bounty.description),
      StellarSdk.nativeToScVal(toContractAmount(input.bounty.reward.amount, config.tokenDecimals), { type: "i128" }),
      StellarSdk.Address.fromString(config.rewardTokenAddress ?? "CDLZFC3SYZLQ4A7Q5PSEJQWGLH2ZKCVNH4M3TQNLUEJ5KIU3YV4Y3HIT").toScVal(),
      StellarSdk.nativeToScVal(BigInt(deadlineUnix), { type: "u64" }),
    ],
    requestSummary: `create_bounty poster=${posterAccountId ?? "demo-poster"} reward=${input.bounty.reward.amount} ${input.bounty.reward.assetCode}`,
    demoContractBountyId,
  });
}

export async function acceptBountyOnChain(input: AcceptBountyOnChainInput): Promise<OnChainActionResult> {
  const config = getRuntimeConfig();
  const workerAccountId = config.workerAccountId;

  if (!input.bounty.escrow.contractBountyId) {
    return {
      action: "accept_bounty",
      mode: "demo",
      status: "skipped",
      disposition: "persisted_locally_only",
      note: "This bounty has no persisted on-chain bounty id, so accept was kept local only.",
      requestSummary: `accept_bounty worker=${workerAccountId ?? "demo-worker"}`,
      responseSummary: "Create the bounty through the Soroban adapter first to obtain a contract bounty id.",
    };
  }

  if (!canAttemptReal("accept_bounty", config)) {
    return makeDemoResult(
      {
        action: "accept_bounty",
        method: "accept_bounty",
        args: [],
        requestSummary: `accept_bounty bounty=${input.bounty.escrow.contractBountyId} worker=${workerAccountId ?? "demo-worker"}`,
        demoContractBountyId: input.bounty.escrow.contractBountyId,
      },
      "Soroban accept_bounty is running in demo mode because worker signer or contract env is missing.",
    );
  }

  return executeAction({
    action: "accept_bounty",
    method: "accept_bounty",
    args: [
      StellarSdk.nativeToScVal(Number(input.bounty.escrow.contractBountyId), { type: "u32" }),
      StellarSdk.Address.fromString(workerAccountId ?? "GCFXUQXQZL7MQ5FZJXWQNE52QKO4XNA6SADFI3WK7F3BIX6V6MJLQL5S").toScVal(),
    ],
    requestSummary: `accept_bounty bounty=${input.bounty.escrow.contractBountyId} worker=${workerAccountId ?? "demo-worker"}`,
    demoContractBountyId: input.bounty.escrow.contractBountyId,
  });
}

export async function submitWorkOnChain(input: SubmitWorkOnChainInput): Promise<OnChainActionResult> {
  const config = getRuntimeConfig();
  const workerAccountId = config.workerAccountId;

  if (!input.bounty.escrow.contractBountyId || !input.bounty.proofSubmission) {
    return {
      action: "submit_work",
      mode: "demo",
      status: "skipped",
      disposition: "persisted_locally_only",
      note: "This bounty is missing either a contract bounty id or a proof submission, so submit_work was kept local only.",
      requestSummary: `submit_work worker=${workerAccountId ?? "demo-worker"}`,
      responseSummary: "Persist the bounty on chain first and attach proof metadata before calling submit_work.",
    };
  }

  if (!canAttemptReal("submit_work", config)) {
    return makeDemoResult(
      {
        action: "submit_work",
        method: "submit_work",
        args: [],
        requestSummary: `submit_work bounty=${input.bounty.escrow.contractBountyId} worker=${workerAccountId ?? "demo-worker"}`,
        demoContractBountyId: input.bounty.escrow.contractBountyId,
      },
      "Soroban submit_work is running in demo mode because worker signer or contract env is missing.",
    );
  }

  return executeAction({
    action: "submit_work",
    method: "submit_work",
    args: [
      StellarSdk.nativeToScVal(Number(input.bounty.escrow.contractBountyId), { type: "u32" }),
      StellarSdk.nativeToScVal(input.bounty.proofSubmission.artifactUri ?? input.bounty.proofSubmission.summary),
    ],
    requestSummary: `submit_work bounty=${input.bounty.escrow.contractBountyId} worker=${workerAccountId ?? "demo-worker"}`,
    demoContractBountyId: input.bounty.escrow.contractBountyId,
  });
}

export async function verifyAndPayoutOnChain(input: VerifyAndPayoutOnChainInput): Promise<OnChainActionResult> {
  const config = getRuntimeConfig();
  const posterAccountId = config.posterAccountId;

  if (!input.bounty.escrow.contractBountyId) {
    return {
      action: "verify_and_payout",
      mode: "demo",
      status: "skipped",
      disposition: "persisted_locally_only",
      note: "This bounty has no persisted on-chain bounty id, so payout verification was kept local only.",
      requestSummary: `verify_and_payout poster=${posterAccountId ?? "demo-poster"}`,
      responseSummary: "Create the bounty through the Soroban adapter first to obtain a contract bounty id.",
    };
  }

  if (!canAttemptReal("verify_and_payout", config)) {
    return makeDemoResult(
      {
        action: "verify_and_payout",
        method: "verify_and_payout",
        args: [],
        requestSummary: `verify_and_payout bounty=${input.bounty.escrow.contractBountyId} poster=${posterAccountId ?? "demo-poster"}`,
        demoContractBountyId: input.bounty.escrow.contractBountyId,
      },
      "Soroban verify_and_payout is running in demo mode because poster signer or contract env is missing.",
    );
  }

  return executeAction({
    action: "verify_and_payout",
    method: "verify_and_payout",
    args: [
      StellarSdk.nativeToScVal(Number(input.bounty.escrow.contractBountyId), { type: "u32" }),
      StellarSdk.Address.fromString(posterAccountId ?? "GBRPYHIL2CI3FH4A4BWQ4D3V6Q4LBH7JYF32FQUA6L2OD37A6A5PH4VI").toScVal(),
    ],
    requestSummary: `verify_and_payout bounty=${input.bounty.escrow.contractBountyId} poster=${posterAccountId ?? "demo-poster"}`,
    demoContractBountyId: input.bounty.escrow.contractBountyId,
  });
}

export async function cancelBountyOnChain(input: CancelBountyOnChainInput): Promise<OnChainActionResult> {
  const config = getRuntimeConfig();
  const posterAccountId = config.posterAccountId;

  if (!input.bounty.escrow.contractBountyId) {
    return {
      action: "cancel_bounty",
      mode: "demo",
      status: "skipped",
      disposition: "persisted_locally_only",
      note: "This bounty has no persisted on-chain bounty id, so cancel_bounty was kept local only.",
      requestSummary: `cancel_bounty poster=${posterAccountId ?? "demo-poster"}`,
      responseSummary: "Create the bounty through the Soroban adapter first to obtain a contract bounty id.",
    };
  }

  if (!canAttemptReal("cancel_bounty", config)) {
    return makeDemoResult(
      {
        action: "cancel_bounty",
        method: "cancel_bounty",
        args: [],
        requestSummary: `cancel_bounty bounty=${input.bounty.escrow.contractBountyId} poster=${posterAccountId ?? "demo-poster"}`,
        demoContractBountyId: input.bounty.escrow.contractBountyId,
      },
      "Soroban cancel_bounty is running in demo mode because poster signer or contract env is missing.",
    );
  }

  return executeAction({
    action: "cancel_bounty",
    method: "cancel_bounty",
    args: [
      StellarSdk.nativeToScVal(Number(input.bounty.escrow.contractBountyId), { type: "u32" }),
    ],
    requestSummary: `cancel_bounty bounty=${input.bounty.escrow.contractBountyId} poster=${posterAccountId ?? "demo-poster"}`,
    demoContractBountyId: input.bounty.escrow.contractBountyId,
  });
}
