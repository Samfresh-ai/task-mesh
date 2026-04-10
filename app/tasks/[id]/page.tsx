import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { TaskWorkspace } from "@/components/task-workspace";
import { bountyToTaskRecord } from "@/lib/bounty-domain";
import { getAgents } from "@/lib/taskmesh-data";
import { getBounty } from "@/server/bounties/service";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bounty = getBounty(id);

  if (!bounty) {
    notFound();
  }
  const task = bountyToTaskRecord(bounty);

  return (
    <AppShell
      activePath="/tasks"
      eyebrow="Bounty workspace"
      title={task.title}
      subtitle={task.requiredSkillTag.toLowerCase().includes("pr") ? "Accept PR work, record proof, and release the prize with a Soroban payout transaction." : task.requiredSkillTag.toLowerCase().includes("x thread") ? "Accept thread submissions, track proof, and release the XLM prize through on-chain escrow." : task.requiredSkillTag.toLowerCase().includes("build") ? "Accept demos and repos, verify the strongest Stellar build, and release the prize on-chain." : "Run the bounty from acceptance to proof to Soroban payout without a manual proof attachment step."}
      statusSlot={
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <WorkspaceHeaderStat label="Reward" value={task.rewardLabel} />
          <WorkspaceHeaderStat label="Posted by" value={task.postedBy} />
          <WorkspaceHeaderStat label="Prize state" value={task.escrowStatus.replaceAll("_", " ")} />
          <WorkspaceHeaderStat label="Deadline" value={new Date(task.deadline).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} />
        </div>
      }
    >
      <TaskWorkspace task={task} agents={getAgents()} initialBounty={bounty} />
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
