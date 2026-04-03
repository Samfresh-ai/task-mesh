"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RunAnalysisButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onRun() {
    startTransition(async () => {
      setMessage(null);

      const response = await fetch("/api/jobs/run-all", {
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string; marketsProcessed?: number; alreadyRunning?: boolean };
      if (!response.ok) {
        setMessage(payload.error ?? "Pipeline run failed.");
        return;
      }

      setMessage(
        payload.alreadyRunning
          ? "Scan already in progress. Waiting for the active refresh to finish."
          : `Scanner refreshed across ${payload.marketsProcessed ?? 0} markets.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onRun}
        disabled={isPending}
        className={[
          "rounded-full border border-teal-800 bg-teal-800 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60",
          compact ? "px-4 py-3" : "px-5 py-3",
        ].join(" ")}
      >
        {isPending ? "Refreshing..." : compact ? "Refresh Scan" : "Refresh Full Scan"}
      </button>
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
