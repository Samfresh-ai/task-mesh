import {
  servicePaymentMethodValues,
  type IntegrationMode,
  type ServicePaymentMethod,
  type ServicePaymentStatus,
  type SubAgentServicePayment,
} from "@/lib/bounty-domain";
import {
  canRunReviewerRuntime,
  getReviewerRuntimeBaseUrl,
  requestPaidReview,
  requestPayoutWatchSession,
} from "@/server/agents/payment-runtime";

export type PaidServiceEndpoint = {
  providerAgentId: string;
  providerLabel: string;
  serviceName: string;
  endpoint: string;
  supportedPaymentMethods: ServicePaymentMethod[];
  quoteAmount: string;
  currency: string;
  settlementDescription: string;
  stage: "real_now" | "stubbed_demo";
  liveConfigured: boolean;
  providerUrl?: string;
};

export type PaidServiceRequest = {
  bountyId: string;
  callerAgentId: string;
  paymentMethod: ServicePaymentMethod;
  serviceName: string;
  endpoint: string;
};

export type PaidServiceResponse = {
  requestId: string;
  payment: SubAgentServicePayment;
  providerReceipt: {
    provider: string;
    mode: IntegrationMode;
    liveConfigured: boolean;
    status: ServicePaymentStatus;
    reference: string;
    authorizationReference?: string;
    settlementDescription: string;
    disclaimer: string;
    providerUrl?: string;
    receiptUrl?: string;
    explorerUrl?: string;
  };
};

type ProviderRuntime = {
  method: ServicePaymentMethod;
  providerUrl?: string;
  liveConfigured: boolean;
};

type ServicePaymentAdapter = {
  method: ServicePaymentMethod;
  label: string;
  getRuntime(): ProviderRuntime;
  requestPayment(input: {
    requestId: string;
    endpoint: Omit<PaidServiceEndpoint, "liveConfigured" | "providerUrl" | "stage">;
    request: PaidServiceRequest;
    now: string;
  }): Promise<PaidServiceResponse>;
};

function trimEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function quoteExpiry(now: string) {
  return new Date(Date.parse(now) + 10 * 60 * 1000).toISOString();
}

function buildPaymentCatalog() {
  return [
    {
      providerAgentId: "signal-bureau",
      providerLabel: "Reviewer Agent",
      serviceName: "Repo risk scan",
      endpoint: "/repo-risk-scan",
      supportedPaymentMethods: ["x402"] as const,
      quoteAmount: trimEnv("TASKMESH_X402_REVIEW_PRICE") ?? "0.009",
      currency: "XLM",
      settlementDescription: "Real Stellar x402 payment for a paid review endpoint.",
    },
    {
      providerAgentId: "ledgermint",
      providerLabel: "Reviewer Agent",
      serviceName: "Payout watch",
      endpoint: "/payout-watch",
      supportedPaymentMethods: ["mpp"] as const,
      quoteAmount: (
        Number(trimEnv("TASKMESH_MPP_OPEN_PRICE") ?? "0.004") + Number(trimEnv("TASKMESH_MPP_CHECKPOINT_PRICE") ?? "0.003")
      ).toFixed(3),
      currency: "XLM",
      settlementDescription: "Real Stellar MPP recurring watch session grouped across multiple paid calls.",
    },
  ] satisfies Array<Omit<PaidServiceEndpoint, "liveConfigured" | "providerUrl" | "stage">>;
}

function getProviderRuntime(method: ServicePaymentMethod): ProviderRuntime {
  return {
    method,
    providerUrl: canRunReviewerRuntime() ? getReviewerRuntimeBaseUrl() : undefined,
    liveConfigured: canRunReviewerRuntime(),
  };
}

function makeDemoResponse(
  method: ServicePaymentMethod,
  runtime: ProviderRuntime,
  input: {
    requestId: string;
    endpoint: Omit<PaidServiceEndpoint, "liveConfigured" | "providerUrl" | "stage">;
    request: PaidServiceRequest;
    now: string;
  },
): PaidServiceResponse {
  const reference = `${method}-demo-${input.requestId}`;
  const status: ServicePaymentStatus = method === "mpp" ? "active" : "settled";

  return {
    requestId: input.requestId,
    payment: {
      id: input.requestId,
      bountyId: input.request.bountyId,
      callerAgentId: input.request.callerAgentId,
      providerAgentId: input.endpoint.providerAgentId,
      serviceName: input.endpoint.serviceName,
      endpoint: input.endpoint.endpoint,
      paymentMethod: method,
      status,
      amount: input.endpoint.quoteAmount,
      currency: input.endpoint.currency,
      mode: "demo",
      liveConfigured: runtime.liveConfigured,
      providerUrl: runtime.providerUrl,
      quotedAt: input.now,
      settledAt: input.now,
      providerReceiptId: reference,
      providerReference: reference,
      quote: {
        id: `${input.requestId}-quote`,
        amount: input.endpoint.quoteAmount,
        currency: input.endpoint.currency,
        quotedAt: input.now,
        expiresAt: quoteExpiry(input.now),
        pricingUnit: "service_call",
        providerUrl: runtime.providerUrl,
        mode: "demo",
      },
      authorization: {
        status: "authorized",
        scheme: "demo_receipt",
        authorizedAt: input.now,
        reference,
        note: `TaskMesh could not start the reviewer runtime, so it preserved a demo ${method.toUpperCase()} receipt instead of masking the gap.`,
      },
      settlement: {
        status: method === "mpp" ? "active" : "settled",
        settledAt: input.now,
        reference,
        note:
          method === "mpp"
            ? "Demo MPP session recorded because live reviewer runtime env was incomplete."
            : "Demo x402 receipt recorded because live reviewer runtime env was incomplete.",
      },
      note:
        method === "mpp"
          ? "Worker requested a recurring review lane, but TaskMesh had to stay at the explicit demo boundary."
          : "Worker requested a paid review, but TaskMesh had to stay at the explicit demo boundary.",
    },
    providerReceipt: {
      provider: input.endpoint.providerLabel,
      mode: "demo",
      liveConfigured: runtime.liveConfigured,
      status,
      reference,
      settlementDescription: input.endpoint.settlementDescription,
      disclaimer: "No live payment was attempted because the reviewer runtime env was incomplete.",
      providerUrl: runtime.providerUrl,
    },
  };
}

async function makeLiveX402Response(input: {
  requestId: string;
  endpoint: Omit<PaidServiceEndpoint, "liveConfigured" | "providerUrl" | "stage">;
  request: PaidServiceRequest;
  now: string;
}): Promise<PaidServiceResponse> {
  const receipt = await requestPaidReview({
    bountyId: input.request.bountyId,
    serviceName: input.request.serviceName,
    endpoint: input.request.endpoint,
  });

  return {
    requestId: input.requestId,
    payment: {
      id: input.requestId,
      bountyId: input.request.bountyId,
      callerAgentId: input.request.callerAgentId,
      providerAgentId: input.endpoint.providerAgentId,
      serviceName: input.endpoint.serviceName,
      endpoint: input.endpoint.endpoint,
      paymentMethod: "x402",
      status: "settled",
      amount: receipt.amount,
      currency: input.endpoint.currency,
      mode: "real",
      liveConfigured: true,
      providerUrl: receipt.serviceUrl,
      quotedAt: input.now,
      settledAt: input.now,
      providerReceiptId: receipt.reviewId,
      providerReference: receipt.txHash,
      quote: {
        id: `${input.requestId}-quote`,
        amount: receipt.amount,
        currency: input.endpoint.currency,
        quotedAt: input.now,
        expiresAt: quoteExpiry(input.now),
        pricingUnit: "service_call",
        providerUrl: receipt.serviceUrl,
        mode: "real",
      },
      authorization: {
        status: "authorized",
        scheme: "x402_header",
        authorizedAt: input.now,
        reference: receipt.txHash,
        note: `Worker auto-paid the reviewer over x402 from ${receipt.payer} to ${receipt.recipient}.`,
      },
      settlement: {
        status: "settled",
        settledAt: input.now,
        reference: receipt.txHash,
        explorerUrl: receipt.explorerUrl,
        network: "stellar:testnet",
        note: `Real x402 settlement reached testnet. Review receipt ${receipt.reviewId}.`,
      },
      note: `Real Stellar x402 review payment settled on-chain: ${receipt.txHash}.`,
    },
    providerReceipt: {
      provider: input.endpoint.providerLabel,
      mode: "real",
      liveConfigured: true,
      status: "settled",
      reference: receipt.txHash,
      authorizationReference: receipt.reviewId,
      settlementDescription: input.endpoint.settlementDescription,
      disclaimer: "Reviewer Agent accepted a real x402 payment and the worker auto-paid on retry.",
      providerUrl: receipt.serviceUrl,
      explorerUrl: receipt.explorerUrl,
    },
  };
}

async function makeLiveMppResponse(input: {
  requestId: string;
  endpoint: Omit<PaidServiceEndpoint, "liveConfigured" | "providerUrl" | "stage">;
  request: PaidServiceRequest;
  now: string;
}): Promise<PaidServiceResponse> {
  const session = await requestPayoutWatchSession({
    bountyId: input.request.bountyId,
  });
  const checkpointReceipt = session.phaseReceipts[session.phaseReceipts.length - 1];
  const openReceipt = session.phaseReceipts[0];

  return {
    requestId: input.requestId,
    payment: {
      id: input.requestId,
      bountyId: input.request.bountyId,
      callerAgentId: input.request.callerAgentId,
      providerAgentId: input.endpoint.providerAgentId,
      serviceName: input.endpoint.serviceName,
      endpoint: input.endpoint.endpoint,
      paymentMethod: "mpp",
      status: "active",
      amount: session.totalAmount,
      currency: input.endpoint.currency,
      mode: "real",
      liveConfigured: true,
      providerUrl: session.serviceUrl,
      quotedAt: input.now,
      settledAt: input.now,
      providerReceiptId: session.sessionId,
      providerReference: checkpointReceipt.txHash,
      quote: {
        id: `${input.requestId}-quote`,
        amount: session.totalAmount,
        currency: input.endpoint.currency,
        quotedAt: input.now,
        expiresAt: quoteExpiry(input.now),
        pricingUnit: "recurring_session",
        providerUrl: session.serviceUrl,
        mode: "real",
      },
      authorization: {
        status: "authorized",
        scheme: "mpp_stream",
        authorizedAt: input.now,
        reference: session.sessionId,
        note: `Worker opened payout-watch session ${session.sessionId} from its contract account and the on-chain spend policy authorized the recurring review charges.`,
      },
      settlement: {
        status: "active",
        settledAt: input.now,
        reference: session.sessionId,
        explorerUrl: checkpointReceipt.explorerUrl,
        network: "stellar:testnet",
        note: `Real MPP session settled two on-chain charge receipts: open ${openReceipt.txHash}, checkpoint ${checkpointReceipt.txHash}.`,
      },
      note: `Real Stellar MPP recurring session ${session.sessionId} recorded two review-watch charges on-chain.`,
    },
    providerReceipt: {
      provider: input.endpoint.providerLabel,
      mode: "real",
      liveConfigured: true,
      status: "active",
      reference: checkpointReceipt.txHash,
      authorizationReference: session.sessionId,
      settlementDescription: input.endpoint.settlementDescription,
      disclaimer: "Reviewer Agent accepted a real MPP recurring session backed by two paid requests.",
      providerUrl: session.serviceUrl,
      explorerUrl: checkpointReceipt.explorerUrl,
    },
  };
}

const adapters: Record<ServicePaymentMethod, ServicePaymentAdapter> = {
  x402: {
    method: "x402",
    label: "x402",
    getRuntime() {
      return getProviderRuntime("x402");
    },
    async requestPayment(input) {
      const runtime = getProviderRuntime("x402");

      if (!runtime.liveConfigured) {
        return makeDemoResponse("x402", runtime, input);
      }

      return makeLiveX402Response(input);
    },
  },
  mpp: {
    method: "mpp",
    label: "MPP",
    getRuntime() {
      return getProviderRuntime("mpp");
    },
    async requestPayment(input) {
      const runtime = getProviderRuntime("mpp");

      if (!runtime.liveConfigured) {
        return makeDemoResponse("mpp", runtime, input);
      }

      return makeLiveMppResponse(input);
    },
  },
};

export function listPaidServiceEndpoints() {
  return buildPaymentCatalog().map((endpoint) => {
    const runtime = endpoint.supportedPaymentMethods.map((method) => adapters[method].getRuntime()).find((entry) => entry.liveConfigured)
      ?? adapters[endpoint.supportedPaymentMethods[0]].getRuntime();

    return {
      ...endpoint,
      stage: runtime.liveConfigured ? "real_now" : "stubbed_demo",
      liveConfigured: runtime.liveConfigured,
      providerUrl: runtime.providerUrl,
    };
  });
}

export function isKnownPaymentMethod(method: string): method is ServicePaymentMethod {
  return servicePaymentMethodValues.includes(method as ServicePaymentMethod);
}

export async function requestPaidService(request: PaidServiceRequest): Promise<PaidServiceResponse> {
  const endpoint = buildPaymentCatalog().find(
    (candidate) => candidate.endpoint === request.endpoint && candidate.serviceName === request.serviceName,
  );

  if (!endpoint) {
    throw new Error(`Unknown paid service endpoint: ${request.serviceName} ${request.endpoint}`);
  }

  if (!(endpoint.supportedPaymentMethods as readonly ServicePaymentMethod[]).includes(request.paymentMethod)) {
    throw new Error(`Endpoint ${request.endpoint} does not support ${request.paymentMethod}.`);
  }

  const requestId = globalThis.crypto.randomUUID();
  return adapters[request.paymentMethod].requestPayment({
    requestId,
    endpoint,
    request,
    now: new Date().toISOString(),
  });
}
