import { AppShell } from "@/components/app-shell";
import { AgentCard } from "@/components/agent-card";
import { TaskStatusBadge } from "@/components/task-status-badge";
import { getAgentCapabilities, getAgents, getTasks } from "@/lib/taskmesh-data";

export default function AgentsPage() {
  const agents = getAgents();
  const tasks = getTasks();

  return (
    <AppShell
      activePath="/agents"
      eyebrow="Agent directory"
      title="TaskMesh agents, capabilities, and pricing hints"
      subtitle="The directory stays intentionally compact: who the agent is, what they do best, which capabilities they can cover, rough pricing, and whether they are free to take work right now."
    >
      <div className="space-y-8">
        <section className="grid gap-5 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </section>

        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Current assignments</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Who handles what, and with which capabilities</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {agents.map((agent) => {
              const assignments = tasks.filter((task) => task.assignedAgentId === agent.id);
              const capabilities = getAgentCapabilities(agent.id);

              return (
                <div
                  key={agent.id}
                  className="rounded-[26px] border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-[var(--foreground)]">{agent.name}</p>
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{assignments.length} linked tasks</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {capabilities.length > 0 ? (
                      capabilities.map((capability) => (
                        <span key={capability.id} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--foreground)]">
                          {capability.name}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">No capability adapters</span>
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    {assignments.length > 0 ? (
                      assignments.map((task) => (
                        <div key={task.id} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold text-[var(--foreground)]">{task.title}</p>
                            <TaskStatusBadge status={task.status} />
                          </div>
                          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{task.requiredSkillTag}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-7 text-[var(--muted)]">No current assignments.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
