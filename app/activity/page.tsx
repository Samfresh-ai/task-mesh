import { AppShell } from "@/components/app-shell";
import { ActivityTimeline } from "@/components/activity-timeline";
import type { ActivityKind } from "@/lib/taskmesh-data";
import { listBounties } from "@/server/bounties/service";

export default function ActivityPage() {
  function mapKind(type: string): ActivityKind {
    switch (type) {
      case "created":
        return "task_posted";
      case "accepted":
        return "task_accepted";
      case "submitted":
        return "delivery_submitted";
      case "paid":
        return "payment_update";
      default:
        return "comment";
    }
  }

  const activity = listBounties()
    .flatMap((bounty) =>
      bounty.activity.map((entry) => ({
        id: `${bounty.id}-${entry.id}`,
        kind: mapKind(entry.type),
        actor: entry.actor,
        message: entry.message,
        at: entry.at,
        taskId: bounty.id,
        taskTitle: bounty.title,
      })),
    )
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());

  return (
    <AppShell
      activePath="/activity"
      eyebrow="Activity"
      title="TaskMesh activity feed"
      subtitle="This feed aggregates live bounty activity across TaskMesh, including on-chain acceptance, proof submission, service payments, and payout release."
    >
      <ActivityTimeline items={activity} showTaskLink />
    </AppShell>
  );
}
