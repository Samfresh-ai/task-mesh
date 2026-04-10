"use client";

import Link from "next/link";
import { useState } from "react";

import { AgentStatusBadge } from "@/components/agent-status-badge";
import type { Agent } from "@/lib/taskmesh-data";

export function AgentCard({ agent }: { agent: Agent }) {
  const [panel, setPanel] = useState<null | "hire" | "assign">(null);
  return (
    <article className="rounded-[30px] bg-white p-5 ring-1 ring-[rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-[22px] bg-[rgba(15,23,42,0.06)] ring-1 ring-[rgba(15,23,42,0.08)]">
            {agent.avatarUrl ? <img src={agent.avatarUrl} alt={agent.name} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{agent.serviceCategory}</p>
              {agent.badgeLabel ? <span className="rounded-full bg-[rgba(17,120,242,0.12)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{agent.badgeLabel}</span> : null}
            </div>
            <h3 className="mt-2 text-[1.45rem] font-black tracking-[-0.05em] text-[var(--foreground-strong)]">{agent.name}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{agent.pricingHint}</p>
          </div>
        </div>
        <AgentStatusBadge status={agent.status} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {agent.specialties.slice(0, 4).map((specialty) => (
          <span key={specialty} className="rounded-full border border-[rgba(15,23,42,0.08)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
            {specialty}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Availability" value={agent.availabilityLabel} />
        <Metric label="Turnaround" value={agent.avgTurnaround} />
        <Metric label="Completed" value={`${agent.completedBountyCount} tasks`} />
      </div>

      <div className="mt-6 rounded-[22px] bg-[rgba(15,23,42,0.03)] px-4 py-4">
        <p className="text-sm font-semibold text-[var(--foreground-strong)]">Cleaner profile preview</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Keep the card focused, then open the full profile for detailed description, deliverables, and fit.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/agents/${agent.id}`} className="inline-flex text-sm font-semibold text-[var(--foreground-strong)] underline-offset-4 hover:underline">
            View full profile
          </Link>
          <button type="button" onClick={() => setPanel("hire")} className="rounded-full bg-[var(--foreground-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-92">
            {agent.hireLabel ?? "Hire agent"}
          </button>
          <button type="button" onClick={() => setPanel("assign")} className="rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground-strong)] transition hover:bg-[rgba(15,23,42,0.03)]">
            Assign to my task
          </button>
        </div>

        {panel ? (
          <div className="mt-4 rounded-[20px] border border-[rgba(17,120,242,0.12)] bg-[rgba(17,120,242,0.04)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground-strong)]">{panel === "hire" ? `Hire ${agent.name}` : `Assign ${agent.name} to a marketplace task`}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {panel === "hire"
                ? `This would open a direct hire request with scope, deliverables, budget, and preferred turnaround for ${agent.name}.`
                : `This would attach ${agent.name} to one of your posted marketplace tasks as the preferred assignee, reviewer, or lead agent.`}
            </p>
            <div className="mt-3 space-y-3">
              <input placeholder={panel === "hire" ? "Task or hire title" : "Your posted task title"} className="tm-input min-h-12 rounded-2xl px-4 text-sm" />
              <textarea placeholder={panel === "hire" ? "Describe what you want this agent to do" : "Explain why this agent should be assigned"} className="tm-input min-h-[120px] rounded-2xl px-4 py-3 text-sm" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="tm-button-primary inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold">
                {panel === "hire" ? "Send hire request" : "Assign agent"}
              </button>
              <button type="button" onClick={() => setPanel(null)} className="tm-button-neutral inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold">
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[rgba(15,23,42,0.03)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--foreground-strong)]">{value}</p>
    </div>
  );
}
