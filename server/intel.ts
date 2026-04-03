import type { Prisma } from "@prisma/client";

import { clamp, formatDateTime, formatRelativeTime, percent } from "@/lib/utils";
import { prisma, withPrismaReconnect } from "@/server/db/client";
import { toNumber } from "@/server/db/helpers";
import { parsePriceMarket } from "@/server/markets/parse";
import type { MarketEvidencePayload } from "@/server/types";

export type ScanState =
  | "monitoring"
  | "evidence_found"
  | "evaluating"
  | "watch"
  | "signal"
  | "contradicted"
  | "stale";

export type SignalState = "clear" | "watch" | "signal";
export type ScannerCategory = "Crypto" | "Stocks" | "Commodities";

type ActivityTone = "critical" | "positive" | "warning" | "neutral";

type MarketWithRelations = Awaited<ReturnType<typeof loadMarkets>>[number];

export type MarketScannerRow = {
  id: string;
  externalId: string;
  title: string;
  description: string | null;
  venue: string;
  category: string | null;
  scannerCategory: ScannerCategory;
  marketUrl: string;
  resolutionDate: Date | null;
  timeframe: string;
  expiresLabel: string;
  expiresRelative: string;
  currentProbability: number;
  yesPrice: number;
  noPrice: number;
  fairProbability: number;
  fairValueLabel: string;
  edge: number;
  confidence: number;
  signalStatus: "no_signal" | "watch" | "signal";
  signalState: SignalState;
  scanState: ScanState;
  thesis: string;
  invalidation: string;
  reasonCodes: string[];
  evidenceCount: number;
  signalCount: number;
  sourceQuality: number;
  freshness: number;
  volume24h: number | null;
  updatedAt: Date;
  lastPolledAt: Date | null;
  lastScanAt: Date;
  latestEvidence: {
    id: string;
    title: string;
    sourceName: string;
    sourceType: string;
    summary: string;
    trustScore: number;
    relevanceScore: number;
    publishedAt: Date | null;
    createdAt: Date;
    url: string;
  } | null;
  probabilityHistory: Array<{
    label: string;
    fairProbability: number;
    edge: number;
  }>;
};

const marketQuery = {
  include: {
    _count: {
      select: {
        evidenceItems: true,
        signals: true,
      },
    },
    evidenceItems: {
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
    },
    signals: {
      orderBy: { createdAt: "desc" },
      take: 8,
    },
  },
  orderBy: { updatedAt: "desc" },
} satisfies Prisma.MarketFindManyArgs;

const recentLogsQuery = {
  orderBy: { startedAt: "desc" },
  take: 24,
} satisfies Prisma.IngestionLogFindManyArgs;

const recentEvidenceQuery = {
  include: { market: true },
  orderBy: { createdAt: "desc" },
  take: 16,
} satisfies Prisma.EvidenceItemFindManyArgs;

const recentSignalsQuery = {
  include: { market: true },
  orderBy: { createdAt: "desc" },
  take: 16,
} satisfies Prisma.SignalFindManyArgs;

function hoursSince(date: Date | null | undefined) {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }

  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

function computeFreshnessScore(date: Date | null | undefined) {
  if (!date) {
    return 0;
  }

  return clamp(1 - hoursSince(date) / 6, 0, 1);
}

function parseEvidencePayload(rawContent: string | null): MarketEvidencePayload {
  if (!rawContent) {
    return {};
  }

  try {
    return JSON.parse(rawContent) as MarketEvidencePayload;
  } catch {
    return {};
  }
}

function inferScannerCategory(market: Pick<MarketWithRelations, "title" | "description" | "category">): ScannerCategory {
  const haystack = `${market.title} ${market.description ?? ""} ${market.category ?? ""}`.toLowerCase();
  const parsed = parsePriceMarket(market.title, market.description);

  if (/\b(gold|silver|oil|brent|wti|commodity|commodities|copper|natural gas)\b/i.test(haystack)) {
    return "Commodities";
  }

  if (/\b(stock|stocks|share|shares|equity|equities|nasdaq|s&p|dow|apple|tesla|nvidia|microsoft)\b/i.test(haystack)) {
    return "Stocks";
  }

  if (parsed.assetSymbol || /\bcrypto|token|coin|btc|eth|sol|xrp|doge|ada|avax|link|ltc|bch|uni|aave\b/i.test(haystack)) {
    return "Crypto";
  }

  return "Crypto";
}

function deriveSignalState(status: "no_signal" | "watch" | "signal" | undefined): SignalState {
  if (status === "signal") {
    return "signal";
  }

  if (status === "watch") {
    return "watch";
  }

  return "clear";
}

function deriveScanState(market: MarketWithRelations): ScanState {
  const latestSignal = market.signals[0];
  const latestEvidence = market.evidenceItems[0];
  const latestUpdatedAt = latestSignal?.createdAt ?? latestEvidence?.createdAt ?? market.lastPolledAt ?? market.updatedAt;
  const stale = hoursSince(latestUpdatedAt) > 3;

  if (stale) {
    return "stale";
  }

  if (latestSignal?.status === "signal") {
    return "signal";
  }

  if (latestSignal?.status === "watch") {
    return "watch";
  }

  const latestEdge = toNumber(latestSignal?.edge) ?? 0;

  if (latestEvidence && latestSignal && latestEdge < -0.03) {
    return "contradicted";
  }

  if (latestEvidence && latestSignal) {
    return "evaluating";
  }

  if (latestEvidence) {
    return "evidence_found";
  }

  return "monitoring";
}

function formatScannerTimeframe(resolutionDate: Date | null) {
  if (!resolutionDate) {
    return "Open-ended";
  }

  const hours = (resolutionDate.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hours <= 24) {
    return "Today";
  }
  if (hours <= 72) {
    return "Next 72h";
  }
  if (hours <= 168) {
    return "This week";
  }
  if (hours <= 24 * 30) {
    return "This month";
  }

  return "Longer-dated";
}

function deriveInvalidation(
  market: Pick<MarketWithRelations, "title" | "description">,
  spotPrice: number | null,
  targetPrice: number | null,
  direction: "above" | "below" | null,
  edge: number,
) {
  const parsed = parsePriceMarket(market.title, market.description);
  const asset = parsed.assetSymbol ?? "the asset";

  if (spotPrice == null || targetPrice == null || !direction) {
    return "Invalidation: wait for fresh structured spot and threshold evidence before acting.";
  }

  const formattedTarget =
    targetPrice >= 1
      ? targetPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : targetPrice.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");

  if (edge >= 0) {
    return direction === "above"
      ? `Invalidation: YES weakens if ${asset} spot slips back below $${formattedTarget} or the fair-value gap closes.`
      : `Invalidation: YES weakens if ${asset} spot rebounds materially above $${formattedTarget} or the fair-value gap closes.`;
  }

  return direction === "above"
    ? `Invalidation: NO weakens if ${asset} spot reclaims $${formattedTarget} with momentum and compresses the edge.`
    : `Invalidation: NO weakens if ${asset} spot breaks back below $${formattedTarget} and the market reprices lower.`;
}

function buildMarketRow(market: MarketWithRelations): MarketScannerRow {
  const latestSignal = market.signals[0] ?? null;
  const latestEvidence = market.evidenceItems[0] ?? null;
  const latestSignalPayload = latestEvidence ? parseEvidencePayload(latestEvidence.rawContent) : {};
  const latestStatsPayload =
    market.evidenceItems.map((item) => parseEvidencePayload(item.rawContent)).find((payload) => payload.kind === "stats") ?? {};
  const freshness = computeFreshnessScore(
    latestEvidence?.publishedAt ?? latestEvidence?.createdAt ?? latestSignal?.createdAt ?? market.lastPolledAt,
  );
  const evidenceQuality =
    market.evidenceItems.length === 0
      ? 0
      : market.evidenceItems.reduce(
          (sum, item) => sum + (toNumber(item.trustScore) ?? 0) * (toNumber(item.relevanceScore) ?? 0),
          0,
        ) / market.evidenceItems.length;
  const currentProbability = toNumber(market.currentProbability) ?? 0;
  const fairProbability = toNumber(latestSignal?.fairProbability) ?? currentProbability;
  const edge = toNumber(latestSignal?.edge) ?? 0;
  const signalStatus = latestSignal?.status ?? "no_signal";
  const signalState = deriveSignalState(signalStatus);
  const resolutionDate = market.resolutionDate;
  const scannerCategory = inferScannerCategory(market);
  const lastScanAt = latestSignal?.createdAt ?? market.lastPolledAt ?? market.updatedAt;

  return {
    id: market.id,
    externalId: market.externalId,
    title: market.title,
    description: market.description,
    venue: market.venue,
    category: market.category,
    scannerCategory,
    marketUrl: market.marketUrl,
    resolutionDate,
    timeframe: formatScannerTimeframe(resolutionDate),
    expiresLabel: formatDateTime(resolutionDate),
    expiresRelative: resolutionDate ? formatRelativeTime(resolutionDate) : "No expiry",
    currentProbability,
    yesPrice: currentProbability,
    noPrice: clamp(1 - currentProbability, 0, 1),
    fairProbability,
    fairValueLabel: percent(fairProbability),
    edge,
    confidence: toNumber(latestSignal?.confidence) ?? 0,
    signalStatus,
    signalState,
    scanState: deriveScanState(market),
    thesis:
      latestSignal?.thesis ??
      (latestEvidence
        ? "Fresh venue and evidence inputs are present; the scanner is waiting for a stronger pricing edge."
        : "Monitoring this market for fresh price evidence and fair-value drift."),
    invalidation: deriveInvalidation(
      market,
      latestSignalPayload.spotPrice ?? latestStatsPayload.spotPrice ?? null,
      latestSignalPayload.targetPrice ?? latestStatsPayload.targetPrice ?? null,
      latestSignalPayload.direction ?? latestStatsPayload.direction ?? null,
      edge,
    ),
    reasonCodes: normalizeReasonCodes(latestSignal?.reasonCodes),
    evidenceCount: market._count.evidenceItems,
    signalCount: market._count.signals,
    sourceQuality: clamp(evidenceQuality, 0, 1),
    freshness,
    volume24h: latestStatsPayload.volume ?? null,
    updatedAt: market.updatedAt,
    lastPolledAt: market.lastPolledAt,
    lastScanAt,
    latestEvidence: latestEvidence
      ? {
          id: latestEvidence.id,
          title: latestEvidence.title,
          sourceName: latestEvidence.sourceName,
          sourceType: latestEvidence.sourceType,
          summary: latestEvidence.summary,
          trustScore: toNumber(latestEvidence.trustScore) ?? 0,
          relevanceScore: toNumber(latestEvidence.relevanceScore) ?? 0,
          publishedAt: latestEvidence.publishedAt,
          createdAt: latestEvidence.createdAt,
          url: latestEvidence.url,
        }
      : null,
    probabilityHistory: [
      ...market.signals
        .slice()
        .reverse()
        .map((signal) => ({
          label: signal.createdAt.toISOString(),
          fairProbability: toNumber(signal.fairProbability) ?? 0,
          edge: toNumber(signal.edge) ?? 0,
        })),
      {
        label: market.updatedAt.toISOString(),
        fairProbability,
        edge,
      },
    ].slice(-8),
  };
}

async function loadMarkets() {
  return prisma.market.findMany(marketQuery);
}

async function loadRecentActivity(logsOverride?: Awaited<ReturnType<typeof prisma.ingestionLog.findMany>>) {
  const logs = logsOverride?.slice(0, 20) ?? (await prisma.ingestionLog.findMany({ ...recentLogsQuery, take: 20 }));
  const [evidenceItems, signals] = await prisma.$transaction([
    prisma.evidenceItem.findMany(recentEvidenceQuery),
    prisma.signal.findMany(recentSignalsQuery),
  ]);

  const activity: Array<{
    id: string;
    kind: string;
    title: string;
    description: string;
    timestamp: Date;
    tone: ActivityTone;
  }> = [
    ...logs.map((log) => ({
      id: `log-${log.id}`,
      kind: "system",
      title: log.type.replaceAll("_", " "),
      description: `${log.status.toUpperCase()}${log.completedAt ? " • completed" : " • in progress"}`,
      timestamp: log.completedAt ?? log.startedAt,
      tone: (log.status === "error" ? "critical" : log.status === "success" ? "positive" : "neutral") as ActivityTone,
    })),
    ...evidenceItems.map((item) => ({
      id: `evidence-${item.id}`,
      kind: "evidence",
      title: `Evidence mapped to ${item.market.title}`,
      description: `${item.sourceName} • ${item.summary}`,
      timestamp: item.createdAt,
      tone: "neutral" as ActivityTone,
    })),
    ...signals.map((signal) => ({
      id: `signal-${signal.id}`,
      kind: "signal",
      title: `${signal.status.toUpperCase()} on ${signal.market.title}`,
      description: signal.thesis,
      timestamp: signal.createdAt,
      tone: (signal.status === "signal" ? "positive" : signal.status === "watch" ? "warning" : "neutral") as ActivityTone,
    })),
  ]
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 24);

  return activity;
}

function buildHealth(logs: Awaited<ReturnType<typeof prisma.ingestionLog.findMany>>) {
  const latestByType = new Map<string, (typeof logs)[number]>();
  for (const log of logs) {
    if (!latestByType.has(log.type)) {
      latestByType.set(log.type, log);
    }
  }

  const latencySamples = logs
    .filter((log) => log.completedAt)
    .map((log) => log.completedAt!.getTime() - log.startedAt.getTime());

  const averageLatencyMs =
    latencySamples.length > 0
      ? Math.round(latencySamples.reduce((sum, value) => sum + value, 0) / latencySamples.length)
      : 0;

  return {
    averageLatencyMs,
    byType: [...latestByType.entries()].map(([type, log]) => ({
      type,
      status: log.status,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
    })),
  };
}

function buildDashboardStats(
  markets: MarketScannerRow[],
  marketsRaw: Awaited<ReturnType<typeof loadMarkets>>,
  logsRaw: Awaited<ReturnType<typeof prisma.ingestionLog.findMany>>,
) {
  const watchCount = markets.filter((market) => market.signalState === "watch").length;
  const signalCount = markets.filter((market) => market.signalState === "signal").length;
  const staleCount = markets.filter((market) => market.scanState === "stale").length;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const freshEvidenceToday = marketsRaw.reduce(
    (sum, market) => sum + market.evidenceItems.filter((item) => item.createdAt >= since).length,
    0,
  );
  const averageConfidence =
    markets.length > 0
      ? markets.reduce((sum, market) => sum + market.confidence, 0) / markets.length
      : 0;
  const totalVolume24h = markets.reduce((sum, market) => sum + (market.volume24h ?? 0), 0);
  const health = buildHealth(logsRaw);

  return {
    monitoredMarkets: markets.length,
    watchCount,
    signalCount,
    staleCount,
    averageConfidence,
    freshEvidenceToday,
    totalVolume24h,
    averageLatencyMs: health.averageLatencyMs,
    liveMode: "Interval scanning",
    lastSyncAt: markets[0]?.lastScanAt ?? logsRaw[0]?.completedAt ?? logsRaw[0]?.startedAt ?? new Date(),
  };
}

export async function getDashboardView() {
  return withPrismaReconnect(async () => {
    const marketsRaw = await loadMarkets();
    const logsRaw = await prisma.ingestionLog.findMany({ ...recentLogsQuery, take: 20 });
    const activity = await loadRecentActivity(logsRaw);

    const markets = marketsRaw.map(buildMarketRow);
    const stats = buildDashboardStats(markets, marketsRaw, logsRaw);
    const health = buildHealth(logsRaw);

    return {
      markets,
      opportunities: markets
        .filter((market) => ["watch", "signal", "contradicted", "evaluating"].includes(market.scanState))
        .sort((left, right) => Math.abs(right.edge) * right.confidence - Math.abs(left.edge) * left.confidence)
        .slice(0, 6),
      activity,
      health,
      stats,
      lifecycleBreakdown: [
        "monitoring",
        "evidence_found",
        "evaluating",
        "watch",
        "signal",
        "contradicted",
        "stale",
      ].map((state) => ({
        state,
        count: markets.filter((market) => market.scanState === state).length,
      })),
    };
  });
}

export async function getLiveSummary() {
  return withPrismaReconnect(async () => {
    const marketsRaw = await loadMarkets();
    const logsRaw = await prisma.ingestionLog.findMany({ ...recentLogsQuery, take: 18 });

    const markets = marketsRaw.map(buildMarketRow);
    const stats = buildDashboardStats(markets, marketsRaw, logsRaw);
    const health = buildHealth(logsRaw);

    return {
      stats,
      pipeline: health.byType,
    };
  });
}

export async function getMarketsOverviewView() {
  return withPrismaReconnect(async () => {
    const markets = (await loadMarkets()).map(buildMarketRow);
    return { markets };
  });
}

export async function getSignalsView() {
  return withPrismaReconnect(async () => {
    const markets = (await loadMarkets()).map(buildMarketRow);
    return {
      signals: markets.sort(
        (left, right) => Math.abs(right.edge) * (right.confidence || 0.1) - Math.abs(left.edge) * (left.confidence || 0.1),
      ),
    };
  });
}

export async function getActivityView() {
  return withPrismaReconnect(async () => {
    const logs = await prisma.ingestionLog.findMany(recentLogsQuery);
    const activity = await loadRecentActivity(logs);

    return {
      activity,
      health: buildHealth(logs),
    };
  });
}

export async function getMarketDetailView(id: string) {
  return withPrismaReconnect(async () => {
    const market = await prisma.market.findUnique({
      where: { id },
      include: {
        _count: {
          select: { evidenceItems: true, signals: true },
        },
        evidenceItems: {
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          take: 20,
        },
        signals: {
          orderBy: { createdAt: "desc" },
          take: 12,
        },
      },
    });

    if (!market) {
      return null;
    }

    const marketRow = buildMarketRow(market as MarketWithRelations);
    const history = market.signals
      .slice()
      .reverse()
      .map((signal) => ({
        id: signal.id,
        createdAt: signal.createdAt,
        fairProbability: toNumber(signal.fairProbability) ?? 0,
        edge: toNumber(signal.edge) ?? 0,
        confidence: toNumber(signal.confidence) ?? 0,
        status: signal.status,
      }));

    const evidenceTimeline = market.evidenceItems.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      sourceName: item.sourceName,
      sourceType: item.sourceType,
      trustScore: toNumber(item.trustScore) ?? 0,
      relevanceScore: toNumber(item.relevanceScore) ?? 0,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      url: item.url,
    }));

    return {
      market: marketRow,
      history,
      evidenceTimeline,
      scanStages: [
        { label: "Monitoring", state: marketRow.scanState === "monitoring" || marketRow.scanState === "stale" ? "active" : "done" },
        {
          label: "Evidence collected",
          state: ["evidence_found", "evaluating", "watch", "signal", "contradicted"].includes(marketRow.scanState) ? "done" : "pending",
        },
        { label: "Evaluating", state: ["evaluating", "watch", "signal", "contradicted"].includes(marketRow.scanState) ? "done" : "pending" },
        { label: "Watch", state: marketRow.scanState === "watch" ? "active" : ["signal", "contradicted"].includes(marketRow.scanState) ? "done" : "pending" },
        { label: "Signal", state: marketRow.scanState === "signal" ? "active" : "pending" },
      ],
    };
  });
}

function normalizeReasonCodes(reasonCodes: unknown): string[] {
  if (!Array.isArray(reasonCodes)) {
    return [];
  }

  return reasonCodes.filter((value): value is string => typeof value === "string");
}
