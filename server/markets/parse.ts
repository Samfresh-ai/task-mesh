import type { AssetSymbol } from "@/server/types";

export type PriceMarketContext = {
  assetSymbol: AssetSymbol | null;
  assetName: string | null;
  quoteCurrency: "USD";
  targetPrice: number | null;
  direction: "above" | "below" | null;
};

const assetAliases: Array<{ symbol: PriceMarketContext["assetSymbol"]; patterns: RegExp[]; name: string }> = [
  { symbol: "BTC", name: "Bitcoin", patterns: [/\bbtc\b/i, /\bbitcoin\b/i] },
  { symbol: "ETH", name: "Ethereum", patterns: [/\beth\b/i, /\bethereum\b/i] },
  { symbol: "SOL", name: "Solana", patterns: [/\bsol\b/i, /\bsolana\b/i] },
  { symbol: "XRP", name: "XRP", patterns: [/\bxrp\b/i, /\bripple\b/i] },
  { symbol: "DOGE", name: "Dogecoin", patterns: [/\bdoge\b/i, /\bdogecoin\b/i] },
  { symbol: "ADA", name: "Cardano", patterns: [/\bada\b/i, /\bcardano\b/i] },
  { symbol: "AVAX", name: "Avalanche", patterns: [/\bavax\b/i, /\bavalanche\b/i] },
  { symbol: "LINK", name: "Chainlink", patterns: [/\blink\b/i, /\bchainlink\b/i] },
  { symbol: "LTC", name: "Litecoin", patterns: [/\bltc\b/i, /\blitecoin\b/i] },
  { symbol: "BCH", name: "Bitcoin Cash", patterns: [/\bbch\b/i, /\bbitcoin cash\b/i] },
  { symbol: "UNI", name: "Uniswap", patterns: [/\buni\b/i, /\buniswap\b/i] },
  { symbol: "AAVE", name: "Aave", patterns: [/\baave\b/i] },
];

function normalizeMagnitude(raw: number, magnitude?: string) {
  if (magnitude?.toLowerCase() === "k") {
    return raw * 1_000;
  }

  if (magnitude?.toLowerCase() === "m") {
    return raw * 1_000_000;
  }

  return raw;
}

function parseTargetPrice(input: string) {
  const thresholdMatch = input.match(
    /\b(?:above|over|below|under|at least|at most|greater than|less than|hit|reach|touch|cross|break|surpass|climb to|fall to|drop to)\s+\$?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|m)?/i,
  );
  const directMatch =
    thresholdMatch ??
    input.match(/\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|m)?/i) ??
    input.match(/\b(\d{2,3}(?:,\d{3})+|\d{2,6})\s*(k|m)\b/i);
  if (!directMatch) {
    return null;
  }

  const raw = Number(directMatch[1].replace(/,/g, ""));

  if (Number.isNaN(raw)) {
    return null;
  }

  return normalizeMagnitude(raw, directMatch[2]);
}

export function parsePriceMarket(title: string, description?: string | null): PriceMarketContext {
  const haystack = `${title} ${description ?? ""}`.trim();
  const asset = assetAliases.find((entry) => entry.patterns.some((pattern) => pattern.test(haystack)));
  const direction = /\b(above|over|exceed|greater than|at least|hit|reach|touch|cross|break|surpass|climb to)\b/i.test(
    haystack,
  )
    ? "above"
    : /\b(below|under|less than|at most|fall to|drop to|sink to|slip under)\b/i.test(haystack)
      ? "below"
      : /\bwill\b.+\bby\b/i.test(haystack) && /\$\s?\d|\b\d{2,6}\s*[km]\b/i.test(haystack)
        ? "above"
        : null;

  return {
    assetSymbol: asset?.symbol ?? null,
    assetName: asset?.name ?? null,
    quoteCurrency: "USD",
    targetPrice: parseTargetPrice(haystack),
    direction,
  };
}
