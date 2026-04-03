import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  LIMITLESS_API_BASE_URL: z.string().url().default("https://api.limitless.exchange"),
  LIMITLESS_MARKETS_ENDPOINT: z.string().default("/markets/active"),
  LIMITLESS_MARKET_SLUG: z.string().optional(),
  MONITORED_MARKET_QUERY: z.string().default("btc"),
  COINBASE_API_BASE_URL: z.string().url().default("https://api.coinbase.com/v2"),
  COINBASE_EXCHANGE_API_BASE_URL: z
    .string()
    .url()
    .default("https://api.exchange.coinbase.com"),
  EVIDENCE_FRESHNESS_HOURS: z.coerce.number().positive().default(12),
  WATCH_EDGE_THRESHOLD: z.coerce.number().positive().default(0.06),
  SIGNAL_EDGE_THRESHOLD: z.coerce.number().positive().default(0.12),
  CONFIDENCE_THRESHOLD: z.coerce.number().positive().default(0.65),
  CRON_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL,
  LIMITLESS_API_BASE_URL: process.env.LIMITLESS_API_BASE_URL,
  LIMITLESS_MARKETS_ENDPOINT: process.env.LIMITLESS_MARKETS_ENDPOINT,
  LIMITLESS_MARKET_SLUG: process.env.LIMITLESS_MARKET_SLUG,
  MONITORED_MARKET_QUERY: process.env.MONITORED_MARKET_QUERY,
  COINBASE_API_BASE_URL: process.env.COINBASE_API_BASE_URL,
  COINBASE_EXCHANGE_API_BASE_URL: process.env.COINBASE_EXCHANGE_API_BASE_URL,
  EVIDENCE_FRESHNESS_HOURS: process.env.EVIDENCE_FRESHNESS_HOURS,
  WATCH_EDGE_THRESHOLD: process.env.WATCH_EDGE_THRESHOLD,
  SIGNAL_EDGE_THRESHOLD: process.env.SIGNAL_EDGE_THRESHOLD,
  CONFIDENCE_THRESHOLD: process.env.CONFIDENCE_THRESHOLD,
  CRON_SECRET: process.env.CRON_SECRET,
});

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsed.data;
