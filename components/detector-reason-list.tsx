export function DetectorReasonList({ reasons }: { reasons: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {reasons.length === 0 ? (
        <span className="text-sm text-[var(--muted)]">No structured reasons yet.</span>
      ) : (
        reasons.map((reason) => (
          <span
            key={reason}
            className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]"
          >
            {reason.replaceAll("_", " ")}
          </span>
        ))
      )}
    </div>
  );
}
