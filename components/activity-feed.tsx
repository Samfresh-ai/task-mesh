import { Activity, AlertTriangle, CheckCircle2, Radio } from "lucide-react";

import { formatDateTime } from "@/lib/utils";

export function ActivityFeed({
  items,
}: {
  items: Array<{
    id: string;
    kind: string;
    title: string;
    description: string;
    timestamp: Date;
    tone: "critical" | "positive" | "warning" | "neutral";
  }>;
}) {
  return (
    <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Live activity</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Scan event stream</h2>
        </div>
        <span className="status-pulse rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200">
          Streaming
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const Icon =
            item.tone === "critical" ? AlertTriangle : item.tone === "positive" ? CheckCircle2 : item.kind === "signal" ? Radio : Activity;

          return (
            <div
              key={item.id}
              className="panel-appear flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.88)] px-4 py-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(17,120,242,0.08)] text-[#1178f2]">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{formatDateTime(item.timestamp)}</p>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
