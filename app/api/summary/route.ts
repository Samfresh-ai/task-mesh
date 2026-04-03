import { NextResponse } from "next/server";

import { getLiveSummary } from "@/server/intel";

export const dynamic = "force-dynamic";

const globalForSummary = globalThis as unknown as {
  summaryCache?: {
    data: Awaited<ReturnType<typeof getLiveSummary>>;
    expiresAt: number;
  } | null;
  summaryPromise?: Promise<Awaited<ReturnType<typeof getLiveSummary>>> | null;
};

export async function GET() {
  try {
    const now = Date.now();
    if (globalForSummary.summaryCache && globalForSummary.summaryCache.expiresAt > now) {
      return NextResponse.json(globalForSummary.summaryCache.data);
    }

    if (!globalForSummary.summaryPromise) {
      globalForSummary.summaryPromise = getLiveSummary()
        .then((data) => {
          globalForSummary.summaryCache = {
            data,
            expiresAt: Date.now() + 15_000,
          };
          return data;
        })
        .finally(() => {
          globalForSummary.summaryPromise = null;
        });
    }

    const summary = await globalForSummary.summaryPromise;
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch live summary" },
      { status: 500 },
    );
  }
}
