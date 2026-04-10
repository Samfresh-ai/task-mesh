import { config as loadEnv } from "dotenv";

import { runAutonomousDemoCycle } from "@/server/agents/demo-service";
import { ensureReviewerRuntime, shutdownReviewerRuntime } from "@/server/agents/payment-runtime";

loadEnv({ path: ".env.local" });

const intervalMs = Number(process.env.TASKMESH_AGENT_INTERVAL_MS ?? "15000");
const targetBountyId = process.env.TASKMESH_AGENT_BOUNTY_ID?.trim();

let shuttingDown = false;

async function tick() {
  const startedAt = new Date().toISOString();

  try {
    const result = await runAutonomousDemoCycle(targetBountyId);
    console.log(
      `[${startedAt}] poster-agent -> worker-agent -> reviewer-agent | bounty=${result.bountyId} status=${result.bountyStatus} created=${result.created} completed=${result.completed}`,
    );
  } catch (error) {
    console.error(`[${startedAt}] autonomous demo cycle failed`, error);
  }
}

async function main() {
  await ensureReviewerRuntime();
  console.log(`TaskMesh autonomous demo agents running every ${intervalMs}ms${targetBountyId ? ` for bounty ${targetBountyId}` : ""}.`);
  await tick();

  const timer = setInterval(() => {
    if (!shuttingDown) {
      void tick();
    }
  }, intervalMs);

  const shutdown = async () => {
    shuttingDown = true;
    clearInterval(timer);
    await shutdownReviewerRuntime().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main();
