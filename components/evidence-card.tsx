import { ExternalLink } from "lucide-react";

import { ConfidenceMeter } from "@/components/confidence-meter";
import { formatDateTime } from "@/lib/utils";

export function EvidenceCard({
  evidence,
}: {
  evidence: {
    title: string;
    summary: string;
    sourceName: string;
    sourceType: string;
    trustScore: number;
    relevanceScore: number;
    publishedAt: Date | null;
    createdAt: Date;
    url: string;
  };
}) {
  const tier =
    evidence.sourceType.includes("official")
      ? "Official"
      : evidence.sourceType.includes("media")
        ? "Media"
        : evidence.sourceType.includes("social")
          ? "Social"
          : "Trusted";

  return (
    <a
      href={evidence.url}
      target="_blank"
      rel="noreferrer"
      className="group rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-[rgba(17,120,242,0.24)] shadow-[var(--panel-shadow)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            <span className="rounded-full border border-[var(--border)] px-2 py-1">{tier}</span>
            <span>{evidence.sourceName}</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{evidence.title}</h3>
        </div>
        <ExternalLink className="h-4 w-4 text-[var(--muted)] transition group-hover:text-[var(--foreground)]" />
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{evidence.summary}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ConfidenceMeter value={evidence.trustScore} />
        <ConfidenceMeter value={evidence.relevanceScore} />
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Published {formatDateTime(evidence.publishedAt ?? evidence.createdAt)}
      </p>
    </a>
  );
}
