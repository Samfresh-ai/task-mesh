import type { Market } from "@prisma/client";

import { env } from "@/server/config/env";
import { prisma, withPrismaReconnect } from "@/server/db/client";
import { decimal, toNumber } from "@/server/db/helpers";
import { parsePriceMarket } from "@/server/markets/parse";
import type { EvidenceSnapshot } from "@/server/types";
import { clamp, hashKey } from "@/lib/utils";

type CoinbaseSpotResponse = {
  data?: {
    base?: string;
    currency?: string;
    amount?: string;
  };
};

type CoinbaseStatsResponse = {
  open?: string;
  high?: string;
  low?: string;
  last?: string;
  volume?: string;
};

function productId(symbol: string) {
  return `${symbol}-USD`;
}

function hourBucket() {
  return new Date().toISOString().slice(0, 13);
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Evidence fetch failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
}

function formatTargetPrice(targetPrice: number) {
  return targetPrice >= 1
    ? targetPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : targetPrice.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function buildEvidenceSnapshots(market: Market, spotPrice: number, openPrice: number | null, high: number | null, low: number | null, volume: number | null) {
  const parsed = parsePriceMarket(market.title, market.description);
  const distance = parsed.targetPrice ? ((spotPrice - parsed.targetPrice) / parsed.targetPrice) * 100 : null;
  const dailyChange = openPrice ? ((spotPrice - openPrice) / openPrice) * 100 : null;
  const product = parsed.assetSymbol ? productId(parsed.assetSymbol) : null;
  const bucket = hourBucket();
  const relevance = parsed.assetSymbol && parsed.targetPrice ? 0.94 : 0.55;
  const now = new Date();
  const formattedTargetPrice = parsed.targetPrice != null ? formatTargetPrice(parsed.targetPrice) : null;

  const snapshots: EvidenceSnapshot[] = [
    {
      title: `${product ?? "Asset"} spot on Coinbase`,
      url: `${env.COINBASE_API_BASE_URL}/prices/${product ?? "BTC-USD"}/spot`,
      sourceName: "Coinbase",
      sourceType: "official_exchange_api",
      trustScore: 0.95,
      publishedAt: now,
      summary:
        formattedTargetPrice != null && distance != null
          ? `${parsed.assetSymbol ?? "Asset"} spot is $${spotPrice.toFixed(2)}, ${Math.abs(distance).toFixed(2)}% ${distance >= 0 ? "above" : "below"} the market target of $${formattedTargetPrice}.`
          : `Coinbase spot snapshot shows ${parsed.assetSymbol ?? "the asset"} at $${spotPrice.toFixed(2)}.`,
      relevanceScore: relevance,
      rawContent: JSON.stringify({
        kind: "spot",
        assetSymbol: parsed.assetSymbol,
        targetPrice: parsed.targetPrice,
        direction: parsed.direction,
        spotPrice,
        distancePct: distance,
      }),
      dedupeKey: hashKey([market.id, "coinbase-spot", product ?? "unknown", bucket]),
    },
    {
      title: `${product ?? "Asset"} 24h Coinbase stats`,
      url: `${env.COINBASE_EXCHANGE_API_BASE_URL}/products/${product ?? "BTC-USD"}/stats`,
      sourceName: "Coinbase Exchange",
      sourceType: "official_exchange_api",
      trustScore: 0.92,
      publishedAt: now,
      summary:
        dailyChange != null
          ? `Coinbase 24h move is ${dailyChange >= 0 ? "+" : ""}${dailyChange.toFixed(2)}% with a range of $${(low ?? spotPrice).toFixed(2)} to $${(high ?? spotPrice).toFixed(2)} and volume ${volume?.toFixed(2) ?? "N/A"}.`
          : `Coinbase exchange stats report the latest market structure for ${product ?? "the asset"}.`,
      relevanceScore: clamp(relevance - 0.04, 0.4, 0.95),
      rawContent: JSON.stringify({
        kind: "stats",
        assetSymbol: parsed.assetSymbol,
        targetPrice: parsed.targetPrice,
        direction: parsed.direction,
        spotPrice,
        openPrice,
        high,
        low,
        volume,
        dailyChangePct: dailyChange,
      }),
      dedupeKey: hashKey([market.id, "coinbase-stats", product ?? "unknown", bucket]),
    },
  ];

  return snapshots;
}

async function pullEvidenceForMarket(market: Market) {
  const parsed = parsePriceMarket(market.title, market.description);
  if (!parsed.assetSymbol) {
    return [];
  }

  const product = productId(parsed.assetSymbol);
  const [spotResponse, statsResponse] = await Promise.all([
    fetchJson<CoinbaseSpotResponse>(`${env.COINBASE_API_BASE_URL}/prices/${product}/spot`),
    fetchJson<CoinbaseStatsResponse>(`${env.COINBASE_EXCHANGE_API_BASE_URL}/products/${product}/stats`),
  ]);

  const spotPrice = Number(spotResponse.data?.amount);
  const openPrice = statsResponse.open ? Number(statsResponse.open) : null;
  const high = statsResponse.high ? Number(statsResponse.high) : null;
  const low = statsResponse.low ? Number(statsResponse.low) : null;
  const volume = statsResponse.volume ? Number(statsResponse.volume) : null;

  if (!Number.isFinite(spotPrice)) {
    throw new Error(`Coinbase spot response missing amount for ${product}`);
  }

  const snapshots = buildEvidenceSnapshots(market, spotPrice, openPrice, high, low, volume);
  const saved = await Promise.all(
    snapshots.map((snapshot) =>
      prisma.evidenceItem.upsert({
        where: { dedupeKey: snapshot.dedupeKey },
        update: {
          title: snapshot.title,
          url: snapshot.url,
          sourceName: snapshot.sourceName,
          sourceType: snapshot.sourceType,
          trustScore: decimal(snapshot.trustScore),
          publishedAt: snapshot.publishedAt,
          summary: snapshot.summary,
          relevanceScore: decimal(snapshot.relevanceScore),
          rawContent: snapshot.rawContent,
        },
        create: {
          marketId: market.id,
          title: snapshot.title,
          url: snapshot.url,
          sourceName: snapshot.sourceName,
          sourceType: snapshot.sourceType,
          trustScore: decimal(snapshot.trustScore),
          publishedAt: snapshot.publishedAt,
          summary: snapshot.summary,
          relevanceScore: decimal(snapshot.relevanceScore),
          rawContent: snapshot.rawContent,
          dedupeKey: snapshot.dedupeKey,
        },
      }),
    ),
  );

  return saved.map((item) => ({
    ...item,
    trustScore: toNumber(item.trustScore) ?? 0,
    relevanceScore: toNumber(item.relevanceScore) ?? 0,
  }));
}

export async function pullEvidenceJob() {
  return withPrismaReconnect(async () => {
    const startedAt = new Date();
    const log = await prisma.ingestionLog.create({
      data: {
        type: "pull_evidence",
        status: "started",
        metadata: { startedAt: startedAt.toISOString() },
        startedAt,
      },
    });

    try {
      const markets = await prisma.market.findMany({
        orderBy: { updatedAt: "desc" },
      });

      const evidenceByMarket = await Promise.all(markets.map((market) => pullEvidenceForMarket(market)));

      await prisma.ingestionLog.update({
        where: { id: log.id },
        data: {
          status: "success",
          metadata: {
            marketCount: markets.length,
            evidenceCount: evidenceByMarket.flat().length,
          },
          completedAt: new Date(),
        },
      });

      return evidenceByMarket.flat();
    } catch (error) {
      await prisma.ingestionLog.update({
        where: { id: log.id },
        data: {
          status: "error",
          metadata: {
            message: error instanceof Error ? error.message : "Unknown evidence failure",
          },
          completedAt: new Date(),
        },
      });
      throw error;
    }
  });
}
