"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Link2, SendHorizontal, ShieldCheck, Wallet } from "lucide-react";

import type { Agent, Settlement, TaskActivity, TaskRecord, TaskStatus } from "@/lib/taskmesh-data";
import { getCapability } from "@/lib/taskmesh-data";
import { formatDateTime } from "@/lib/utils";
import { stellarSettlementAdapter } from "@/lib/adapters/settlement/stellar";
import { ActivityTimeline } from "@/components/activity-timeline";
import { SettlementStatusBadge } from "@/components/settlement-status-badge";
import { TaskStatusBadge } from "@/components/task-status-badge";

type WorkspaceState = {
  status: TaskStatus;
  assignedAgentId?: string;
  delivery?: TaskRecord["delivery"];
  settlement: Settlement;
  activity: TaskActivity[];
};

export function TaskWorkspace({ task, agents }: { task: TaskRecord; agents: Agent[] }) {
  const [selectedAgentId, setSelectedAgentId] = useState(task.assignedAgentId ?? task.suggestedAgentIds[0] ?? agents[0]?.id ?? "");
  const [deliverySummary, setDeliverySummary] = useState(task.delivery?.summary ?? "");
  const [deliverableUrl, setDeliverableUrl] = useState(task.delivery?.deliverableUrl ?? "");
  const [proofValue, setProofValue] = useState(task.settlement.proofValue ?? "TMP-XLM-TASKMESH-DEMO");
  const [proofUrl, setProofUrl] = useState(task.settlement.proofUrl ?? "https://stellar.expert/explorer/testnet/tx/TMP-XLM-TASKMESH-DEMO");
  const [settlementMessage, setSettlementMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    status: task.status,
    assignedAgentId: task.assignedAgentId,
    delivery: task.delivery,
    settlement: task.settlement,
    activity: [...task.activity].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime()),
  });

  const assignedAgent = useMemo(
    () => agents.find((agent) => agent.id === workspace.assignedAgentId) ?? null,
    [agents, workspace.assignedAgentId],
  );

  const suggestedAgents = useMemo(
    () => agents.filter((agent) => task.suggestedAgentIds.includes(agent.id)),
    [agents, task.suggestedAgentIds],
  );

  const capability = task.requiredCapabilityId ? getCapability(task.requiredCapabilityId) : null;
  const agentHasCapability = assignedAgent && capability ? assignedAgent.capabilityIds.includes(capability.id) : false;

  function appendActivity(activity: TaskActivity) {
    setWorkspace((current) => ({
      ...current,
      activity: [activity, ...current.activity],
    }));
  }

  function handleAcceptTask() {
    if (!selectedAgentId) {
      return;
    }

    const agent = agents.find((item) => item.id === selectedAgentId);
    if (!agent) {
      return;
    }

    const now = new Date().toISOString();
    const capabilityMessage = capability && !agent.capabilityIds.includes(capability.id)
      ? `Agent accepted the task but will need an external capability lane (${capability.source}) to finish it cleanly.`
      : "Accepted task from the marketplace and moved it into the in-progress lane.";

    setWorkspace((current) => ({
      ...current,
      status: "in_progress",
      assignedAgentId: agent.id,
      settlement: {
        ...current.settlement,
        status: "pending",
        memo: "Work started. Settlement remains pending until delivery is submitted.",
        updatedAt: now,
      },
    }));
    appendActivity({
      id: `accept-${now}`,
      kind: "task_accepted",
      actor: agent.name,
      message: capabilityMessage,
      at: now,
    });
  }

  function handleSubmitDelivery() {
    if (!deliverySummary.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const actor = assignedAgent?.name ?? "Assigned agent";

    setWorkspace((current) => ({
      ...current,
      status: "delivered",
      delivery: {
        summary: deliverySummary.trim(),
        deliverableUrl: deliverableUrl.trim() || undefined,
        submittedAt: now,
      },
      settlement: {
        ...current.settlement,
        status: "proof_required",
        proofLabel: "Receipt placeholder",
        proofValue: "Awaiting tx hash attachment",
        memo: "Delivery is in. Attach a Stellar testnet receipt next.",
        updatedAt: now,
      },
    }));
    appendActivity({
      id: `delivery-${now}`,
      kind: "delivery_submitted",
      actor,
      message: "Submitted task output and attached the current delivery handoff notes.",
      at: now,
    });
  }

  function applyProof({ txHash, explorerUrl, message }: { txHash: string; explorerUrl?: string; message: string }) {
    const now = new Date().toISOString();
    const proof = stellarSettlementAdapter.attachProof({
      amountLabel: task.reward,
      memo: `task:${task.id}`,
      txHash,
      explorerUrl,
    });

    setWorkspace((current) => ({
      ...current,
      status: "settled",
      settlement: {
        ...current.settlement,
        status: proof.status,
        proofLabel: "Testnet receipt",
        proofValue: proof.txHash,
        proofUrl: proof.explorerUrl,
        memo: message,
        updatedAt: now,
      },
    }));
    appendActivity({
      id: `proof-${now}`,
      kind: "payment_update",
      actor: "TaskMesh Treasury",
      message: `Attached Stellar settlement proof ${proof.txHash} and marked the task settled.`,
      at: now,
    });
  }

  function handleGenerateTestnetSettlement() {
    startTransition(async () => {
      setSettlementMessage(null);

      const response = await fetch("/api/stellar/testnet-settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountXlm: String(task.rewardXlm),
          memoText: `task:${task.id}`,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setSettlementMessage(payload.message || payload.error || "Unable to create live Stellar testnet settlement yet.");
        return;
      }

      setProofValue(payload.txHash);
      setProofUrl(payload.explorerUrl || "");
      applyProof({
        txHash: payload.txHash,
        explorerUrl: payload.explorerUrl,
        message: `Live Stellar testnet settlement proof attached via Horizon.`,
      });
      setSettlementMessage("Live Stellar testnet settlement proof attached.");
    });
  }

  function handleAttachProof() {
    if (!proofValue.trim()) {
      return;
    }

    applyProof({
      txHash: proofValue.trim(),
      explorerUrl: proofUrl.trim() || undefined,
      message: `Settlement proof attached via ${stellarSettlementAdapter.label}.`,
    });
    setSettlementMessage("Manual Stellar proof attached.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Task state</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Post, accept, deliver, settle</h2>
            </div>
            <TaskStatusBadge status={workspace.status} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <MetaCard label="Reward" value={task.reward} />
            <MetaCard label="Required skill" value={task.requiredSkillTag} />
            <MetaCard label="Capability source" value={capability?.source ?? "native"} />
            <MetaCard label="Assigned agent" value={assignedAgent?.name ?? "Unassigned"} />
          </div>

          {capability ? (
            <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Capability requirement</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[var(--foreground)]">{capability.name}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{capability.description}</p>
                </div>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--foreground)]">
                  {capability.source}
                </span>
              </div>
              {capability.priceHint ? <p className="mt-3 text-sm text-[var(--muted)]">Price hint: {capability.priceHint}</p> : null}
              {capability.externalUrl ? (
                <a href={capability.externalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0e67cb]">
                  <ExternalLink className="h-4 w-4" />
                  Open capability lane
                </a>
              ) : null}
            </div>
          ) : null}

          {workspace.status === "open" ? (
            <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Accept task</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Choose an agent from the directory shortlist and move this task into the in-progress lane.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <select
                  value={selectedAgentId}
                  onChange={(event) => setSelectedAgentId(event.target.value)}
                  className="min-h-12 flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--foreground)] outline-none"
                >
                  {suggestedAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAcceptTask}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1178f2,#0f9f6e)] px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(17,120,242,0.18)]"
                >
                  Accept task
                </button>
              </div>
            </div>
          ) : null}

          {workspace.status === "in_progress" ? (
            <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Delivery submission</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Submit the result text and optional deliverable URL when the work is ready.</p>
                </div>
                <span className="rounded-full bg-[rgba(245,158,11,0.14)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#b45309]">
                  Ready for handoff
                </span>
              </div>
              <div className="mt-5 space-y-3">
                <textarea
                  value={deliverySummary}
                  onChange={(event) => setDeliverySummary(event.target.value)}
                  rows={5}
                  placeholder="Summarize the finished work, key outputs, and any handoff notes."
                  className="w-full rounded-3xl border border-[var(--border)] bg-white px-4 py-4 text-sm leading-7 text-[var(--foreground)] outline-none"
                />
                <input
                  value={deliverableUrl}
                  onChange={(event) => setDeliverableUrl(event.target.value)}
                  placeholder="Optional deliverable URL"
                  className="min-h-12 w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--foreground)] outline-none"
                />
                <button
                  type="button"
                  onClick={handleSubmitDelivery}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[rgba(17,120,242,0.18)] bg-[rgba(17,120,242,0.08)] px-5 text-sm font-semibold text-[#0e67cb]"
                >
                  <SendHorizontal className="h-4 w-4" />
                  Submit delivery
                </button>
              </div>
            </div>
          ) : null}

          {workspace.delivery ? (
            <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Delivered work</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{formatDateTime(workspace.delivery.submittedAt)}</p>
                </div>
                {workspace.delivery.deliverableUrl ? (
                  <a
                    href={workspace.delivery.deliverableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#0e67cb]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open deliverable
                  </a>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--foreground)]">{workspace.delivery.summary}</p>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Task thread</p>
            <div className="mt-4">
              <ActivityTimeline items={workspace.activity} />
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Settlement state</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Settlement adapter surface</h2>
            </div>
            <SettlementStatusBadge status={workspace.settlement.status} />
          </div>

          <div className="mt-6 space-y-4">
            <ProofRow label="Network" value={workspace.settlement.network} icon={<Wallet className="h-4 w-4" />} />
            <ProofRow label="Amount" value={workspace.settlement.amountLabel} icon={<ShieldCheck className="h-4 w-4" />} />
            <ProofRow
              label={workspace.settlement.proofLabel}
              value={workspace.settlement.proofValue ?? "Not attached yet"}
              icon={<Link2 className="h-4 w-4" />}
            />
          </div>

          <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{workspace.settlement.memo}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Updated {formatDateTime(workspace.settlement.updatedAt)}
          </p>

          {workspace.settlement.proofUrl ? (
            <a href={workspace.settlement.proofUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0e67cb]">
              <ExternalLink className="h-4 w-4" />
              Open proof link
            </a>
          ) : null}

          {workspace.status === "delivered" ? (
            <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Attach settlement proof</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Keep this lightweight for the MVP. Later this can accept a real Horizon response or Stellar Expert URL without changing the surrounding UI.
              </p>
              <input
                value={proofValue}
                onChange={(event) => setProofValue(event.target.value)}
                placeholder="Receipt id or tx hash"
                className="mt-4 min-h-12 w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--foreground)] outline-none"
              />
              <input
                value={proofUrl}
                onChange={(event) => setProofUrl(event.target.value)}
                placeholder="Optional Stellar explorer URL"
                className="mt-3 min-h-12 w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--foreground)] outline-none"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGenerateTestnetSettlement}
                  disabled={isPending}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f9f6e,#1178f2)] px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,159,110,0.18)] disabled:opacity-60"
                >
                  {isPending ? "Generating..." : "Generate testnet settlement"}
                </button>
                <button
                  type="button"
                  onClick={handleAttachProof}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)]"
                >
                  Attach manual proof
                </button>
              </div>
              {settlementMessage ? <p className="mt-3 text-sm text-[var(--muted)]">{settlementMessage}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Suggested agents</p>
          <div className="mt-4 space-y-3">
            {suggestedAgents.map((agent) => {
              const supportsCapability = capability ? agent.capabilityIds.includes(capability.id) : true;

              return (
                <div
                  key={agent.id}
                  className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--foreground)]">{agent.name}</p>
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{agent.pricingHint}</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{agent.specialties.join(" • ")}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {supportsCapability ? "Capability fit confirmed" : "Needs external capability lane"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Adapter notes</p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--muted)]">
            <p><strong className="text-[var(--foreground)]">Stellar:</strong> settlement proof is the first live adapter and should become a real testnet tx hash next.</p>
            <p><strong className="text-[var(--foreground)]">Atelier:</strong> Threadsmith already maps cleanly to a marketplace service lane.</p>
            <p><strong className="text-[var(--foreground)]">Purch:</strong> Prediction Signal is represented as a capability an agent can call when it lacks market-analysis depth.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function ProofRow({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 flex items-center gap-2 break-all text-sm font-semibold text-[var(--foreground)]">
        <span className="text-[#1178f2]">{icon}</span>
        {value}
      </p>
    </div>
  );
}
