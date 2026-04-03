import { pollMarketsJob } from "@/server/markets/service";
import { pullEvidenceJob } from "@/server/evidence/service";
import { runDetectorJob } from "@/server/signals/service";

const globalForJobs = globalThis as unknown as {
  pipelineRunPromise?: Promise<{
    marketsProcessed: number;
    evidenceItemsProcessed: number;
    signalsProcessed: number;
    completedAt: string;
    alreadyRunning?: boolean;
  }> | null;
};

export async function runFullPipeline() {
  if (globalForJobs.pipelineRunPromise) {
    const result = await globalForJobs.pipelineRunPromise;
    return {
      ...result,
      alreadyRunning: true,
    };
  }

  globalForJobs.pipelineRunPromise = (async () => {
    const markets = await pollMarketsJob();
    const evidence = await pullEvidenceJob();
    const signals = await runDetectorJob();

    return {
      marketsProcessed: markets.length,
      evidenceItemsProcessed: evidence.length,
      signalsProcessed: signals.length,
      completedAt: new Date().toISOString(),
    };
  })();

  try {
    return await globalForJobs.pipelineRunPromise;
  } finally {
    globalForJobs.pipelineRunPromise = null;
  }
}
