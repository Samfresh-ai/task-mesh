import { formatDateTime } from "@/lib/utils";

export function SystemHealthPanel({
  health,
}: {
  health: {
    averageLatencyMs: number;
    byType: Array<{
      type: string;
      status: string;
      startedAt: Date;
      completedAt: Date | null;
    }>;
  };
}) {
  return (
    <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">System health</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Pipeline health and freshness</h2>
      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Average analysis latency</p>
        <p className="mt-2 text-3xl font-semibold text-white">{health.averageLatencyMs} ms</p>
      </div>
      <div className="mt-4 space-y-3">
        {health.byType.map((item) => (
          <div key={item.type} className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-white">{item.type.replaceAll("_", " ")}</p>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{item.status}</span>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Last run {formatDateTime(item.completedAt ?? item.startedAt)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
