export function EdgeDeltaBadge({ edge }: { edge: number }) {
  const positive = edge > 0;
  const neutral = Math.abs(edge) < 0.001;

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.16em]",
        neutral
          ? "border-zinc-600 bg-zinc-500/10 text-zinc-300"
          : positive
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "border-rose-500/30 bg-rose-500/10 text-rose-200",
      ].join(" ")}
    >
      {positive ? "▲" : neutral ? "•" : "▼"}
      {(edge * 100).toFixed(2)}%
    </span>
  );
}
