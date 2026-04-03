"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type LiveMonitorProps = {
  autoRefreshMs?: number;
  autoRunMs?: number;
  enableAutoRefresh?: boolean;
  enableAutoRun?: boolean;
};

function formatCountdown(targetAt: number, now: number) {
  const remainingMs = Math.max(targetAt - now, 0);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function LiveMonitor({
  autoRefreshMs = 60_000,
  autoRunMs = 60_000,
  enableAutoRefresh = false,
  enableAutoRun = false,
}: LiveMonitorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [nextRunAt, setNextRunAt] = useState(() => Date.now() + autoRunMs);
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!enableAutoRefresh) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      router.refresh();
    }, autoRefreshMs);

    return () => window.clearInterval(timer);
  }, [autoRefreshMs, enableAutoRefresh, router]);

  useEffect(() => {
    if (!enableAutoRun) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (lastRunAt && Date.now() - lastRunAt < autoRunMs - 5_000) {
        return;
      }

      startTransition(async () => {
        try {
          const response = await fetch("/api/jobs/run-all", {
            method: "POST",
          });

          const payload = (await response.json()) as { error?: string; marketsProcessed?: number; alreadyRunning?: boolean };
          if (!response.ok) {
            setMessage(payload.error ?? "Scanner refresh failed.");
            return;
          }

          setMessage(
            payload.alreadyRunning
              ? "Refresh already in progress. Waiting for the current scan to finish."
              : `Scanner refreshed ${payload.marketsProcessed ?? 0} monitored markets.`,
          );
          setLastRunAt(Date.now());
          setNextRunAt(Date.now() + autoRunMs);
          router.refresh();
        } catch {
          setMessage("Scanner refresh failed.");
        }
      });
    }, autoRunMs);

    return () => window.clearInterval(timer);
  }, [autoRunMs, enableAutoRun, lastRunAt, router, startTransition]);

  const countdown = useMemo(() => formatCountdown(nextRunAt, now), [nextRunAt, now]);
  const modeLabel = enableAutoRun ? countdown : "MANUAL";
  const displayMessage =
    message ??
    (enableAutoRun
      ? "Live refresh and scheduled scanning are on."
      : enableAutoRefresh
        ? "Auto refresh is on. Full scan runs stay manual on this surface."
        : "This surface is live read-only. Refresh the full scan from the scanner or command bar when you want a new pass.");

  return (
    <div className="terminal-sheen panel-appear rounded-[24px] border border-[var(--border)] bg-[var(--panel-strong)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="status-pulse inline-flex h-3 w-3 rounded-full bg-teal-700" />
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Scanner monitor</p>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{displayMessage}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Next scheduled scan</p>
          <p className="mt-2 font-mono text-2xl font-semibold">{modeLabel}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {enableAutoRefresh ? `Refresh ${Math.round(autoRefreshMs / 1000)}s` : "No auto refresh"}{" "}
            {enableAutoRun ? `• Run every ${Math.round(autoRunMs / 1000)}s` : "• Manual scan mode"}
          </p>
        </div>
      </div>
      {isPending ? <p className="mt-3 text-xs uppercase tracking-[0.18em] text-teal-800">Refreshing scanner...</p> : null}
    </div>
  );
}
