import type { AssetSymbol } from "@/server/types";

export type MarketScannerCategory = "Crypto" | "Stocks" | "Commodities";

export type MonitoredMarketConfig = {
  key: string;
  label: string;
  venue: "Limitless";
  assetSymbol: AssetSymbol;
  searchTerms: string[];
  preferredCategory?: MarketScannerCategory;
  slugHint?: string;
  maxMatches?: number;
};

function cryptoMarket(
  key: string,
  label: string,
  assetSymbol: AssetSymbol,
  searchTerms: string[],
  options?: Pick<MonitoredMarketConfig, "slugHint" | "maxMatches">,
): MonitoredMarketConfig {
  return {
    key,
    label,
    venue: "Limitless",
    assetSymbol,
    searchTerms,
    preferredCategory: "Crypto",
    maxMatches: options?.maxMatches ?? 1,
    slugHint: options?.slugHint,
  };
}

export const monitoredMarkets: MonitoredMarketConfig[] = [
  cryptoMarket("btc-threshold", "Bitcoin scanner lane", "BTC", ["bitcoin", "btc"], {
    slugHint: process.env.LIMITLESS_MARKET_SLUG,
    maxMatches: 3,
  }),
  cryptoMarket("eth-threshold", "Ethereum scanner lane", "ETH", ["ethereum", "eth"], { maxMatches: 3 }),
  cryptoMarket("sol-threshold", "Solana scanner lane", "SOL", ["solana", "sol"], { maxMatches: 2 }),
  cryptoMarket("xrp-threshold", "XRP scanner lane", "XRP", ["xrp", "ripple"], { maxMatches: 2 }),
  cryptoMarket("doge-threshold", "Dogecoin scanner lane", "DOGE", ["dogecoin", "doge"], { maxMatches: 2 }),
  cryptoMarket("ada-threshold", "Cardano scanner lane", "ADA", ["cardano", "ada"]),
  cryptoMarket("avax-threshold", "Avalanche scanner lane", "AVAX", ["avalanche", "avax"]),
  cryptoMarket("link-threshold", "Chainlink scanner lane", "LINK", ["chainlink", "link"]),
  cryptoMarket("ltc-threshold", "Litecoin scanner lane", "LTC", ["litecoin", "ltc"]),
  cryptoMarket("bch-threshold", "Bitcoin Cash scanner lane", "BCH", ["bitcoin cash", "bch"]),
  cryptoMarket("uni-threshold", "Uniswap scanner lane", "UNI", ["uniswap", "uni"]),
  cryptoMarket("aave-threshold", "Aave scanner lane", "AAVE", ["aave"]),
];

export const maxScannerMarkets = 20;
