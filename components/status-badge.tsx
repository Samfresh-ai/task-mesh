import type { SignalStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

const labelMap: Record<SignalStatus, string> = {
  no_signal: "No Signal",
  watch: "Watch",
  signal: "Signal",
};

export function StatusBadge({ status }: { status: SignalStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        status === "signal" && "border-red-300 bg-[var(--danger-soft)] text-[var(--danger)]",
        status === "watch" && "border-amber-300 bg-[var(--warning-soft)] text-[var(--warning)]",
        status === "no_signal" && "border-emerald-300 bg-[var(--success-soft)] text-[var(--success)]",
      )}
    >
      <span className="status-pulse inline-flex h-2.5 w-2.5 rounded-full bg-current" />
      {labelMap[status]}
    </span>
  );
}
