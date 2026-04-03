import { SignalStatus } from "@prisma/client";

export type AssetSymbol =
  | "BTC"
  | "ETH"
  | "SOL"
  | "XRP"
  | "DOGE"
  | "ADA"
  | "AVAX"
  | "LINK"
  | "LTC"
  | "BCH"
  | "UNI"
  | "AAVE";

export type EvidenceSnapshot = {
  title: string;
  url: string;
  sourceName: string;
  sourceType: string;
  trustScore: number;
  publishedAt?: Date;
  summary: string;
  relevanceScore: number;
  rawContent?: string;
  dedupeKey: string;
};

export type MarketEvidencePayload = {
  kind?: string;
  assetSymbol?: AssetSymbol | null;
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

export type DetectorResult = {
  status: SignalStatus;
  currentProbability: number;
  fairProbability: number;
  edge: number;
  confidence: number;
  reasonCodes: string[];
  thesis: string;
};
