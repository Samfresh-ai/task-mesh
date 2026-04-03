import { prisma, withPrismaReconnect } from "@/server/db/client";
import { decimal } from "@/server/db/helpers";
import { fetchActiveLimitlessMarkets, pickConfiguredMarkets } from "@/server/markets/limitless";

export async function pollMarketsJob() {
  return withPrismaReconnect(async () => {
    const startedAt = new Date();
    const log = await prisma.ingestionLog.create({
      data: {
        type: "poll_markets",
        status: "started",
        metadata: { startedAt: startedAt.toISOString() },
        startedAt,
      },
    });

    try {
      const rawMarkets = await fetchActiveLimitlessMarkets();
      const pickedMarkets = pickConfiguredMarkets(rawMarkets);

      const savedMarkets = await Promise.all(
        pickedMarkets.map((market) =>
          prisma.market.upsert({
            where: { externalId: market.externalId },
            update: {
              title: market.title,
              description: market.description,
              venue: market.venue,
              category: market.category,
              marketUrl: market.marketUrl,
              resolutionDate: market.resolutionDate,
              currentProbability: decimal(market.currentProbability),
              lastPolledAt: new Date(),
            },
            create: {
              externalId: market.externalId,
              title: market.title,
              description: market.description,
              venue: market.venue,
              category: market.category,
              marketUrl: market.marketUrl,
              resolutionDate: market.resolutionDate,
              currentProbability: decimal(market.currentProbability),
              lastPolledAt: new Date(),
            },
          }),
        ),
      );

      if (savedMarkets.length > 0) {
        await prisma.market.deleteMany({
          where: {
            externalId: {
              notIn: savedMarkets.map((market) => market.externalId),
            },
          },
        });
      }

      await prisma.ingestionLog.update({
        where: { id: log.id },
        data: {
          status: "success",
          metadata: {
            totalFetched: rawMarkets.length,
            monitoredCount: savedMarkets.length,
            externalIds: savedMarkets.map((market) => market.externalId),
          },
          completedAt: new Date(),
        },
      });

      return savedMarkets;
    } catch (error) {
      await prisma.ingestionLog.update({
        where: { id: log.id },
        data: {
          status: "error",
          metadata: {
            message: error instanceof Error ? error.message : "Unknown poll failure",
          },
          completedAt: new Date(),
        },
      });
      throw error;
    }
  });
}
