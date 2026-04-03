import Link from "next/link";

import { EdgeDeltaBadge } from "@/components/edge-delta-badge";
import { ScanStateBadge } from "@/components/scan-state-badge";
import { formatDateTime, percent } from "@/lib/utils";
import type { ScanState } from "@/server/intel";

export function MarketTable({
  markets,
}: {
  markets: Array<{
    id: string;
    title: string;
    category: string | null;
    currentProbability: number;
    fairProbability: number;
    edge: number;
    confidence: number;
    freshness: number;
    scanState: ScanState;
    updatedAt: Date;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--panel-shadow)]">
      <div className="grid grid-cols-[minmax(260px,1.5fr)_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-[var(--border)] px-6 py-4 text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
        <span>Market</span>
        <span>Implied</span>
        <span>Fair</span>
        <span>Edge</span>
        <span>State</span>
        <span>Updated</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {markets.map((market) => (
          <Link
            key={market.id}
            href={`/markets/${market.id}`}
            className="grid grid-cols-[minmax(260px,1.5fr)_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-5 transition hover:bg-[rgba(17,32,51,0.04)]"
          >
            <div>
              <p className="font-semibold text-white">{market.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{market.category ?? "General"}</p>
            </div>
            <div className="text-sm text-white">{percent(market.currentProbability)}</div>
            <div className="text-sm text-white">{percent(market.fairProbability)}</div>
            <div>
              <EdgeDeltaBadge edge={market.edge} />
            </div>
            <div>
              <ScanStateBadge state={market.scanState} />
            </div>
            <div className="text-sm text-[var(--muted)]">{formatDateTime(market.updatedAt)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
