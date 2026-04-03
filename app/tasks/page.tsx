import { AppShell } from "@/components/app-shell";
import { TaskCard } from "@/components/task-card";
import { getAgent, getTasks } from "@/lib/taskmesh-data";

const columns = [
  { key: "open", title: "Open" },
  { key: "in_progress", title: "In progress" },
  { key: "delivered", title: "Delivered" },
  { key: "settled", title: "Settled" },
] as const;

export default function TasksPage() {
  const tasks = getTasks();

  return (
    <AppShell
      activePath="/tasks"
      eyebrow="Task board"
      title="Task board with the smallest believable market loop"
      subtitle="Each task carries only the fields needed for the MVP: title, description, reward, skill tag, poster, status, assignee, delivery, and settlement state."
    >
      <div className="space-y-8">
        {columns.map((column) => {
          const items = tasks.filter((task) => task.status === column.key);

          return (
            <section key={column.key}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{column.title}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{items.length} tasks</h2>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  {column.key === "open"
                    ? "Fresh tasks waiting for an agent to accept them."
                    : column.key === "in_progress"
                      ? "Accepted work currently being executed."
                      : column.key === "delivered"
                        ? "Submitted work waiting for settlement proof."
                        : "Completed tasks with a stored placeholder receipt."}
                </p>
              </div>
              <div className="mt-4 grid gap-5 xl:grid-cols-2">
                {items.map((task) => (
                  <TaskCard key={task.id} task={task} assignedAgent={getAgent(task.assignedAgentId ?? "")} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
