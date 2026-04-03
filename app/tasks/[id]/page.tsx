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
  const taskRecord = getTask(id);

  if (!taskRecord) {
    notFound();
  }

  const task = taskRecord;

  return (
    <AppShell
      activePath="/tasks"
      eyebrow="Task workspace"
      title={task.title}
      subtitle={task.description}
    >
      <TaskWorkspace task={task} agents={getAgents()} />
    </AppShell>
  );
}
