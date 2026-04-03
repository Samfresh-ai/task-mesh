import type { EvidenceItem, Market } from "@prisma/client";
import { SignalStatus } from "@prisma/client";

import { env } from "@/server/config/env";
import { toNumber } from "@/server/db/helpers";
import { parsePriceMarket } from "@/server/markets/parse";
import type { DetectorResult } from "@/server/types";
import { clamp, hoursUntil } from "@/lib/utils";

type EvidencePayload = {
  kind?: string;
  spotPrice?: number;
  targetPrice?: number | null;
  direction?: "above" | "below" | null;
  distancePct?: number | null;
  openPrice?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  dailyChangePct?: number | null;
};

function parsePayload(rawContent: string | null): EvidencePayload {
  if (!rawContent) {
    return {};
  }

  try {
    return JSON.parse(rawContent) as EvidencePayload;
  } catch {
    return {};
  }
}

function freshnessScore(publishedAt: Date | null, createdAt: Date) {
  const ageHours = ((Date.now() - (publishedAt ?? createdAt).getTime()) / 1000) / 3600;
  return clamp(1 - ageHours / env.EVIDENCE_FRESHNESS_HOURS, 0, 1);
}

export function runDetector(market: Market, evidenceItems: EvidenceItem[]): DetectorResult {
  const currentProbability = toNumber(market.currentProbability) ?? 0.5;
  const parsedMarket = parsePriceMarket(market.title, market.description);
  const evidence = evidenceItems.map((item) => ({
    ...item,
    trustScore: toNumber(item.trustScore) ?? 0,
    relevanceScore: toNumber(item.relevanceScore) ?? 0,
    payload: parsePayload(item.rawContent),
    freshness: freshnessScore(item.publishedAt, item.createdAt),
  }));

  const spotEvidence = evidence.find((item) => item.payload.kind === "spot");
  const statsEvidence = evidence.find((item) => item.payload.kind === "stats");
  const targetPrice = spotEvidence?.payload.targetPrice ?? parsedMarket.targetPrice;
  const direction = spotEvidence?.payload.direction ?? parsedMarket.direction;
  const spotPrice = spotEvidence?.payload.spotPrice ?? null;
  const dailyChangePct = statsEvidence?.payload.dailyChangePct ?? null;

  const confidenceBase =
    evidence.reduce((sum, item) => sum + item.trustScore * item.relevanceScore * item.freshness, 0) /
    Math.max(evidence.length, 1);

  if (!targetPrice || !direction || !spotPrice) {
    return {
      status: SignalStatus.no_signal,
      currentProbability,
      fairProbability: currentProbability,
      edge: 0,
      confidence: clamp(0.3 + confidenceBase * 0.2, 0.1, 0.45),
      reasonCodes: ["INSUFFICIENT_STRUCTURED_EVIDENCE"],
      thesis: "The market is monitored, but the current evidence pipeline could not extract a clean pricing context for this market.",
    };
  }

  const directionFactor = direction === "above" ? 1 : -1;
  const distancePct = ((spotPrice - targetPrice) / targetPrice) * directionFactor;
  const adjustedMomentum = (dailyChangePct ?? 0) / 100 * directionFactor;
  const hoursLeft = hoursUntil(market.resolutionDate);
  const nearDeadlineBoost =
    hoursLeft == null ? 0 : hoursLeft <= 24 ? 0.18 : hoursLeft <= 72 ? 0.1 : hoursLeft <= 168 ? 0.04 : -0.03;

  const rawFairProbability = 0.5 + distancePct * 4 + adjustedMomentum * 1.4 + nearDeadlineBoost;
  const fairProbability = clamp(rawFairProbability, 0.03, 0.97);
  const edge = fairProbability - currentProbability;
  const confidence = clamp(
    0.35 + Math.min(Math.abs(edge) * 1.2, 0.25) + confidenceBase * 0.35 + (hoursLeft != null && hoursLeft < 168 ? 0.05 : 0),
    0.12,
    0.95,
  );

  const reasonCodes: string[] = [];
  if (confidenceBase >= 0.6) {
    reasonCodes.push("HIGH_TRUST_EVIDENCE");
  }
  if (evidence.some((item) => item.freshness >= 0.75)) {
    reasonCodes.push("FRESH_EVIDENCE");
  }
  reasonCodes.push(distancePct >= 0 ? "SPOT_FAVORABLE_TO_YES" : "SPOT_FAVORABLE_TO_NO");

  if (dailyChangePct != null) {
    reasonCodes.push(adjustedMomentum >= 0 ? "POSITIVE_MOMENTUM" : "NEGATIVE_MOMENTUM");
  }

  let status: SignalStatus = SignalStatus.no_signal;
  if (Math.abs(edge) >= env.SIGNAL_EDGE_THRESHOLD && confidence >= env.CONFIDENCE_THRESHOLD) {
    status = SignalStatus.signal;
    reasonCodes.push(edge > 0 ? "MARKET_UNDERREACTING" : "MARKET_OVERREACTING");
  } else if (Math.abs(edge) >= env.WATCH_EDGE_THRESHOLD) {
    status = SignalStatus.watch;
    reasonCodes.push("MEANINGFUL_GAP");
  }

  const formattedTargetPrice =
    targetPrice >= 1 ? targetPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : targetPrice.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");

  const thesis =
    edge >= 0
      ? `Coinbase data puts ${parsedMarket.assetSymbol} at $${spotPrice.toFixed(2)} against a $${formattedTargetPrice} threshold, which implies the market may still be pricing in outdated downside risk.`
      : `Coinbase data suggests the yes-case is being priced too aggressively relative to the current ${parsedMarket.assetSymbol} spot of $${spotPrice.toFixed(2)} and the $${formattedTargetPrice} threshold.`;

  return {
    status,
    currentProbability,
    fairProbability,
    edge,
    confidence,
    reasonCodes,
    thesis,
  };
}
