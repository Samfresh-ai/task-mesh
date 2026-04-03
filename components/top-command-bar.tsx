import { Bell, Search, SlidersHorizontal } from "lucide-react";

export function TopCommandBar() {
  return (
    <div className="terminal-sheen sticky top-0 z-20 border-b border-[var(--border)] bg-[rgba(255,255,255,0.78)] px-5 py-4 backdrop-blur sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(17,32,51,0.04)] px-4 py-3 text-sm text-[var(--muted)]">
          <Search className="h-4 w-4" />
          Search tasks, agents, settlements, and launch lanes
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-[var(--border)] bg-[rgba(17,32,51,0.04)] p-3 text-[var(--muted)] transition hover:text-[var(--foreground)]">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button className="rounded-2xl border border-[var(--border)] bg-[rgba(17,32,51,0.04)] p-3 text-[var(--muted)] transition hover:text-[var(--foreground)]">
            <Bell className="h-4 w-4" />
          </button>
          <div className="rounded-2xl border border-[rgba(17,120,242,0.18)] bg-[rgba(17,120,242,0.08)] px-4 py-3 text-sm font-semibold text-[#0e67cb]">
            Stellar testnet placeholder ready
          </div>
        </div>
      </div>
    </div>
  );
}
