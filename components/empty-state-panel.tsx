export function EmptyStatePanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[32px] border border-dashed border-[var(--border)] bg-[var(--panel)] px-6 py-10 text-center shadow-[var(--panel-shadow)]">
      <p className="text-xl font-semibold text-white">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{description}</p>
    </div>
  );
}
