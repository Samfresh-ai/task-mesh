import type { ScanState } from "@/server/intel";

const styles: Record<ScanState, string> = {
  monitoring: "border-slate-700 bg-slate-500/10 text-slate-200",
  evidence_found: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  evaluating: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  watch: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  signal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  contradicted: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  stale: "border-zinc-600 bg-zinc-500/10 text-zinc-300",
};

export function ScanStateBadge({ state }: { state: ScanState }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles[state]}`}>
      <span className="status-pulse inline-flex h-2.5 w-2.5 rounded-full bg-current" />
      {state.replaceAll("_", " ")}
    </span>
  );
}
