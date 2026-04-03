import type { ReactNode } from "react";
import Link from "next/link";

import { LiveValue } from "@/components/live-value";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";

type MarketCardProps = {
  market: {
    id: string;
    title: string;
    description: string | null;
    venue: string;
    category: string | null;
    currentProbability: number | null;
    evidenceCount?: number;
    updatedAt: Date | string;
    latestSignal: {
      status: "no_signal" | "watch" | "signal";
      fairProbability: number | null;
      edge: number | null;
    } | null;
  };
};

export function MarketCard({ market }: MarketCardProps) {
  return (
    <Link
      href={`/markets/${market.id}`}
      className="panel-appear group rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow)] backdrop-blur transition hover:-translate-y-0.5 hover:border-teal-800"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
            {market.venue} {market.category ? `• ${market.category}` : ""}
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight">{market.title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">
            {market.description ?? "Live monitored Base market with external evidence tracking."}
          </p>
        </div>
        <StatusBadge status={market.latestSignal?.status ?? "no_signal"} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Stat
          label="Implied probability"
          value={
            market.currentProbability != null ? (
              <LiveValue
                metricKey={`market:${market.id}:currentProbability`}
                value={market.currentProbability}
                format="percent"
                emphasize
              />
            ) : (
              "N/A"
            )
          }
        />
        <Stat
          label="Latest fair probability"
          value={
            market.latestSignal?.fairProbability != null ? (
              <LiveValue
                metricKey={`market:${market.id}:fairProbability`}
                value={market.latestSignal.fairProbability}
                format="percent"
                emphasize
              />
            ) : (
              "N/A"
            )
          }
        />
        <Stat label="Evidence items" value={String(market.evidenceCount ?? 0)} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 text-sm text-[var(--muted)]">
        <span>Last updated {formatDateTime(market.updatedAt)}</span>
        <span className="inline-flex items-center gap-2">
          Edge{" "}
          {market.latestSignal?.edge != null ? (
            <LiveValue
              metricKey={`market:${market.id}:edge`}
              value={market.latestSignal.edge}
              format="percent"
            />
          ) : (
            "N/A"
          )}
        </span>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-xl font-semibold">{value}</p>
    </div>
  );
}
