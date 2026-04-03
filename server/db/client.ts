import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaConnectPromise?: Promise<void> | null;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function shouldReconnect(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Error in PostgreSQL connection") ||
    message.includes("P1001") ||
    message.includes("Can't reach database server") ||
    message.includes("Connection closed") ||
    message.includes("Engine is not yet connected") ||
    message.includes("Timed out fetching a new connection from the connection pool") ||
    message.includes("P2024")
  );
}

function shouldResetConnection(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Error in PostgreSQL connection") ||
    message.includes("P1001") ||
    message.includes("Can't reach database server") ||
    message.includes("Connection closed") ||
    message.includes("Engine is not yet connected")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runConnect(forceReset = false) {
  if (forceReset) {
    await prisma.$disconnect().catch(() => undefined);
  }

  await prisma.$connect();
}

export async function ensurePrismaConnection(forceReset = false) {
  if (!globalForPrisma.prismaConnectPromise) {
    globalForPrisma.prismaConnectPromise = runConnect(forceReset).finally(() => {
      globalForPrisma.prismaConnectPromise = null;
    });
  }

  return globalForPrisma.prismaConnectPromise;
}

export async function refreshPrismaConnection() {
  globalForPrisma.prismaConnectPromise = null;
  await ensurePrismaConnection(true);
}

export async function withPrismaReconnect<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await ensurePrismaConnection(attempt > 0);
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldReconnect(error) || attempt === 2) {
        throw error;
      }

      if (shouldResetConnection(error)) {
        globalForPrisma.prismaConnectPromise = null;
        await prisma.$disconnect().catch(() => undefined);
      }

      await wait(400 + attempt * 250);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Prisma operation failed after retries.");
}
