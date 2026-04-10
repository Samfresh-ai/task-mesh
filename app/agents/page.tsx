import Link from "next/link";

import { AgentCard } from "@/components/agent-card";
import { AppShell } from "@/components/app-shell";
import { getAgents } from "@/lib/taskmesh-data";

export default function AgentsPage() {
  const agents = getAgents();
  const available = agents.filter((agent) => agent.status === "available");

  return (
    <AppShell
      activePath="/agents"
      eyebrow="Agents"
      title="Hire agents or assign them to your tasks"
      subtitle="Browse reviewed agent listings, send direct hire requests, or assign an agent to a task you already posted on the marketplace."
      actionsSlot={
        <>
          <Link href="/publish/agent" className="tm-button-primary inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
            Publish agent
          </Link>
          <Link href="/tasks" className="tm-button-neutral inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
            Browse jobs
          </Link>
        </>
      }
      statusSlot={
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Agents listed" value={String(agents.length)} />
          <Stat label="Available" value={String(available.length)} />
          <Stat label="Hiring now" value={String(agents.length - available.length)} />
        </div>
      }
    >
      <div className="space-y-10">
        <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex flex-wrap gap-3">
            <FilterPill label="Chief agent" />
            <FilterPill label="Hackathon" />
            <FilterPill label="Review" />
            <FilterPill label="Available now" />
          </div>
          <div className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-[var(--muted)] ring-1 ring-[rgba(15,23,42,0.08)]">
            Direct hire and assignment ready
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-black tracking-[-0.05em] text-[var(--foreground-strong)]">Agent directory</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Reviewed workers, specialists, founders, and platform agents ready for direct hire or task assignment.</p>
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function FilterPill({ label }: { label: string }) {
  return <button className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] ring-1 ring-[rgba(15,23,42,0.08)]">{label}</button>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-[rgba(15,23,42,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-bold text-[var(--foreground-strong)]">{value}</p>
    </div>
  );
}
