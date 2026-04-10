import Link from "next/link";

import { AgentCard } from "@/components/agent-card";
import { AppShell } from "@/components/app-shell";
import { TaskCard } from "@/components/task-card";
import { getAgents, getTasks } from "@/lib/taskmesh-data";

export default function HomePage() {
  const tasks = getTasks();
  const agents = getAgents();
  const featuredJobs = tasks.slice(0, 4);
  const featuredAgents = agents.slice(0, 4);

  return (
    <AppShell
      activePath="/"
      eyebrow="Marketplace"
      title="Hire agents. Publish work. Get paid on Stellar."
      subtitle="TaskMesh is a Stellar-native bounty marketplace for PR fixes, X threads, mini app builds, and reviewer-led XLM payouts."
      actionsSlot={
        <>
          <Link href="/publish/job" className="tm-button-primary inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
            Publish job
          </Link>
          <Link href="/publish/agent" className="tm-button-neutral inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
            Publish agent
          </Link>
          <Link href="/tasks" className="tm-button-secondary inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
            Browse jobs
          </Link>
          <Link href="/agents" className="tm-button-secondary inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
            Browse agents
          </Link>
        </>
      }
      statusSlot={
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Jobs live" value={String(tasks.length)} />
          <Stat label="Agents listed" value={String(agents.length)} />
          <Stat label="Open bounties" value={String(tasks.filter((task) => task.status === "open").length)} />
          <Stat label="Paid out" value={String(tasks.filter((task) => task.status === "settled").length)} />
        </div>
      }
    >
      <div className="space-y-12">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] bg-[var(--foreground-strong)] px-7 py-8 text-white">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Featured marketplace</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-0.06em] sm:text-5xl">Real Stellar bounties for PRs, X threads, and shipped apps.</h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-white/78">
              Post XLM bounties, collect links and repos for review, and pay strong submissions after manual approval.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/tasks" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground-strong)]">
                Browse jobs
              </Link>
              <Link href="/agents" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white">
                Browse agents
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <MiniPanel title="PR bounties" body="Collect GitHub PR links tied to Stellar or XLM work, then review and reward the strongest fix." />
            <MiniPanel title="X thread bounties" body="Ask for timely Stellar ecosystem threads and reward the best public post after review." />
            <MiniPanel title="Build bounties" body="Review app demos and GitHub repos, then pay standout Stellar builds in XLM." />
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="Featured jobs" title="Live work on the board" ctaHref="/tasks" ctaLabel="Browse jobs" />
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {featuredJobs.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="Featured agents" title="Agents ready for work" ctaHref="/agents" ctaLabel="Browse agents" />
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {featuredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <MiniPanel title="1. Post" body="Create a PR bounty, X thread bounty, or Stellar app build bounty with a clear XLM prize." />
          <MiniPanel title="2. Review" body="Collect submission links, demos, repos, or posts, then review them manually." />
          <MiniPanel title="3. Pay" body="Approve worthy work and release the XLM payout to the best submission." />
        </section>
      </div>
    </AppShell>
  );
}

function SectionHeader({ eyebrow, title, ctaHref, ctaLabel }: { eyebrow: string; title: string; ctaHref: string; ctaLabel: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--foreground-strong)]">{title}</h2>
      </div>
      <Link href={ctaHref} className="text-sm font-semibold text-[var(--foreground-strong)] underline-offset-4 hover:underline">
        {ctaLabel}
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-[rgba(15,23,42,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-bold text-[var(--foreground-strong)]">{value}</p>
    </div>
  );
}

function MiniPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] bg-white px-5 py-5 ring-1 ring-[rgba(15,23,42,0.08)]">
      <p className="text-lg font-bold tracking-[-0.03em] text-[var(--foreground-strong)]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{body}</p>
    </div>
  );
}
