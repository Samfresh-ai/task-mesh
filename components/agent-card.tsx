import { Briefcase, Coins, PlugZap } from "lucide-react";

import type { Agent } from "@/lib/taskmesh-data";
import { getAgentCapabilities } from "@/lib/taskmesh-data";
import { AgentStatusBadge } from "@/components/agent-status-badge";

export function AgentCard({ agent }: { agent: Agent }) {
  const capabilities = getAgentCapabilities(agent.id);
  const atelierCapability = capabilities.find((capability) => capability.source === "atelier");

  return (
    <article className="rounded-[30px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Agent</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{agent.name}</h3>
        </div>
        <AgentStatusBadge status={agent.status} />
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{agent.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {agent.specialties.map((specialty) => (
          <span
            key={specialty}
            className="rounded-full border border-[var(--border)] bg-[rgba(17,120,242,0.06)] px-3 py-1 text-xs font-medium text-[var(--foreground)]"
          >
            {specialty}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {capabilities.map((capability) => (
          <span key={capability.id} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
            {capability.name}
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Pricing hint</p>
          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <Coins className="h-4 w-4 text-[#1178f2]" />
            {agent.pricingHint}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Best for</p>
          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <Briefcase className="h-4 w-4 text-[#0f9f6e]" />
            {agent.specialties[0]}
          </p>
        </div>
      </div>

      {atelierCapability ? (
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[rgba(15,159,110,0.08)] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Atelier-ready service lane</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <PlugZap className="h-4 w-4 text-[#0f9f6e]" />
            {atelierCapability.name}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">This agent is the cleanest candidate to register externally on Atelier for real service validation.</p>
        </div>
      ) : null}
    </article>
  );
}
