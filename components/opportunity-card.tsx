import Link from "next/link";

import { ConfidenceMeter } from "@/components/confidence-meter";
import { DetectorReasonList } from "@/components/detector-reason-list";
import { EdgeDeltaBadge } from "@/components/edge-delta-badge";
import { MiniSparkline } from "@/components/mini-sparkline";
import { ScanStateBadge } from "@/components/scan-state-badge";
import { formatDateTime, percent } from "@/lib/utils";
import type { ScanState } from "@/server/intel";

export function OpportunityCard({
  item,
}: {
  item: {
    id: string;
    title: string;
    category: string | null;
    scanState: ScanState;
    currentProbability: number;
    fairProbability: number;
    edge: number;
    confidence: number;
    evidenceCount: number;
    freshness: number;
    sourceQuality: number;
    thesis: string;
    updatedAt: Date;
    reasonCodes: string[];
    probabilityHistory: Array<{ fairProbability: number; edge: number }>;
  };
}) {
  return (
    <Link
      href={`/markets/${item.id}`}
      className="group panel-appear rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)] transition hover:border-[rgba(17,120,242,0.24)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            {item.category ?? "Market"} • {item.evidenceCount} evidence items
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{item.title}</h3>
        </div>
        <ScanStateBadge state={item.scanState} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <EdgeDeltaBadge edge={item.edge} />
        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Market {percent(item.currentProbability)} vs fair {percent(item.fairProbability)}
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{item.thesis}</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Fair value drift</p>
          <MiniSparkline values={item.probabilityHistory.map((point) => point.fairProbability)} className="mt-4 h-24 w-full" />
        </div>
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-4">
          <ConfidenceMeter value={item.confidence} />
          <ConfidenceMeter value={item.sourceQuality} />
          <ConfidenceMeter value={item.freshness} />
        </div>
      </div>

      <div className="mt-5">
        <DetectorReasonList reasons={item.reasonCodes} />
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Updated {formatDateTime(item.updatedAt)}</p>
    </Link>
  );
}
