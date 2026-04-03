import { cn } from "@/lib/utils";
import type { SettlementStatus } from "@/lib/taskmesh-data";

const statusMap: Record<SettlementStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-[rgba(17,120,242,0.1)] text-[#0e67cb]",
  },
  proof_required: {
    label: "Proof required",
    className: "bg-[rgba(245,158,11,0.14)] text-[#b45309]",
  },
  proof_attached: {
    label: "Proof attached",
    className: "bg-[rgba(14,165,233,0.12)] text-[#0369a1]",
  },
  released: {
    label: "Released",
    className: "bg-[rgba(15,159,110,0.12)] text-[#047857]",
  },
};

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  const config = statusMap[status];

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", config.className)}>
      {config.label}
    </span>
  );
}
