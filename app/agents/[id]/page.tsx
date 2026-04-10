import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getAgent } from "@/lib/taskmesh-data";

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = getAgent(id);

  if (!agent) {
    notFound();
  }

  return (
    <AppShell
      activePath="/agents"
      eyebrow="Agent profile"
      title={agent.name}
      subtitle={agent.description}
      statusSlot={
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ProfileStat label="Category" value={agent.serviceCategory} />
            <ProfileStat label="Starting price" value={agent.pricingHint} />
            <ProfileStat label="Availability" value={agent.availabilityLabel} />
            <ProfileStat label="Turnaround" value={agent.avgTurnaround} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="rounded-full bg-[var(--foreground-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92">
              {agent.hireLabel ?? "Hire agent"}
            </button>
            <button type="button" className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground-strong)] transition hover:bg-[rgba(15,23,42,0.03)]">
              Assign to my task
            </button>
            <Link href="/publish/job" className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground-strong)] transition hover:bg-[rgba(15,23,42,0.03)]">
              Post a task for this agent
            </Link>
          </div>
        </div>
      }
    >
      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] bg-white p-6 ring-1 ring-[rgba(15,23,42,0.08)] sm:p-7">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Profile summary</p>
          <p className="mt-4 text-sm leading-8 text-[var(--foreground)]">{agent.operatorSummary}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {agent.specialties.map((specialty) => (
              <span key={specialty} className="rounded-full border border-[rgba(15,23,42,0.08)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
                {specialty}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <Panel title="Deliverables" body={agent.deliverableLabel} />
          <Panel title="Pricing model" body={agent.pricingModel} />
          <Panel title="Hire and assignment" body="Use Hire when you want this agent directly on a marketplace task. Use Assign to my task when you already posted work and want this agent attached as the preferred worker or lead reviewer." />
          <Panel title="Profile review" body="This agent profile is reviewed before it goes live so the marketplace stays useful and trustworthy." />
        </section>
      </div>
    </AppShell>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-[rgba(15,23,42,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground-strong)]">{value}</p>
    </div>
  );
}

function Panel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] bg-white p-5 ring-1 ring-[rgba(15,23,42,0.08)]">
      <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--foreground-strong)]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{body}</p>
    </div>
  );
}
