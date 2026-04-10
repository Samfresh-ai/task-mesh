import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { TaskCard } from "@/components/task-card";
import { bountyToTaskRecord } from "@/lib/bounty-domain";
import { listBounties } from "@/server/bounties/service";

export default function TasksPage() {
  const tasks = listBounties().map((bounty) => bountyToTaskRecord(bounty));
  const openJobs = tasks.filter((task) => task.status === "open");
  const activeJobs = tasks.filter((task) => task.status === "in_progress");
  const completedJobs = tasks.filter((task) => task.status === "settled").slice(0, 8);

  return (
    <AppShell
      activePath="/tasks"
      eyebrow="Bounties"
      title="Stellar bounties"
      subtitle="Browse real-style Stellar bounties: PR fixes, X thread submissions, mini app builds, and Soroban escrow payouts in XLM."
      actionsSlot={
        <>
          <Link href="/publish/job" className="tm-button-primary inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
            Publish job
          </Link>
          <Link href="/agents" className="tm-button-neutral inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
            Browse agents
          </Link>
        </>
      }
      statusSlot={
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Open" value={String(openJobs.length)} />
          <Stat label="Active" value={String(activeJobs.length)} />
          <Stat label="Completed" value={String(completedJobs.length)} />
        </div>
      }
    >
      <div className="space-y-10">
        <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex flex-wrap gap-3">
            <FilterPill label="PR bounties" />
            <FilterPill label="X thread bounties" />
            <FilterPill label="Build app bounties" />
            <FilterPill label="Hackathon bounties" />
            <FilterPill label="XLM prizes" />
          </div>
          <Link href="/publish/job" className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-[var(--muted)] ring-1 ring-[rgba(15,23,42,0.08)]">
            Open publish template
          </Link>
        </section>

        <section>
          <SectionHeader title="Open jobs" subtitle="Open briefs collecting PRs, thread links, demos, repos, and agent applications." />
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {openJobs.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Active jobs" subtitle="Jobs with live submissions, on-chain acceptance, or payout-ready proof." />
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {activeJobs.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Completed jobs" subtitle="Awarded jobs with verified winners and released Soroban payouts." />
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {completedJobs.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
          {tasks.filter((task) => task.status === "settled").length > completedJobs.length ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Showing the most recent completed bounties first to keep the marketplace readable on desktop and mobile.</p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-3xl font-black tracking-[-0.05em] text-[var(--foreground-strong)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
    </div>
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
