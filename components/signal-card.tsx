import type { ReactNode } from "react";
import type { SignalStatus } from "@prisma/client";

import { LiveValue } from "@/components/live-value";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

type SignalCardProps = {
  title: string;
  signal: {
    currentProbability: number | null;
    fairProbability: number | null;
    edge: number | null;
    confidence: number | null;
    status: SignalStatus;
    thesis: string;
    reasonCodes: unknown;
    createdAt: Date | string;
  } | null;
  evidence?: Array<{
    id: string;
    title: string;
    url: string;
    sourceName: string;
  }>;
};

export function SignalCard({ title, signal, evidence = [] }: SignalCardProps) {
  if (!signal) {
    return (
      <section className="panel-appear rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow)] backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Latest signal</h2>
          <StatusBadge status="no_signal" />
        </div>
        <p className="text-sm leading-7 text-[var(--muted)]">
          No detector output exists yet. Run the analysis pipeline to poll the market, ingest evidence, and generate the first signal.
        </p>
      </section>
    );
  }

  const reasons = Array.isArray(signal.reasonCodes) ? signal.reasonCodes : [];

  return (
    <section className="panel-appear rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow)] backdrop-blur">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Signal card</p>
          <h2 className="text-2xl font-semibold">{title}</h2>
        </div>
        <StatusBadge status={signal.status} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric
          label="Implied probability"
          value={
            <LiveValue
              metricKey={`${title}:signal:currentProbability`}
              value={signal.currentProbability ?? 0}
              format="percent"
              emphasize
            />
          }
        />
        <Metric
          label="Fair probability"
          value={
            <LiveValue
              metricKey={`${title}:signal:fairProbability`}
              value={signal.fairProbability ?? 0}
              format="percent"
              emphasize
            />
          }
        />
        <Metric
          label="Edge"
          value={
            <LiveValue
              metricKey={`${title}:signal:edge`}
              value={signal.edge ?? 0}
              format="percent"
              emphasize
            />
          }
        />
        <Metric
          label="Confidence"
          value={
            <LiveValue
              metricKey={`${title}:signal:confidence`}
              value={signal.confidence ?? 0}
              format="percent"
              emphasize
            />
          }
        />
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Short explanation</p>
          <p className="mt-2 text-sm leading-7">{signal.thesis}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Reason codes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {reasons.map((reason) => (
              <span
                key={String(reason)}
                className="rounded-full border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]"
              >
                {String(reason).replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Supporting evidence</p>
          <div className="mt-3 space-y-2">
            {evidence.slice(0, 4).map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 transition hover:border-teal-800"
              >
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-[var(--muted)]">{item.sourceName}</p>
              </a>
            ))}
          </div>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Generated {formatDateTime(signal.createdAt)}
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}
