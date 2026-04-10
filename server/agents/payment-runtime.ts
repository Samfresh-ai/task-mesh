import { createServer, type Server as HttpServer } from "node:http";

import express from "express";
import * as StellarSdk from "@stellar/stellar-sdk";
import { ALL_ZEROS, XLM_SAC_TESTNET } from "@stellar/mpp";
import { x402Facilitator } from "@x402/core/facilitator";
import type { FacilitatorClient } from "@x402/core/server";
import type { PaymentPayload, PaymentRequirements, SettleResponse, VerifyResponse } from "@x402/core/types";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { decodePaymentResponseHeader, x402Client, x402HTTPClient } from "@x402/fetch";
import { STELLAR_TESTNET_CAIP2, convertToTokenAmount, createEd25519Signer, getEstimatedLedgerCloseTimeSeconds } from "@x402/stellar";
import { ExactStellarScheme as X402FacilitatorScheme } from "@x402/stellar/exact/facilitator";
import { ExactStellarScheme as X402ServerScheme } from "@x402/stellar/exact/server";
import { Challenge as MppChallenge, Credential as MppCredential, Receipt as MppReceipt } from "mppx";

type RuntimeConfig = {
  host: string;
  port: number;
  baseUrl: string;
  rpcUrl: string;
  networkPassphrase: string;
  explorerTxBaseUrl: string;
  assetAddress: string;
  tokenDecimals: number;
  runnerSecret: string;
  posterAccountId: string;
  workerAccountId: string;
  reviewerAccountId: string;
  x402ReviewPrice: string;
  mppOpenPrice: string;
  mppCheckpointPrice: string;
  mppRealm: string;
  mppSecret: string;
  timeoutSeconds: number;
};

type ReviewReceipt = {
  reviewId: string;
  txHash: string;
  explorerUrl: string;
  payer: string;
  recipient: string;
  amount: string;
  asset: string;
  serviceUrl: string;
};

type WatchSessionReceipt = {
  sessionId: string;
  phaseReceipts: Array<{
    phase: "open" | "checkpoint";
    txHash: string;
    explorerUrl: string;
  }>;
  totalAmount: string;
  payer: string;
  recipient: string;
  asset: string;
  serviceUrl: string;
};

type ReviewerRuntime = {
  baseUrl: string;
  close: () => Promise<void>;
};

type WatchSessionState = {
  bountyId: string;
  phases: string[];
  createdAt: string;
};

const SOROBAN_INSTRUCTION_LEEWAY = 2_000_000;

declare global {
  var __taskmeshReviewerRuntimePromise__: Promise<ReviewerRuntime> | undefined;
}

function trimEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getRequiredEnv(name: string) {
  const value = trimEnv(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function getRuntimeConfig(): RuntimeConfig {
  const host = trimEnv("TASKMESH_PAYMENT_HOST") ?? "127.0.0.1";
  const port = Number(trimEnv("TASKMESH_PAYMENT_PORT") ?? "4021");

  return {
    host,
    port,
    baseUrl: `http://${host}:${port}`,
    rpcUrl: trimEnv("STELLAR_RPC_URL") ?? "https://soroban-testnet.stellar.org",
    networkPassphrase: trimEnv("STELLAR_NETWORK_PASSPHRASE") ?? StellarSdk.Networks.TESTNET,
    explorerTxBaseUrl: trimEnv("STELLAR_EXPLORER_TX_BASE_URL") ?? "https://stellar.expert/explorer/testnet",
    assetAddress: trimEnv("STELLAR_BOUNTY_REWARD_TOKEN_ADDRESS") ?? XLM_SAC_TESTNET,
    tokenDecimals: Number(trimEnv("STELLAR_BOUNTY_TOKEN_DECIMALS") ?? "7"),
    runnerSecret: getRequiredEnv("STELLAR_BOUNTY_RUNNER_SECRET"),
    posterAccountId: getRequiredEnv("STELLAR_BOUNTY_POSTER_ACCOUNT_ID"),
    workerAccountId: getRequiredEnv("STELLAR_BOUNTY_WORKER_ACCOUNT_ID"),
    reviewerAccountId: getRequiredEnv("STELLAR_BOUNTY_REVIEWER_ACCOUNT_ID"),
    x402ReviewPrice: trimEnv("TASKMESH_X402_REVIEW_PRICE") ?? "0.009",
    mppOpenPrice: trimEnv("TASKMESH_MPP_OPEN_PRICE") ?? "0.004",
    mppCheckpointPrice: trimEnv("TASKMESH_MPP_CHECKPOINT_PRICE") ?? "0.003",
    mppRealm: trimEnv("TASKMESH_MPP_REALM") ?? `${host}:${port}`,
    mppSecret: trimEnv("TASKMESH_MPP_SECRET") ?? "taskmesh-demo-mpp-realm-secret",
    timeoutSeconds: Number(trimEnv("STELLAR_BOUNTY_TIMEOUT_SECONDS") ?? "60"),
  };
}

function buildExplorerUrl(txHash: string, config: RuntimeConfig) {
  return `${config.explorerTxBaseUrl.replace(/\/$/, "")}/tx/${txHash}`;
}

function runnerKeypair(config: RuntimeConfig) {
  return StellarSdk.Keypair.fromSecret(config.runnerSecret);
}

function toBaseUnits(amount: string, config: RuntimeConfig) {
  return convertToTokenAmount(amount, config.tokenDecimals);
}

function createX402HttpClient() {
  const client = new x402Client();
  return new x402HTTPClient(client);
}

async function buildContractAccountX402PaymentPayload(input: {
  config: RuntimeConfig;
  paymentRequired: {
    x402Version: number;
    resource?: PaymentPayload["resource"];
    extensions?: PaymentPayload["extensions"];
    accepts: PaymentRequirements[];
  };
}) {
  const { config, paymentRequired } = input;
  const paymentRequirements = paymentRequired.accepts[0];
  if (!paymentRequirements) {
    throw new Error("x402 reviewer response did not include any accepted payment requirement.");
  }

  const timeoutSeconds = paymentRequirements.maxTimeoutSeconds ?? config.timeoutSeconds;
  const server = new StellarSdk.rpc.Server(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith("http://"),
  });
  const contract = new StellarSdk.Contract(paymentRequirements.asset);
  const placeholderSource = new StellarSdk.Account(ALL_ZEROS, "0");
  const unsignedTransaction = new StellarSdk.TransactionBuilder(placeholderSource, {
    fee: String(StellarSdk.BASE_FEE),
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "transfer",
        new StellarSdk.Address(config.workerAccountId).toScVal(),
        new StellarSdk.Address(paymentRequirements.payTo).toScVal(),
        StellarSdk.nativeToScVal(BigInt(paymentRequirements.amount), { type: "i128" }),
      ),
    )
    .setTimeout(timeoutSeconds)
    .build();
  const simulation = await server.simulateTransaction(unsignedTransaction, {
    cpuInstructions: SOROBAN_INSTRUCTION_LEEWAY,
  });
  if (!StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
    throw new Error(`x402 payment simulation failed: ${simulation.error ?? "unknown error"}`);
  }
  const prepared = StellarSdk.rpc.assembleTransaction(unsignedTransaction, simulation).build();
  const latestLedger = await server.getLatestLedger();
  const estimatedLedgerSeconds = await getEstimatedLedgerCloseTimeSeconds(paymentRequirements.network);
  const validUntilLedger = latestLedger.sequence + Math.ceil(timeoutSeconds / estimatedLedgerSeconds);
  const operation = getContractInvokeOperation(prepared);
  const authEntries = operation.auth ?? [];

  for (let i = 0; i < authEntries.length; i += 1) {
    const entry = authEntries[i];
    if (
      entry.credentials().switch().value !==
      StellarSdk.xdr.SorobanCredentialsType.sorobanCredentialsAddress().value
    ) {
      continue;
    }

    const address = StellarSdk.Address.fromScAddress(entry.credentials().address().address()).toString();
    if (address !== config.workerAccountId) {
      continue;
    }

    authEntries[i] = await StellarSdk.authorizeEntry(
      entry,
      async (preimage) => {
        const runner = runnerKeypair(config);
        return {
          publicKey: runner.publicKey(),
          signature: runner.sign(StellarSdk.hash(preimage.toXDR())),
        };
      },
      validUntilLedger,
      config.networkPassphrase,
    );
  }

  return {
    x402Version: 2,
    accepted: paymentRequirements,
    payload: {
      transaction: prepared.toXDR(),
    },
    resource: paymentRequired.resource,
    extensions: paymentRequired.extensions,
  } satisfies PaymentPayload;
}

async function listen(server: HttpServer, port: number, host: string) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

class LocalFacilitatorClient implements FacilitatorClient {
  constructor(private readonly facilitator: x402Facilitator) {}

  async verify(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<VerifyResponse> {
    console.log(`[x402] facilitator verify start network=${paymentRequirements.network} payTo=${paymentRequirements.payTo}`);
    const result = await this.facilitator.verify(paymentPayload, paymentRequirements);
    console.log(`[x402] facilitator verify done valid=${result.isValid}`);
    return result;
  }

  async settle(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<SettleResponse> {
    console.log(`[x402] facilitator settle start amount=${paymentRequirements.amount} asset=${paymentRequirements.asset}`);
    const result = await this.facilitator.settle(paymentPayload, paymentRequirements);
    console.log(`[x402] facilitator settle done success=${result.success} tx=${result.transaction}`);
    return result;
  }

  async getSupported() {
    return this.facilitator.getSupported() as Awaited<ReturnType<FacilitatorClient["getSupported"]>>;
  }
}

function getContractInvokeOperation(transaction: StellarSdk.Transaction) {
  if (transaction.operations.length !== 1 || transaction.operations[0]?.type !== "invokeHostFunction") {
    throw new Error("Expected a single invokeHostFunction operation in the payment transaction.");
  }

  const operation = transaction.operations[0] as StellarSdk.Operation.InvokeHostFunction;
  if (operation.func.switch().name !== "hostFunctionTypeInvokeContract") {
    throw new Error("Expected a direct contract invocation for the payment transaction.");
  }

  return operation;
}

function verifySponsoredTransferInvocation(input: {
  transaction: StellarSdk.Transaction;
  from: string;
  to: string;
  asset: string;
  amountBaseUnits: string;
}) {
  const operation = getContractInvokeOperation(input.transaction);
  const invokeArgs = operation.func.value() as StellarSdk.xdr.InvokeContractArgs;
  const contractAddress = StellarSdk.Address.fromScAddress(invokeArgs.contractAddress()).toString();
  const functionName = invokeArgs.functionName().toString();
  const args = invokeArgs.args();
  const from = StellarSdk.scValToNative(args[0]) as string;
  const to = StellarSdk.scValToNative(args[1]) as string;
  const amount = StellarSdk.scValToNative(args[2]) as bigint;

  if (contractAddress !== input.asset) {
    throw new Error(`Payment asset mismatch. Expected ${input.asset}, got ${contractAddress}.`);
  }
  if (functionName !== "transfer") {
    throw new Error(`Payment function mismatch. Expected transfer, got ${functionName}.`);
  }
  if (from !== input.from) {
    throw new Error(`Payment source mismatch. Expected ${input.from}, got ${from}.`);
  }
  if (to !== input.to) {
    throw new Error(`Payment recipient mismatch. Expected ${input.to}, got ${to}.`);
  }
  if (amount !== BigInt(input.amountBaseUnits)) {
    throw new Error(`Payment amount mismatch. Expected ${input.amountBaseUnits}, got ${amount.toString()}.`);
  }
}

async function submitSponsoredTransaction(input: {
  config: RuntimeConfig;
  transactionXdr: string;
}) {
  const { config } = input;
  const server = new StellarSdk.rpc.Server(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith("http://"),
  });
  const runner = runnerKeypair(config);
  const networkPassphrase = config.networkPassphrase;
  const parsed = StellarSdk.TransactionBuilder.fromXDR(input.transactionXdr, networkPassphrase);
  const transaction = parsed instanceof StellarSdk.FeeBumpTransaction ? parsed.innerTransaction : parsed;
  const txEnvelope = StellarSdk.xdr.TransactionEnvelope.fromXDR(input.transactionXdr, "base64");

  if (transaction.source !== ALL_ZEROS) {
    throw new Error(`Expected sponsored payment source ${ALL_ZEROS}, got ${transaction.source}.`);
  }

  const operation = getContractInvokeOperation(transaction);
  const runnerAccount = await server.getAccount(runner.publicKey());
  const sorobanData = txEnvelope.v1()?.tx()?.ext()?.sorobanData() || undefined;
  const clientFeeStroops = parseInt(transaction.fee, 10);
  const rebuilt = new StellarSdk.TransactionBuilder(runnerAccount, {
    fee: clientFeeStroops.toString(),
    networkPassphrase,
    ledgerbounds: transaction.ledgerBounds,
    memo: transaction.memo,
    minAccountSequence: transaction.minAccountSequence,
    minAccountSequenceAge: transaction.minAccountSequenceAge,
    minAccountSequenceLedgerGap: transaction.minAccountSequenceLedgerGap,
    extraSigners: transaction.extraSigners,
    sorobanData,
  })
    .setTimeout(config.timeoutSeconds)
    .addOperation(StellarSdk.Operation.invokeHostFunction(operation))
    .build();

  rebuilt.sign(runner);
  const sendResult = await server.sendTransaction(rebuilt);
  if (sendResult.status !== "PENDING") {
    throw new Error(`sendTransaction failed for sponsored payment: ${sendResult.status} ${JSON.stringify(sendResult)}`);
  }

  const confirmed = await server.pollTransaction(sendResult.hash, { attempts: 12 });
  if (confirmed.status !== StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Sponsored payment did not confirm successfully: ${confirmed.status}`);
  }

  return sendResult.hash;
}

function buildMppChallenge(input: {
  config: RuntimeConfig;
  amount: string;
  description: string;
}) {
  const { config } = input;

  return MppChallenge.from({
    secretKey: config.mppSecret,
    realm: config.mppRealm,
    method: "stellar",
    intent: "charge",
    request: {
      amount: toBaseUnits(input.amount, config),
      currency: config.assetAddress,
      recipient: config.reviewerAccountId,
      description: input.description,
      methodDetails: {
        network: STELLAR_TESTNET_CAIP2,
        feePayer: true,
      },
    },
  });
}

function sendMppChallenge(res: express.Response, challenge: ReturnType<typeof buildMppChallenge>) {
  res
    .status(402)
    .set("WWW-Authenticate", MppChallenge.serialize(challenge))
    .json({
      error: "payment_required",
      challengeId: challenge.id,
      method: challenge.method,
      intent: challenge.intent,
    });
}

async function buildContractAccountChargeCredential(input: {
  config: RuntimeConfig;
  challenge: ReturnType<typeof buildMppChallenge>;
}) {
  const { config, challenge } = input;
  const server = new StellarSdk.rpc.Server(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith("http://"),
  });
  const contract = new StellarSdk.Contract(challenge.request.currency);
  const expiresTimestamp = challenge.expires ? Math.floor(new Date(challenge.expires).getTime() / 1000) : undefined;
  const placeholderSource = new StellarSdk.Account(ALL_ZEROS, "0");
  const transferOperation = contract.call(
    "transfer",
    new StellarSdk.Address(config.workerAccountId).toScVal(),
    new StellarSdk.Address(config.reviewerAccountId).toScVal(),
    StellarSdk.nativeToScVal(BigInt(challenge.request.amount), { type: "i128" }),
  );

  const transactionBuilder = new StellarSdk.TransactionBuilder(placeholderSource, {
    fee: String(StellarSdk.BASE_FEE),
    networkPassphrase: config.networkPassphrase,
  }).addOperation(transferOperation);

  if (expiresTimestamp) {
    transactionBuilder.setTimebounds(0, expiresTimestamp);
  } else {
    transactionBuilder.setTimeout(config.timeoutSeconds);
  }

  const unsignedTransaction = transactionBuilder.build();
  const simulation = await server.simulateTransaction(unsignedTransaction, {
    cpuInstructions: SOROBAN_INSTRUCTION_LEEWAY,
  });
  if (!StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
    throw new Error(`MPP payment simulation failed: ${simulation.error ?? "unknown error"}`);
  }
  const prepared = StellarSdk.rpc.assembleTransaction(unsignedTransaction, simulation).build();
  const latestLedger = await server.getLatestLedger();
  const validUntilLedger = expiresTimestamp
    ? latestLedger.sequence + Math.ceil(Math.max(expiresTimestamp - Math.floor(Date.now() / 1000), 0) / 5)
    : latestLedger.sequence + 120;

  const operation = getContractInvokeOperation(prepared);
  const authEntries = operation.auth ?? [];
  for (let i = 0; i < authEntries.length; i += 1) {
    const entry = authEntries[i];
    if (
      entry.credentials().switch().value !==
      StellarSdk.xdr.SorobanCredentialsType.sorobanCredentialsAddress().value
    ) {
      continue;
    }

    const address = StellarSdk.Address.fromScAddress(entry.credentials().address().address()).toString();
    if (address !== config.workerAccountId) {
      continue;
    }

    authEntries[i] = await StellarSdk.authorizeEntry(
      entry,
      async (preimage) => {
        const runner = runnerKeypair(config);
        return {
          publicKey: runner.publicKey(),
          signature: runner.sign(StellarSdk.hash(preimage.toXDR())),
        };
      },
      validUntilLedger,
      config.networkPassphrase,
    );
  }

  return MppCredential.serialize({
    challenge,
    payload: {
      type: "transaction",
      transaction: prepared.toXDR(),
    },
    source: config.workerAccountId,
  });
}

async function settleContractAccountMppCharge(input: {
  config: RuntimeConfig;
  challenge: ReturnType<typeof buildMppChallenge>;
  authorizationHeader: string;
}) {
  const credential = MppCredential.deserialize(input.authorizationHeader);
  const payload = credential.payload as { type?: string; transaction?: string };
  if (credential.challenge.id !== input.challenge.id) {
    throw new Error(`MPP challenge mismatch. Expected ${input.challenge.id}, got ${credential.challenge.id}.`);
  }
  if (payload.type !== "transaction" || typeof payload.transaction !== "string") {
    throw new Error("MPP credential payload must include a sponsored transaction.");
  }

  const parsed = StellarSdk.TransactionBuilder.fromXDR(
    payload.transaction,
    input.config.networkPassphrase,
  );
  const transaction = parsed instanceof StellarSdk.FeeBumpTransaction ? parsed.innerTransaction : parsed;
  verifySponsoredTransferInvocation({
    transaction,
    from: input.config.workerAccountId,
    to: input.config.reviewerAccountId,
    asset: input.config.assetAddress,
    amountBaseUnits: input.challenge.request.amount,
  });

  const txHash = await submitSponsoredTransaction({
    config: input.config,
    transactionXdr: payload.transaction,
  });

  return {
    txHash,
    receiptHeader: MppReceipt.serialize(
      MppReceipt.from({
        method: "stellar",
        reference: txHash,
        status: "success",
        timestamp: new Date().toISOString(),
      }),
    ),
  };
}

async function handleContractAccountMppCharge(input: {
  req: express.Request;
  res: express.Response;
  config: RuntimeConfig;
  amount: string;
  description: string;
}) {
  const challenge = buildMppChallenge({
    config: input.config,
    amount: input.amount,
    description: input.description,
  });
  const authorization = input.req.header("Authorization");

  if (!authorization) {
    sendMppChallenge(input.res, challenge);
    return null;
  }

  const settlement = await settleContractAccountMppCharge({
    config: input.config,
    challenge,
    authorizationHeader: authorization,
  });
  input.res.set("Payment-Receipt", settlement.receiptHeader);
  return settlement.txHash;
}

async function startReviewerRuntime(): Promise<ReviewerRuntime> {
  const config = getRuntimeConfig();
  const app = express();
  app.use(express.json());

  const sponsorSigner = createEd25519Signer(config.runnerSecret, STELLAR_TESTNET_CAIP2);
  const x402ServerScheme = new X402ServerScheme().registerMoneyParser(async (amount) => ({
    amount: convertToTokenAmount(String(amount), config.tokenDecimals),
    asset: config.assetAddress,
    extra: {
      asset: "XLM",
    },
  }));
  const facilitator = new x402Facilitator().register(
    STELLAR_TESTNET_CAIP2,
    new X402FacilitatorScheme([sponsorSigner], {
      rpcConfig: { url: config.rpcUrl },
      feeBumpSigner: sponsorSigner,
      maxTransactionFeeStroops: 2_000_000,
    }),
  );
  facilitator.onVerifyFailure(async ({ error }) => {
    console.error("[x402] facilitator verify failure", error);
  });
  facilitator.onSettleFailure(async ({ error }) => {
    console.error("[x402] facilitator settle failure", error);
  });
  const resourceServer = new x402ResourceServer(new LocalFacilitatorClient(facilitator)).register(
    STELLAR_TESTNET_CAIP2,
    x402ServerScheme,
  );

  app.use(
    paymentMiddleware(
      {
        "POST /repo-risk-scan": {
          accepts: {
            scheme: "exact",
            price: config.x402ReviewPrice,
            network: STELLAR_TESTNET_CAIP2,
            payTo: config.reviewerAccountId,
          },
          description: "Reviewer Agent paid code review",
        },
      },
      resourceServer,
    ),
  );

  const watchSessions = new Map<string, WatchSessionState>();

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      reviewer: config.reviewerAccountId,
      asset: config.assetAddress,
      runner: runnerKeypair(config).publicKey(),
    });
  });

  app.post("/repo-risk-scan", (req, res) => {
    res.json({
      ok: true,
      reviewId: crypto.randomUUID(),
      verdict: "safe_to_submit",
      reviewer: "Reviewer Agent",
      reviewerAccount: config.reviewerAccountId,
      summary: "Risk scan passed. Soroban lifecycle calls are ordered correctly and payout evidence is separated from service-payment receipts.",
      requestEcho: req.body ?? {},
    });
  });

  app.post("/payout-watch/open", async (req, res) => {
    try {
      const txHash = await handleContractAccountMppCharge({
        req,
        res,
        config,
        amount: config.mppOpenPrice,
        description: "Open payout watch session",
      });
      if (!txHash) {
        return;
      }

      const sessionId = String(req.body?.sessionId ?? crypto.randomUUID());
      const bountyId = String(req.body?.bountyId ?? "unknown-bounty");
      watchSessions.set(sessionId, {
        bountyId,
        phases: ["open"],
        createdAt: new Date().toISOString(),
      });

      res.json({
        ok: true,
        sessionId,
        phase: "open",
        bountyId,
        txHash,
        reviewer: "Reviewer Agent",
        reviewerAccount: config.reviewerAccountId,
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/payout-watch/checkpoint", async (req, res) => {
    try {
      const sessionId = String(req.body?.sessionId ?? "");
      const existing = watchSessions.get(sessionId);
      if (!existing) {
        res.status(400).json({
          ok: false,
          error: `Unknown payout watch session: ${sessionId}`,
        });
        return;
      }

      const txHash = await handleContractAccountMppCharge({
        req,
        res,
        config,
        amount: config.mppCheckpointPrice,
        description: "Checkpoint payout watch session",
      });
      if (!txHash) {
        return;
      }

      existing.phases.push("checkpoint");
      res.json({
        ok: true,
        sessionId,
        phase: "checkpoint",
        bountyId: existing.bountyId,
        txHash,
        reviewer: "Reviewer Agent",
        reviewerAccount: config.reviewerAccountId,
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const server = createServer(app);
  await listen(server, config.port, config.host);
  console.log(`TaskMesh reviewer agent listening on ${config.baseUrl}`);

  return {
    baseUrl: config.baseUrl,
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}

export async function ensureReviewerRuntime(): Promise<ReviewerRuntime> {
  if (!globalThis.__taskmeshReviewerRuntimePromise__) {
    globalThis.__taskmeshReviewerRuntimePromise__ = startReviewerRuntime();
  }

  return globalThis.__taskmeshReviewerRuntimePromise__;
}

export async function shutdownReviewerRuntime() {
  if (!globalThis.__taskmeshReviewerRuntimePromise__) {
    return;
  }

  const runtime = await globalThis.__taskmeshReviewerRuntimePromise__;
  await runtime.close();
  globalThis.__taskmeshReviewerRuntimePromise__ = undefined;
}

export function canRunReviewerRuntime() {
  try {
    void getRuntimeConfig();
    return true;
  } catch {
    return false;
  }
}

export function getReviewerRuntimeBaseUrl() {
  return getRuntimeConfig().baseUrl;
}

export async function requestPaidReview(input: {
  bountyId: string;
  serviceName: string;
  endpoint: string;
}): Promise<ReviewReceipt> {
  const config = getRuntimeConfig();
  const runtime = await ensureReviewerRuntime();
  const httpClient = createX402HttpClient();
  const initialResponse = await fetch(`${runtime.baseUrl}${input.endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TaskMesh-Bounty-Id": input.bountyId,
    },
    body: JSON.stringify({
      bountyId: input.bountyId,
      serviceName: input.serviceName,
    }),
  });

  if (initialResponse.status !== 402) {
    throw new Error(`Expected x402 payment challenge, got HTTP ${initialResponse.status}.`);
  }

  const paymentRequired = httpClient.getPaymentRequiredResponse((name) => initialResponse.headers.get(name));
  if (paymentRequired.x402Version !== 2) {
    throw new Error(`Unsupported x402 version for reviewer payment: ${paymentRequired.x402Version}`);
  }

  const paymentPayload = await buildContractAccountX402PaymentPayload({
    config,
    paymentRequired,
  });
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
  const response = await fetch(`${runtime.baseUrl}${input.endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TaskMesh-Bounty-Id": input.bountyId,
      ...paymentHeaders,
    },
    body: JSON.stringify({
      bountyId: input.bountyId,
      serviceName: input.serviceName,
    }),
  });

  if (!response.ok) {
    throw new Error(`x402 reviewer request failed with HTTP ${response.status}.`);
  }

  const body = (await response.json()) as { reviewId?: string };
  const settleHeader = response.headers.get("PAYMENT-RESPONSE");
  if (!settleHeader) {
    throw new Error("x402 reviewer response is missing PAYMENT-RESPONSE.");
  }

  const settle = decodePaymentResponseHeader(settleHeader);
  console.log(
    `[x402] reviewer payment settled tx=${settle.transaction} payer=${config.workerAccountId} recipient=${config.reviewerAccountId} bounty=${input.bountyId}`,
  );

  return {
    reviewId: body.reviewId ?? crypto.randomUUID(),
    txHash: settle.transaction,
    explorerUrl: buildExplorerUrl(settle.transaction, config),
    payer: config.workerAccountId,
    recipient: config.reviewerAccountId,
    amount: config.x402ReviewPrice,
    asset: config.assetAddress,
    serviceUrl: `${runtime.baseUrl}${input.endpoint}`,
  };
}

export async function requestPayoutWatchSession(input: {
  bountyId: string;
}): Promise<WatchSessionReceipt> {
  const config = getRuntimeConfig();
  const runtime = await ensureReviewerRuntime();
  const sessionId = crypto.randomUUID();
  const totalAmount = (
    Number(config.mppOpenPrice) + Number(config.mppCheckpointPrice)
  ).toFixed(3);

  const openChallengeResponse = await fetch(`${runtime.baseUrl}/payout-watch/open`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bountyId: input.bountyId,
      sessionId,
    }),
  });
  if (openChallengeResponse.status !== 402) {
    throw new Error(`Expected an MPP challenge for payout-watch open, got HTTP ${openChallengeResponse.status}.`);
  }
  const openChallenge = MppChallenge.fromResponse(openChallengeResponse);
  const openCredential = await buildContractAccountChargeCredential({
    config,
    challenge: openChallenge as ReturnType<typeof buildMppChallenge>,
  });
  const openResponse = await fetch(`${runtime.baseUrl}/payout-watch/open`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: openCredential,
    },
    body: JSON.stringify({
      bountyId: input.bountyId,
      sessionId,
    }),
  });
  if (!openResponse.ok) {
    throw new Error(`MPP payout-watch open failed with HTTP ${openResponse.status}: ${await openResponse.text()}`);
  }
  const openReceipt = MppReceipt.fromResponse(openResponse);

  const checkpointChallengeResponse = await fetch(`${runtime.baseUrl}/payout-watch/checkpoint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bountyId: input.bountyId,
      sessionId,
    }),
  });
  if (checkpointChallengeResponse.status !== 402) {
    throw new Error(
      `Expected an MPP challenge for payout-watch checkpoint, got HTTP ${checkpointChallengeResponse.status}.`,
    );
  }
  const checkpointChallenge = MppChallenge.fromResponse(checkpointChallengeResponse);
  const checkpointCredential = await buildContractAccountChargeCredential({
    config,
    challenge: checkpointChallenge as ReturnType<typeof buildMppChallenge>,
  });
  const checkpointResponse = await fetch(`${runtime.baseUrl}/payout-watch/checkpoint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: checkpointCredential,
    },
    body: JSON.stringify({
      bountyId: input.bountyId,
      sessionId,
    }),
  });
  if (!checkpointResponse.ok) {
    throw new Error(`MPP payout-watch checkpoint failed with HTTP ${checkpointResponse.status}: ${await checkpointResponse.text()}`);
  }
  const checkpointReceipt = MppReceipt.fromResponse(checkpointResponse);

  console.log(
    `[mpp] payout-watch session=${sessionId} payer=${config.workerAccountId} recipient=${config.reviewerAccountId} open_tx=${openReceipt.reference} checkpoint_tx=${checkpointReceipt.reference} bounty=${input.bountyId}`,
  );

  return {
    sessionId,
    phaseReceipts: [
      {
        phase: "open",
        txHash: openReceipt.reference,
        explorerUrl: buildExplorerUrl(openReceipt.reference, config),
      },
      {
        phase: "checkpoint",
        txHash: checkpointReceipt.reference,
        explorerUrl: buildExplorerUrl(checkpointReceipt.reference, config),
      },
    ],
    totalAmount,
    payer: config.workerAccountId,
    recipient: config.reviewerAccountId,
    asset: config.assetAddress,
    serviceUrl: `${runtime.baseUrl}/payout-watch`,
  };
}
