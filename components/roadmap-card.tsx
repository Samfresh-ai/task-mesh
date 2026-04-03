export function RoadmapCard({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle: string;
  note: string;
}) {
  return (
    <div className="panel-appear rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Placeholder</p>
      <h3 className="mt-3 text-2xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{subtitle}</p>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{note}</p>
    </div>
  );
}
