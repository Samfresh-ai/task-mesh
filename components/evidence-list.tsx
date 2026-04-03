import { formatDateTime } from "@/lib/utils";

type EvidenceListProps = {
  evidence: Array<{
    id: string;
    title: string;
    url: string;
    sourceName: string;
    sourceType: string;
    trustScore: number | null;
    relevanceScore: number | null;
    summary: string;
    publishedAt: Date | string | null;
    createdAt: Date | string;
  }>;
};

export function EvidenceList({ evidence }: EvidenceListProps) {
  return (
    <section className="panel-appear rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow)] backdrop-blur">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Evidence feed</p>
        <h2 className="mt-2 text-2xl font-semibold">Trusted external evidence</h2>
      </div>

      <div className="space-y-3">
        {evidence.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 transition hover:border-teal-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-[var(--muted)]">
                  {item.sourceName} • {item.sourceType.replaceAll("_", " ")}
                </p>
              </div>
              <div className="text-right text-sm text-[var(--muted)]">
                <p>Trust {(item.trustScore ?? 0).toFixed(2)}</p>
                <p>Relevance {(item.relevanceScore ?? 0).toFixed(2)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-7">{item.summary}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              Published {formatDateTime(item.publishedAt ?? item.createdAt)}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
