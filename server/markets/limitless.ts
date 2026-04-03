import { monitoredMarkets } from "@/server/config/markets";
import { env } from "@/server/config/env";
import { parsePriceMarket } from "@/server/markets/parse";

export type NormalizedMarket = {
  externalId: string;
  title: string;
  description: string | null;
  venue: string;
  category: string | null;
  resolutionDate: Date | null;
  currentProbability: number;
  marketUrl: string;
  raw: unknown;
};

type LooseMarketRecord = Record<string, unknown>;

function asArray<T>(input: unknown): T[] {
  if (Array.isArray(input)) {
    return input as T[];
  }

  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    const candidate = record.data ?? record.markets ?? record.items ?? record.results;
    return Array.isArray(candidate) ? (candidate as T[]) : [];
  }

  return [];
}

function maybeDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeProbability(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed > 1 && parsed <= 100) {
    return parsed / 100;
  }

  return parsed >= 0 && parsed <= 1 ? parsed : null;
}

function extractProbability(record: LooseMarketRecord) {
  if (Array.isArray(record.prices) && record.prices.length > 0) {
    const normalized = normalizeProbability(record.prices[0]);
    if (normalized != null) {
      return normalized;
    }
  }

  const directCandidates = [
    record.currentProbability,
    record.probability,
    record.yesProbability,
    record.yesPrice,
    record.lastPrice,
    (record.prices as LooseMarketRecord | undefined)?.yes,
    (record.prices as LooseMarketRecord | undefined)?.yesPrice,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeProbability(candidate);
    if (normalized != null) {
      return normalized;
    }
  }

  const outcomes = Array.isArray(record.outcomes) ? (record.outcomes as LooseMarketRecord[]) : [];
  for (const outcome of outcomes) {
    const label = String(outcome.label ?? outcome.name ?? outcome.outcome ?? "").toLowerCase();
    if (label === "yes") {
      const normalized = normalizeProbability(
        outcome.probability ?? outcome.price ?? outcome.lastPrice ?? outcome.midPrice,
      );
      if (normalized != null) {
        return normalized;
      }
    }
  }

  return 0.5;
}

function normalizeMarket(raw: LooseMarketRecord): NormalizedMarket | null {
  const slug = String(raw.slug ?? raw.id ?? raw.address ?? "").trim();
  const title = String(raw.title ?? raw.question ?? raw.name ?? "").trim();

  if (!slug || !title) {
    return null;
  }

  const marketUrl =
    typeof raw.marketUrl === "string"
      ? raw.marketUrl
      : `https://limitless.exchange/markets/${encodeURIComponent(slug)}`;

  return {
    externalId: slug,
    title,
    description: String(raw.description ?? raw.subtitle ?? raw.details ?? "") || null,
    venue: "Limitless",
    category: Array.isArray(raw.categories)
      ? String(raw.categories[0] ?? "") || null
      : String(raw.category ?? raw.group ?? "") || null,
    resolutionDate:
      maybeDate(raw.resolutionDate) ??
      maybeDate(raw.endDate) ??
      maybeDate(raw.closeTime) ??
      maybeDate(raw.expirationDate) ??
      maybeDate(raw.expirationTimestamp),
    currentProbability: extractProbability(raw),
    marketUrl,
    raw,
  };
}

function includesAny(text: string, searchTerms: string[]) {
  return searchTerms.some((term) => text.includes(term.toLowerCase()));
}

function scoreMatch(market: NormalizedMarket) {
  const lower = `${market.title} ${market.description ?? ""} ${market.category ?? ""}`.toLowerCase();
  const parsed = parsePriceMarket(market.title, market.description);
  return monitoredMarkets.map((config) => {
    if (parsed.assetSymbol && parsed.assetSymbol !== config.assetSymbol) {
      return { score: 0, key: config.key };
    }

    let score = 0;
    if (config.slugHint && config.slugHint === market.externalId) {
      score += 100;
    }
    if (includesAny(lower, config.searchTerms)) {
      score += 10;
    }
    if (config.preferredCategory && market.category?.toLowerCase() === config.preferredCategory.toLowerCase()) {
      score += 5;
    }
    if (parsed.assetSymbol === config.assetSymbol) {
      score += 8;
    }
    if (parsed.targetPrice && parsed.direction) {
      score += 25;
    }
    return { score, key: config.key };
  });
}

export async function fetchActiveLimitlessMarkets() {
  const searchResponses = await Promise.all(
    monitoredMarkets.map(async (config) => {
      const results = await Promise.all(
        config.searchTerms.map(async (term) => {
          const searchUrl = new URL("/markets/search", env.LIMITLESS_API_BASE_URL);
          searchUrl.searchParams.set("query", term);
          searchUrl.searchParams.set("limit", "10");
          searchUrl.searchParams.set("page", "1");

          const searchResponse = await fetch(searchUrl, {
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          });

          if (!searchResponse.ok) {
            return [];
          }

          const payload = await searchResponse.json();
          return asArray<LooseMarketRecord>(payload)
            .map(normalizeMarket)
            .filter((market): market is NormalizedMarket => market !== null);
        }),
      );

      return results.flat();
    }),
  );

  const combined = new Map<string, NormalizedMarket>();
  for (const market of searchResponses.flat()) {
    combined.set(market.externalId, market);
  }

  if (combined.size > 0) {
    return [...combined.values()];
  }

  const url = new URL(env.LIMITLESS_MARKETS_ENDPOINT, env.LIMITLESS_API_BASE_URL);
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", "30");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Limitless market fetch failed with ${response.status}`);
  }

  const payload = await response.json();
  return asArray<LooseMarketRecord>(payload)
    .map(normalizeMarket)
    .filter((market): market is NormalizedMarket => market !== null);
}

export function pickConfiguredMarkets(markets: NormalizedMarket[]) {
  const picked = new Map<string, NormalizedMarket>();

  for (const config of monitoredMarkets) {
    const ranked = markets
      .map((market) => {
        const parsed = parsePriceMarket(market.title, market.description);
        const match = scoreMatch(market).find((entry) => entry.key === config.key);
        return {
          market,
          parsed,
          score: match?.score ?? 0,
          structured: Boolean(parsed.assetSymbol && parsed.targetPrice && parsed.direction),
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => {
        if (left.structured !== right.structured) {
          return right.structured ? 1 : -1;
        }
        return right.score - left.score;
      });

    if (ranked[0]) {
      picked.set(config.key, ranked[0].market);
    }
  }

  return [...picked.values()];
}
