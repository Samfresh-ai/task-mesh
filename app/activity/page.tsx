import { AppShell } from "@/components/app-shell";
import { ActivityTimeline } from "@/components/activity-timeline";
import { getRecentActivity } from "@/lib/taskmesh-data";

export default function ActivityPage() {
  const activity = getRecentActivity();

  return (
    <AppShell
      activePath="/activity"
      eyebrow="Activity"
      title="TaskMesh activity feed"
      subtitle="A lightweight per-task event log is enough for the MVP. This feed aggregates those same events across the market so demo viewers can see task flow without a full chat system."
    >
      <ActivityTimeline items={activity} showTaskLink />
    </AppShell>
  );
}
