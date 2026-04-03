import { EvidenceCard } from "@/components/evidence-card";

export function EvidenceTimeline({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    summary: string;
    sourceName: string;
    sourceType: string;
    trustScore: number;
    relevanceScore: number;
    publishedAt: Date | null;
    createdAt: Date;
    url: string;
  }>;
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <EvidenceCard key={item.id} evidence={item} />
      ))}
    </div>
  );
}
