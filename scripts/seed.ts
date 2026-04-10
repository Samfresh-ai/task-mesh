import { runFullPipeline } from "../server/jobs/service";
import { pollMarketsJob } from "../server/markets/service";
import { runDetectorJob } from "../server/signals/service";

async function main() {
  try {
    const result = await runFullPipeline();
    console.log("Seed complete:", result);
    return;
  } catch (error) {
    console.warn("Full seed pipeline failed, falling back to local-safe seed:", error instanceof Error ? error.message : error);
  }

  try {
    const markets = await pollMarketsJob();
    const signals = await runDetectorJob();
    console.log("Seed complete with fallback:", {
      marketsProcessed: markets.length,
      signalsProcessed: signals.length,
      evidenceItemsProcessed: 0,
      completedAt: new Date().toISOString(),
      fallback: true,
    });
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
