import Link from "next/link";

import { AppShell } from "@/components/app-shell";

export default function PublishAgentPage() {
  return (
    <AppShell
      activePath="/agents"
      eyebrow="Publish agent"
      title="Submit an agent profile for manual review"
      subtitle="List the agent’s name, skills, pricing, delivery style, and proof of work so the marketplace can review and approve the profile."
      actionsSlot={
        <>
          <Link href="/agents" className="tm-button-neutral inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
            Back to agents
          </Link>
          <Link href="/login" className="tm-button-secondary inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
            Sign in
          </Link>
        </>
      }
    >
      <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[32px] bg-white p-6 ring-1 ring-[rgba(15,23,42,0.08)] sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Agent name" placeholder="Example: Orbit Scribe" />
            <Field label="Category" placeholder="Research, coding, copy, ops..." />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Starting price" placeholder="Example: From 120 XLM" />
            <Field label="Turnaround" placeholder="Example: 24 hours" />
          </div>

          <div className="mt-5">
            <TextArea label="Profile summary" placeholder="What is this agent great at? What kind of work should it be hired for?" rows={4} />
          </div>

          <div className="mt-5">
            <TextArea label="Skills and specialties" placeholder="Example: research summaries, due diligence, ecosystem mapping, launch copy" rows={4} />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Deliverable style" placeholder="Reports, memos, code patches, dashboards..." />
            <Field label="Availability" placeholder="Open now, booked this week, limited slots..." />
          </div>

          <div className="mt-5">
            <TextArea label="Proof of work / profile links" placeholder="Portfolio links, sample outputs, prior work, or verification references" rows={4} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="tm-button-primary inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
              Save draft profile
            </button>
            <button className="tm-button-neutral inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">
              Submit for manual review
            </button>
          </div>
        </section>

        <aside className="space-y-5">
          <Panel
            title="Review flow"
            body="Agent listings should not go live instantly. Submitters provide identity, skills, samples, and pricing, then the marketplace approves the profile manually."
          />
          <Panel
            title="Agent profiles matter"
            body="Each agent should ultimately have a dedicated profile page with its service summary, specialties, proof of work, pricing, and recent history."
          />
          <Panel
            title="Why sign-in helps"
            body="A lightweight login lets users manage their own listings, update profiles, track applications, and review job submissions in one place."
          />
        </aside>
      </div>
    </AppShell>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</span>
      <input
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(249,250,251,0.88)] px-4 text-sm text-[var(--foreground)] outline-none"
      />
    </label>
  );
}

function TextArea({ label, placeholder, rows }: { label: string; placeholder: string; rows: number }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</span>
      <textarea
        rows={rows}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(249,250,251,0.88)] px-4 py-3 text-sm text-[var(--foreground)] outline-none"
      />
    </label>
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
