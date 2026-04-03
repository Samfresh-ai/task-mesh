import { prisma, withPrismaReconnect } from "@/server/db/client";
import { serializeEvidence, serializeMarket, serializeSignal } from "@/server/serializers";

export async function getDashboardData() {
  return withPrismaReconnect(async () => {
    const markets = await prisma.market.findMany({
      include: {
        _count: {
          select: {
            evidenceItems: true,
            signals: true,
          },
        },
        signals: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return markets.map((market) => ({
      ...serializeMarket(market),
      latestSignal: serializeSignal(market.signals[0] ?? null),
    }));
  });
}

export async function getMarketDetail(id: string) {
  return withPrismaReconnect(async () => {
    const market = await prisma.market.findUnique({
      where: { id },
      include: {
        evidenceItems: {
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          take: 12,
        },
        signals: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!market) {
      return null;
    }

    return {
      market: serializeMarket(market),
      evidence: market.evidenceItems.map(serializeEvidence),
      latestSignal: serializeSignal(market.signals[0] ?? null),
    };
  });
}
