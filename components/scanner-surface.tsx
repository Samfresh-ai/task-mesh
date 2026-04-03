"use client";

import { useMemo, useState } from "react";

import { EmptyStatePanel } from "@/components/empty-state-panel";
import { OpportunityCard } from "@/components/opportunity-card";
import { RunAnalysisButton } from "@/components/run-analysis-button";
import { formatCompactNumber } from "@/lib/utils";
import type { MarketScannerRow, ScannerCategory, SignalState } from "@/server/intel";

const statusFilters: Array<{ label: string; value: "all" | SignalState }> = [
  { label: "All", value: "all" },
  { label: "Signal", value: "signal" },
  { label: "Watch", value: "watch" },
  { label: "Clear", value: "clear" },
];

const categoryFilters: Array<{ label: string; value: "all" | ScannerCategory }> = [
  { label: "All", value: "all" },
  { label: "Crypto", value: "Crypto" },
  { label: "Stocks", value: "Stocks" },
  { label: "Commodities", value: "Commodities" },
];

type SortOption = "edge" | "confidence" | "volume" | "expiry";

export function ScannerSurface({ markets }: { markets: MarketScannerRow[] }) {
  const [statusFilter, setStatusFilter] = useState<"all" | SignalState>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ScannerCategory>("all");
  const [sortBy, setSortBy] = useState<SortOption>("edge");

  const filteredMarkets = useMemo(() => {
    const next = markets.filter((market) => {
      if (statusFilter !== "all" && market.signalState !== statusFilter) {
        return false;
      }

      if (categoryFilter !== "all" && market.scannerCategory !== categoryFilter) {
        return false;
      }

      return true;
    });

    return next.sort((left, right) => {
      if (sortBy === "confidence") {
        return right.confidence - left.confidence;
      }

      if (sortBy === "volume") {
        return (right.volume24h ?? -1) - (left.volume24h ?? -1);
      }

      if (sortBy === "expiry") {
        const leftTime = left.resolutionDate ? new Date(left.resolutionDate).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.resolutionDate ? new Date(right.resolutionDate).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      }

      return Math.abs(right.edge) - Math.abs(left.edge);
    });
  }, [categoryFilter, markets, sortBy, statusFilter]);

  const visibleVolume = filteredMarkets.reduce((sum, market) => sum + (market.volume24h ?? 0), 0);

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[var(--panel-shadow)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Scanner controls</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Focus the live market queue</h2>
            </div>
            <div className="flex flex-wrap gap-4">
              <FilterGroup
                label="Status"
                items={statusFilters}
                activeValue={statusFilter}
                onChange={(value) => setStatusFilter(value as "all" | SignalState)}
              />
              <FilterGroup
                label="Category"
                items={categoryFilters}
                activeValue={categoryFilter}
                onChange={(value) => setCategoryFilter(value as "all" | ScannerCategory)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(180px,220px)_auto] md:items-end">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Sort</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.94)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[rgba(17,120,242,0.34)]"
              >
                <option value="edge">Highest Edge</option>
                <option value="confidence">Confidence</option>
                <option value="volume">Volume</option>
                <option value="expiry">Expiring Soon</option>
              </select>
            </label>
            <RunAnalysisButton compact />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-3 py-1.5">
            Showing {filteredMarkets.length} of {markets.length} markets
          </span>
          <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-3 py-1.5">
            Visible 24h volume {formatCompactNumber(visibleVolume)}
          </span>
        </div>
      </div>

      {filteredMarkets.length === 0 ? (
        <EmptyStatePanel
          title="No markets match these controls"
          description="Try a broader status or category filter, or refresh the scanner to pull a newer venue snapshot."
        />
      ) : (
        <div className="grid gap-5 2xl:grid-cols-2">
          {filteredMarkets.map((market) => (
            <OpportunityCard key={market.id} item={market} />
          ))}
        </div>
      )}
    </section>
  );
}

function FilterGroup({
  label,
  items,
  activeValue,
  onChange,
}: {
  label: string;
  items: Array<{ label: string; value: string }>;
  activeValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = item.value === activeValue;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={[
                "rounded-full border px-4 py-2 text-sm transition",
                active
                  ? "border-[rgba(17,120,242,0.3)] bg-[rgba(17,120,242,0.1)] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[rgba(255,255,255,0.92)] text-[var(--muted)] hover:text-[var(--foreground)]",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
