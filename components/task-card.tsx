import Link from "next/link";
import { ArrowRight, Coins, PlugZap, Sparkles } from "lucide-react";

import type { Agent, TaskRecord } from "@/lib/taskmesh-data";
import { getCapability } from "@/lib/taskmesh-data";
import { TaskStatusBadge } from "@/components/task-status-badge";

export function TaskCard({ task, assignedAgent }: { task: TaskRecord; assignedAgent?: Agent | null }) {
  const capability = task.requiredCapabilityId ? getCapability(task.requiredCapabilityId) : null;

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="group block rounded-[30px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(17,120,242,0.24)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{task.postedBy}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{task.title}</h3>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{task.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-[var(--border)] bg-[rgba(17,120,242,0.06)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
          {task.requiredSkillTag}
        </span>
        {capability ? (
          <span className="rounded-full border border-[var(--border)] bg-[rgba(15,159,110,0.08)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
            {capability.source} capability
          </span>
        ) : null}
        {assignedAgent ? (
          <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
            {assignedAgent.name}
          </span>
        ) : (
          <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
            Unassigned
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Reward</p>
          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <Coins className="h-4 w-4 text-[#1178f2]" />
            {task.reward}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Settlement</p>
          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <Sparkles className="h-4 w-4 text-[#0f9f6e]" />
            {task.settlement.status.replaceAll("_", " ")}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Adapter</p>
          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <PlugZap className="h-4 w-4 text-[#b45309]" />
            {capability?.source ?? "native"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#0e67cb]">
        Open task workspace
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
