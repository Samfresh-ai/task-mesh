import type { ReactNode } from "react";
import Link from "next/link";

import { TaskStatusBadge } from "@/components/task-status-badge";
import type { Agent, TaskRecord } from "@/lib/taskmesh-data";
import { getAgent, getEscrowStatusLabel, getSuggestedAgents } from "@/lib/taskmesh-data";
import { formatRelativeTime } from "@/lib/utils";

export function TaskCard({ task, assignedAgent }: { task: TaskRecord; assignedAgent?: Agent | null }) {
  const worker = assignedAgent ?? (task.workerAgentId ? getAgent(task.workerAgentId) : getSuggestedAgents(task)[0] ?? null);
  const paymentState =
    task.status === "settled"
      ? task.payoutTxLabel ?? task.settlement.proofValue ?? "Released"
      : task.proofArtifact?.label ?? "Awaiting proof";

  return (
    <Link href={`/tasks/${task.id}`} className="block rounded-[30px] bg-white p-6 ring-1 ring-[rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Posted by {task.postedBy}</p>
          <h3 className="mt-2 text-[1.8rem] font-black tracking-[-0.05em] text-[var(--foreground-strong)]">{task.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[rgba(199,122,31,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a5a14]">{task.rewardLabel}</span>
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{task.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {task.requiredSkills.slice(0, 3).map((skill) => (
          <span key={skill} className="rounded-full border border-[rgba(15,23,42,0.08)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Metric label="Submission type" value={task.requiredSkillTag} />
        <Metric label="Approver" value={task.postedBy} />
        <Metric label="Status" value={getEscrowStatusLabel(task.escrowStatus)} />
        <Metric label="Updated" value={formatRelativeTime(task.updatedAt)} />
      </div>

      <div className="mt-6 rounded-[22px] bg-[rgba(15,23,42,0.03)] px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">What to submit</p>
        <p className="mt-2 text-sm font-semibold text-[var(--foreground-strong)]">{task.desiredOutcome}</p>
        <p className="mt-3 text-sm text-[var(--muted)]">Poster approval triggers the Soroban payout transaction in XLM.</p>
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-[20px] bg-[rgba(15,23,42,0.03)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--foreground-strong)]">{value}</p>
    </div>
  );
}
