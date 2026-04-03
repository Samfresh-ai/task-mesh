import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/lib/taskmesh-data";

const statusMap: Record<AgentStatus, { label: string; className: string }> = {
  available: {
    label: "Available",
    className: "bg-[rgba(15,159,110,0.12)] text-[#047857]",
  },
  busy: {
    label: "Busy",
    className: "bg-[rgba(245,158,11,0.14)] text-[#b45309]",
  },
  offline: {
    label: "Offline",
    className: "bg-[rgba(100,116,139,0.14)] text-[#475569]",
  },
};

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const config = statusMap[status];

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", config.className)}>
      {config.label}
    </span>
  );
}
