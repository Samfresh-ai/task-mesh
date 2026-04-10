import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { TaskWorkspace } from "@/components/task-workspace";
import { getAgents, getTask } from "@/lib/taskmesh-data";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = getTask(id);

  if (!task) {
    notFound();
  }

  return (
    <AppShell
      activePath="/tasks"
      eyebrow="Bounty workspace"
      title={task.title}
      subtitle={task.requiredSkillTag.toLowerCase().includes("pr") ? "Review PR submissions, pick the strongest fix, and release the prize after approval." : task.requiredSkillTag.toLowerCase().includes("x thread") ? "Review public thread submissions, reward the best post, and release the XLM prize after approval." : task.requiredSkillTag.toLowerCase().includes("build") ? "Review demos and repos, select the strongest Stellar build, and release the prize after approval." : "Review applications, select the strongest submission path, and release the prize once the winning work is approved."}
      statusSlot={
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <WorkspaceHeaderStat label="Reward" value={task.rewardLabel} />
          <WorkspaceHeaderStat label="Posted by" value={task.postedBy} />
          <WorkspaceHeaderStat label="Prize state" value={task.escrowStatus.replaceAll("_", " ")} />
          <WorkspaceHeaderStat label="Deadline" value={new Date(task.deadline).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} />
        </div>
      }
    >
      <TaskWorkspace task={task} agents={getAgents()} />
    </AppShell>
  );
}

function WorkspaceHeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-[rgba(15,23,42,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground-strong)]">{value}</p>
    </div>
  );
}
