import type { Signal } from "@prisma/client";

import { prisma, withPrismaReconnect } from "@/server/db/client";
import { decimal, toNumber } from "@/server/db/helpers";
import { runDetector } from "@/server/detector/rules";

export async function runDetectorJob() {
  return withPrismaReconnect(async () => {
    const startedAt = new Date();
    const log = await prisma.ingestionLog.create({
      data: {
        type: "run_detector",
        status: "started",
        metadata: { startedAt: startedAt.toISOString() },
        startedAt,
      },
    });

    try {
      const markets = await prisma.market.findMany({
        include: {
          evidenceItems: {
            orderBy: { createdAt: "desc" },
            take: 6,
          },
          signals: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      const results: Signal[] = [];
      for (const market of markets) {
        const detectorResult = runDetector(market, market.evidenceItems);
        const latestSignal = market.signals[0];

        const shouldReuseLatest =
          latestSignal &&
          Math.abs((toNumber(latestSignal.currentProbability) ?? 0) - detectorResult.currentProbability) < 0.0005 &&
          Math.abs((toNumber(latestSignal.fairProbability) ?? 0) - detectorResult.fairProbability) < 0.0005 &&
          latestSignal.status === detectorResult.status &&
          latestSignal.thesis === detectorResult.thesis;

        const savedSignal = shouldReuseLatest
          ? latestSignal
          : await prisma.signal.create({
              data: {
                marketId: market.id,
                currentProbability: decimal(detectorResult.currentProbability),
                fairProbability: decimal(detectorResult.fairProbability),
                edge: decimal(detectorResult.edge),
                confidence: decimal(detectorResult.confidence),
                status: detectorResult.status,
                thesis: detectorResult.thesis,
                reasonCodes: detectorResult.reasonCodes,
              },
            });

        results.push(savedSignal);
      }

      await prisma.ingestionLog.update({
        where: { id: log.id },
        data: {
          status: "success",
          metadata: {
            marketCount: markets.length,
            signalCount: results.length,
          },
          completedAt: new Date(),
        },
      });

      return results;
    } catch (error) {
      await prisma.ingestionLog.update({
        where: { id: log.id },
        data: {
          status: "error",
          metadata: {
            message: error instanceof Error ? error.message : "Unknown detector failure",
          },
          completedAt: new Date(),
        },
      });
      throw error;
    }
  });
}
