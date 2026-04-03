import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/taskmesh-data";

const statusMap: Record<TaskStatus, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-[rgba(17,120,242,0.1)] text-[#0e67cb]",
  },
  in_progress: {
    label: "In progress",
    className: "bg-[rgba(245,158,11,0.14)] text-[#b45309]",
  },
  delivered: {
    label: "Delivered",
    className: "bg-[rgba(14,165,233,0.12)] text-[#0369a1]",
  },
  settled: {
    label: "Settled",
    className: "bg-[rgba(15,159,110,0.12)] text-[#047857]",
  },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = statusMap[status];

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", config.className)}>
      {config.label}
    </span>
  );
}
