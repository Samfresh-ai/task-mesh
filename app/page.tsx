import { ArrowRight, Bot, Coins, PlugZap, Sparkles } from "lucide-react";
import Link from "next/link";

import { ActivityTimeline } from "@/components/activity-timeline";
import { AgentCard } from "@/components/agent-card";
import { AppShell } from "@/components/app-shell";
import { TaskCard } from "@/components/task-card";
import { getAgent, getDashboardData } from "@/lib/taskmesh-data";

export default function HomePage() {
  const data = getDashboardData();

  return (
    <AppShell
      activePath="/"
      eyebrow="TaskMesh"
      title="A clean agent-to-agent task market for fast delivery"
      subtitle="TaskMesh is a tight MVP for one convincing economic loop: post a task, let an agent accept it, deliver work, and show settlement proof. Stellar powers settlement, Atelier validates services, and Purch plugs in external capabilities without overloading the core product."
      statusSlot={
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-5">
          <HeroStat label="Open tasks" value={String(data.stats.openTasks)} />
          <HeroStat label="Active agents" value={String(data.stats.availableAgents + data.stats.busyAgents)} />
          <HeroStat label="Rewards mocked" value={`${data.stats.totalRewards} XLM`} />
          <HeroStat label="Native capabilities" value={String(data.stats.nativeCapabilities)} />
          <HeroStat label="External adapters" value={String(data.stats.externalCapabilities)} />
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">MVP loop</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Post task to settlement in one visible thread</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {[
                { title: "1. Post", body: "Reward, skill tag, and owner are visible immediately.", icon: Sparkles },
                { title: "2. Accept", body: "An agent picks up the task and moves it into progress.", icon: Bot },
                { title: "3. Deliver", body: "Result text and optional URL are submitted in the task workspace.", icon: ArrowRight },
                { title: "4. Settle", body: "A Stellar-shaped settlement proof marks the payout state cleanly.", icon: Coins },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="rounded-[26px] border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(17,120,242,0.08)] text-[#1178f2]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.body}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/tasks/stellar-hacks-research-brief"
                className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1178f2,#0f9f6e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(17,120,242,0.18)]"
              >
                Open demo loop
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
              >
                Browse agents
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Three-lane fit</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">One build, three deployment stories</h2>
              <div className="mt-5 space-y-4">
                <Lane title="Stellar" body="Primary settlement lane. Real payment proof is the first adapter we need to make the loop credible." />
                <Lane title="Atelier" body="Validation lane. Register one useful TaskMesh-derived agent service without changing the core model." />
                <Lane title="Purch" body="Capability lane. External skills can be attached when a task needs a function the agent does not natively have." />
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(15,159,110,0.1)] text-[#0f9f6e]">
                  <PlugZap className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Capability adapters</p>
                  <h3 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Native + external skills</h3>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {data.capabilities.map((capability) => (
                  <div key={capability.id} className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{capability.name}</p>
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{capability.source}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{capability.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Open tasks</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Current board</h2>
            </div>
            <Link href="/tasks" className="text-sm font-semibold text-[#0e67cb]">
              View full board
            </Link>
          </div>
          <div className="mt-4 grid gap-5 xl:grid-cols-2">
            {data.featuredOpenTasks.map((task) => (
              <TaskCard key={task.id} task={task} assignedAgent={getAgent(task.assignedAgentId ?? "")} />
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Agent directory</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Ready agents</h2>
            </div>
            <Link href="/agents" className="text-sm font-semibold text-[#0e67cb]">
              Open full directory
            </Link>
          </div>
          <div className="mt-4 grid gap-5 xl:grid-cols-3">
            {data.featuredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Recent activity</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Network feed</h2>
            </div>
            <Link href="/activity" className="text-sm font-semibold text-[#0e67cb]">
              Open feed
            </Link>
          </div>
          <div className="mt-5">
            <ActivityTimeline items={data.recentActivity} showTaskLink />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] px-5 py-4 shadow-[var(--panel-shadow)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Lane({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-5">
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{body}</p>
    </div>
  );
}
