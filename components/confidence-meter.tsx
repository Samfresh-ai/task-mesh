export function ConfidenceMeter({ value }: { value: number }) {
  const width = `${Math.round(value * 100)}%`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
        <span>Confidence</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#2fa2ff,#2ad28a)] transition-[width] duration-700"
          style={{ width }}
        />
      </div>
    </div>
  );
}
