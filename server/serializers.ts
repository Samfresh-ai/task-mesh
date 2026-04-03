import type { EvidenceItem, Market, Signal } from "@prisma/client";

import { toNumber } from "@/server/db/helpers";

export function serializeMarket(market: Market & { _count?: { evidenceItems: number; signals: number } }) {
  return {
    id: market.id,
    externalId: market.externalId,
    title: market.title,
    description: market.description,
    venue: market.venue,
    category: market.category,
    marketUrl: market.marketUrl,
    resolutionDate: market.resolutionDate,
    currentProbability: toNumber(market.currentProbability),
    lastPolledAt: market.lastPolledAt,
    createdAt: market.createdAt,
    updatedAt: market.updatedAt,
    evidenceCount: market._count?.evidenceItems,
    signalCount: market._count?.signals,
  };
}

export function serializeEvidence(item: EvidenceItem) {
  return {
    id: item.id,
    marketId: item.marketId,
    title: item.title,
    url: item.url,
    sourceName: item.sourceName,
    sourceType: item.sourceType,
    trustScore: toNumber(item.trustScore),
    publishedAt: item.publishedAt,
    summary: item.summary,
    relevanceScore: toNumber(item.relevanceScore),
    rawContent: item.rawContent,
    createdAt: item.createdAt,
  };
}

export function serializeSignal(signal: Signal | null) {
  if (!signal) {
    return null;
  }

  return {
    id: signal.id,
    marketId: signal.marketId,
    currentProbability: toNumber(signal.currentProbability),
    fairProbability: toNumber(signal.fairProbability),
    edge: toNumber(signal.edge),
    confidence: toNumber(signal.confidence),
    status: signal.status,
    thesis: signal.thesis,
    reasonCodes: signal.reasonCodes,
    createdAt: signal.createdAt,
  };
}
