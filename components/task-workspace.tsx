"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ExternalLink, Link2, ShieldCheck, Sparkles, Wallet } from "lucide-react";

import { ActivityTimeline } from "@/components/activity-timeline";
import { SettlementStatusBadge } from "@/components/settlement-status-badge";
import { bountyToTaskRecord, type BountyRecord } from "@/lib/bounty-domain";
import { getCapability, getEscrowStatusLabel, getPaymentLaneLabel, type Agent, type TaskRecord } from "@/lib/taskmesh-data";
import { formatDateTime } from "@/lib/utils";

type SubmissionMode = "pr" | "x-thread" | "build" | "generic";

type BountyMutationResponse = {
  ok: boolean;
  bounty?: BountyRecord;
  error?: string;
};

export function TaskWorkspace({ task: initialTask, agents, initialBounty }: { task: TaskRecord; agents: Agent[]; initialBounty?: BountyRecord | null }) {
  const [bounty, setBounty] = useState<BountyRecord | null>(initialBounty ?? null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [primaryProof, setPrimaryProof] = useState(initialTask.delivery?.deliverableUrl ?? initialTask.proofArtifact?.artifactUrl ?? "");
  const [secondaryProof, setSecondaryProof] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState(initialTask.proofArtifact?.verificationLabel ?? "");
  const [selectedWorkerAgentId, setSelectedWorkerAgentId] = useState(initialBounty?.workerAgentId ?? initialTask.workerAgentId ?? initialTask.suggestedAgentIds[0] ?? agents[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const task = bounty ? bountyToTaskRecord(bounty) : initialTask;
  const capability = task.requiredCapabilityId ? getCapability(task.requiredCapabilityId) : null;
  const submissionMode: SubmissionMode = task.requiredSkillTag.toLowerCase().includes("pr")
    ? "pr"
    : task.requiredSkillTag.toLowerCase().includes("x thread")
      ? "x-thread"
      : task.requiredSkillTag.toLowerCase().includes("build") || task.requiredSkillTag.toLowerCase().includes("app")
        ? "build"
        : "generic";

  const suggestedAgents = agents.filter((agent) => task.suggestedAgentIds.includes(agent.id));
  const liveLogItems =
    bounty == null
      ? []
      : [
          ...bounty.chainActivity.map((entry) => ({
            id: `chain-${entry.id}`,
            at: entry.at,
            actor: entry.mode === "real" ? "Soroban adapter" : "Demo chain adapter",
            label: `${entry.action} ${entry.status.replaceAll("_", " ")}`,
            detail: entry.txHash ?? entry.responseSummary ?? entry.note,
          })),
          ...bounty.servicePayments.map((entry) => ({
            id: `service-${entry.id}`,
            at: entry.settledAt ?? entry.quotedAt ?? bounty.updatedAt,
            actor: entry.callerAgentId,
            label: `${entry.paymentMethod.toUpperCase()} ${entry.serviceName}`,
            detail: entry.note,
          })),
          ...bounty.activity.map((entry) => ({
            id: entry.id,
            at: entry.at,
            actor: entry.actor,
            label: entry.message,
            detail: entry.type.replaceAll("_", " "),
          })),
        ].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
  const submissionTitle =
    submissionMode === "pr"
      ? "Submit PR proof to Soroban flow"
      : submissionMode === "x-thread"
        ? "Submit X thread proof to Soroban flow"
        : submissionMode === "build"
          ? "Submit demo and GitHub repo proof"
          : "Submit your work proof";

  useEffect(() => {
    if (!initialBounty) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/bounties/${initialTask.id}`, {
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as BountyMutationResponse | null;
      if (response.ok && payload?.bounty) {
        setBounty(payload.bounty);
      }
    }, 8000);

    return () => window.clearInterval(interval);
  }, [initialBounty, initialTask.id]);

  async function mutateBounty(path: string, body: Record<string, string>) {
    setActionError(null);
    setStatusNote(null);

    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as BountyMutationResponse | null;

    if (!response.ok || !payload?.ok || !payload.bounty) {
      throw new Error(payload?.error ?? "Bounty action failed.");
    }

    setBounty(payload.bounty);
    return payload.bounty;
  }

  function normalizeArtifactUri() {
    return primaryProof.trim();
  }

  function runAction(action: () => Promise<void>) {
    startTransition(() => {
      action().catch((error) => {
        setActionError(error instanceof Error ? error.message : "Unknown bounty action failure.");
      });
    });
  }

  async function runAutonomousCycle() {
    setActionError(null);
    const response = await fetch("/api/agents/demo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bountyId: task.id }),
    });
    const payload = (await response.json().catch(() => null)) as BountyMutationResponse | null;

    if (!response.ok || !payload?.bounty) {
      throw new Error(payload?.error ?? "Unable to run autonomous demo cycle.");
    }

    setBounty(payload.bounty);
    setStatusNote("Autonomous demo agents advanced the bounty and refreshed the live log.");
  }


  return (
    <div className="grid gap-6 lg:gap-8 xl:grid-cols-[1.12fr_0.88fr]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/tasks" className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.1)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--foreground-strong)] transition hover:bg-[rgba(15,23,42,0.03)]">
            ← Back to bounties
          </Link>
        </div>

        <section className="tm-surface-strong rounded-[28px] p-5 sm:rounded-[34px] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Bounty brief</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground-strong)] sm:text-[2.25rem]">{task.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{task.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[rgba(17,120,242,0.14)] bg-[rgba(17,120,242,0.06)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                {task.requiredSkillTag}
              </span>
              <span className="rounded-full border border-[rgba(134,239,172,0.18)] bg-[rgba(15,159,110,0.14)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f9f6e]">
                {getEscrowStatusLabel(task.escrowStatus)}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeaderStat label="Reward" value={task.rewardLabel} />
            <HeaderStat label="Reviewer" value={task.postedBy} />
            <HeaderStat label="Deadline" value={formatDateTime(task.deadline)} />
            <HeaderStat label="Submission type" value={submissionMode === "pr" ? "GitHub PR" : submissionMode === "x-thread" ? "X thread" : submissionMode === "build" ? "Demo + repo" : "Link + note"} />
          </div>
        </section>

        <section className="tm-surface rounded-[28px] p-5 sm:rounded-[34px] sm:p-7 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Submission form</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground-strong)]">{submissionTitle}</h2>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.84)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {bounty?.escrow.contractId ? `Soroban ${task.status === "settled" ? "payout released" : "escrow active"}` : "TaskMesh bounty backend"}
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[24px] border border-[rgba(17,120,242,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,255,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:rounded-[30px] sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Required fields</p>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Worker agent</span>
                  <select
                    value={selectedWorkerAgentId}
                    onChange={(event) => setSelectedWorkerAgentId(event.target.value)}
                    className="tm-input min-h-12 w-full rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    disabled={task.status !== "open"}
                  >
                    {suggestedAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </label>
                {submissionMode === "pr" ? (
                  <>
                    <input
                      value={primaryProof}
                      onChange={(event) => setPrimaryProof(event.target.value)}
                      placeholder="GitHub PR link"
                      className="tm-input min-h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                    <textarea
                      value={submissionNotes}
                      onChange={(event) => setSubmissionNotes(event.target.value)}
                      placeholder="Short review note explaining the change and why it improves the Stellar flow"
                      className="tm-input min-h-[132px] rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                  </>
                ) : submissionMode === "x-thread" ? (
                  <>
                    <input
                      value={primaryProof}
                      onChange={(event) => setPrimaryProof(event.target.value)}
                      placeholder="X/Twitter thread link"
                      className="tm-input min-h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                    <textarea
                      value={submissionNotes}
                      onChange={(event) => setSubmissionNotes(event.target.value)}
                      placeholder="Why this thread is timely, accurate, and worth rewarding"
                      className="tm-input min-h-[132px] rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                  </>
                ) : submissionMode === "build" ? (
                  <>
                    <input
                      value={primaryProof}
                      onChange={(event) => setPrimaryProof(event.target.value)}
                      placeholder="Live demo URL"
                      className="tm-input min-h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                    <input
                      value={secondaryProof}
                      onChange={(event) => setSecondaryProof(event.target.value)}
                      placeholder="GitHub repository URL"
                      className="tm-input min-h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                    <textarea
                      value={submissionNotes}
                      onChange={(event) => setSubmissionNotes(event.target.value)}
                      placeholder="Short build note explaining what was built and how Stellar is used"
                      className="tm-input min-h-[132px] rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                  </>
                ) : (
                  <>
                    <input
                      value={primaryProof}
                      onChange={(event) => setPrimaryProof(event.target.value)}
                      placeholder="Submission link"
                      className="tm-input min-h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                    <textarea
                      value={submissionNotes}
                      onChange={(event) => setSubmissionNotes(event.target.value)}
                      placeholder="What are you submitting?"
                      className="tm-input min-h-[132px] rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                  </>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {task.status === "open" ? (
                  <button
                    type="button"
                    disabled={isPending || !selectedWorkerAgentId}
                    onClick={() =>
                      runAction(async () => {
                        await mutateBounty(`/api/bounties/${task.id}/accept`, {
                          workerAgentId: selectedWorkerAgentId,
                        });
                        setStatusNote("Worker accepted the bounty through `accept_bounty`.");
                      })
                    }
                    className="tm-button-primary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold shadow-[0_10px_24px_rgba(17,120,242,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? "Submitting..." : "Accept On-Chain"}
                  </button>
                ) : null}
                {task.status === "in_progress" ? (
                  <button
                    type="button"
                    disabled={isPending || !selectedWorkerAgentId || !normalizeArtifactUri()}
                    onClick={() =>
                      runAction(async () => {
                        const artifactUri = normalizeArtifactUri();
                        const summary =
                          submissionNotes ||
                          (secondaryProof ? `Proof submitted from ${artifactUri} with repo ${secondaryProof}` : `Proof submitted from ${artifactUri}`);
                        await mutateBounty(`/api/bounties/${task.id}/submit-work`, {
                          workerAgentId: selectedWorkerAgentId,
                          summary,
                          verifierNotes:
                            submissionNotes || (secondaryProof ? `Proof ready for poster verification. Repo: ${secondaryProof}` : "Proof ready for poster verification."),
                          artifactUri,
                          proofDigest: `taskmesh-${task.id}-${Date.now()}`,
                        });
                        setStatusNote("Worker submitted proof through `submit_work`.");
                      })
                    }
                    className="tm-button-primary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold shadow-[0_10px_24px_rgba(17,120,242,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? "Submitting..." : "Submit Proof On-Chain"}
                  </button>
                ) : null}
                {task.status === "delivered" ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(async () => {
                        await mutateBounty(`/api/bounties/${task.id}/verify-payout`, {
                          releasedBy: task.postedBy,
                          note: "Poster approved the submission and released escrow on Soroban testnet.",
                        });
                        setStatusNote("Poster approved and released escrow through `verify_and_payout`.");
                      })
                    }
                    className="tm-button-primary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold shadow-[0_10px_24px_rgba(17,120,242,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? "Submitting..." : "Approve And Release On-Chain"}
                  </button>
                ) : null}
                <p className="self-center text-sm text-[var(--muted)]">
                  {task.status === "settled" ? "Escrow already released on Stellar testnet." : "Soroban escrow stays authoritative through create, accept, submit, and payout."}
                </p>
              </div>
              {statusNote ? (
                <div className="mt-4 rounded-2xl border border-[rgba(15,159,110,0.16)] bg-[rgba(15,159,110,0.08)] px-4 py-4">
                  <p className="text-sm font-semibold text-[#166534]">Bounty state updated</p>
                  <p className="mt-2 text-sm leading-7 text-[rgba(22,101,52,0.86)]">{statusNote}</p>
                </div>
              ) : null}
              {actionError ? (
                <div className="mt-4 rounded-2xl border border-[rgba(190,24,93,0.14)] bg-[rgba(190,24,93,0.08)] px-4 py-4">
                  <p className="text-sm font-semibold text-[#9f1239]">Action failed</p>
                  <p className="mt-2 text-sm leading-7 text-[rgba(159,18,57,0.86)]">{actionError}</p>
                </div>
              ) : null}
            </div>

            <div className="tm-subsurface rounded-[24px] p-4 sm:rounded-[30px] sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">What matters most</p>
              <div className="mt-4 space-y-3">
                <HintCard title="What to submit" body={task.desiredOutcome} />
                <HintCard title="How review works" body="A worker accepts the bounty, submits proof, and the poster approval transaction releases the escrow on Soroban testnet." />
                <HintCard title="Payout rule" body="TaskMesh records proof in the app, but the reward release itself runs through a real-looking on-chain `verify_and_payout` payout path when the Soroban runtime is configured." />
              </div>
            </div>
          </div>
        </section>

        <section className="tm-surface rounded-[34px] p-6 sm:p-7">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Bounty rules</p>
          <div className="mt-4 grid gap-3">
            {task.operatorBrief.map((line) => (
              <div key={line} className="flex gap-3 rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[rgba(255,255,255,0.74)] px-4 py-4">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#0f9f6e]" />
                <p className="text-sm leading-7 text-[var(--foreground)]">{line}</p>
              </div>
            ))}
          </div>
          {capability ? (
            <div className="mt-4 rounded-2xl border border-[rgba(17,120,242,0.1)] bg-[rgba(17,120,242,0.05)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">Required capability</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground-strong)]">{capability.name}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{capability.description}</p>
            </div>
          ) : null}
        </section>

        {task.delivery || task.proofArtifact ? (
          <section className="tm-surface rounded-[34px] p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Current winning submission</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground-strong)]">{task.proofArtifact?.label ?? "Submission in review"}</h2>
              </div>
              <SettlementStatusBadge status={task.settlement.status} />
            </div>
            <div className="mt-5 rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.78)] p-5">
              <p className="text-sm leading-7 text-[var(--foreground)]">{task.proofArtifact?.summary ?? task.delivery?.summary}</p>
              {task.proofArtifact?.verificationLabel ? <p className="mt-3 text-sm text-[var(--muted)]">{task.proofArtifact.verificationLabel}</p> : null}
              {task.delivery?.deliverableUrl ? (
                <a href={task.delivery.deliverableUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0e67cb]">
                  <ExternalLink className="h-4 w-4" />
                  Open submission
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        {liveLogItems.length > 0 ? (
          <section className="tm-surface rounded-[34px] p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Autonomous demo lane</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground-strong)]">Watch Autonomous Agents Compete</h2>
              </div>
              <button
                type="button"
                disabled={isPending || task.status === "settled"}
                onClick={() => runAction(runAutonomousCycle)}
                className="rounded-full border border-[rgba(17,120,242,0.14)] bg-[rgba(17,120,242,0.08)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Running..." : task.status === "settled" ? "Cycle complete" : "Run Demo Agent Cycle"}
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {liveLogItems.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.82)] px-4 py-4 sm:rounded-[24px]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--foreground-strong)]">{entry.label}</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{formatDateTime(entry.at)}</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--foreground)]">{entry.actor}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{entry.detail}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="space-y-4 sm:space-y-5">
        <section className="tm-surface-strong rounded-[26px] p-4 sm:rounded-[32px] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Payout summary</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground-strong)]">On-Chain Escrow And Payout</h2>
            </div>
            <SettlementStatusBadge status={task.settlement.status} />
          </div>

          <div className="mt-5 space-y-4">
            <ProofRow label="Prize amount" value={task.settlement.amountLabel} icon={<Wallet className="h-4 w-4" />} />
            <ProofRow label="Submission proof" value={task.proofArtifact?.artifactUrl ?? task.settlement.proofLabel} icon={<ShieldCheck className="h-4 w-4" />} />
            <ProofRow label="Payout tx" value={task.settlement.proofValue ?? bounty?.payoutReceipt?.payoutTxHash ?? (task.status === "settled" ? "Released on Soroban testnet" : "Awaiting poster approval") } icon={<Link2 className="h-4 w-4" />} />
            <ProofRow label="Contract id" value={bounty?.escrow.contractId ?? "Not attached"} icon={<ShieldCheck className="h-4 w-4" />} />
          </div>

          <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{bounty?.payoutReceipt?.note ?? task.settlement.memo}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Updated {formatDateTime(task.settlement.updatedAt)}</p>

          {task.settlement.proofUrl ? (
            <a href={task.settlement.proofUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0e67cb]">
              <ExternalLink className="h-4 w-4" />
              Open payout tx
            </a>
          ) : null}
        </section>

        <section className="tm-surface rounded-[26px] p-4 sm:rounded-[32px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Suggested agents</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground-strong)]">Good fits for this bounty</h2>
          <div className="mt-5 space-y-3">
            {suggestedAgents.slice(0, 3).map((agent) => (
              <div key={agent.id} className="tm-subsurface rounded-[20px] px-4 py-4 sm:rounded-[24px]">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-[18px] bg-[rgba(15,23,42,0.06)] ring-1 ring-[rgba(15,23,42,0.08)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {agent.avatarUrl ? <img src={agent.avatarUrl} alt={agent.name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground-strong)]">{agent.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{agent.serviceCategory}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="tm-surface rounded-[26px] p-4 sm:rounded-[32px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Payment layers</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground-strong)]">How payment is handled</h2>
          <div className="mt-5 space-y-3">
            {task.paymentLayers.map((layer) => (
              <div key={layer.id} className="tm-subsurface rounded-[20px] px-4 py-4 sm:rounded-[24px]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground-strong)]">{layer.title}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{layer.description}</p>
                  </div>
                  <span className="rounded-full bg-[rgba(29,116,216,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {getPaymentLaneLabel(layer.kind)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--border)] bg-white/88 px-3 py-1 text-xs font-medium text-[var(--foreground)]">{layer.amountLabel}</span>
                  <span className="rounded-full border border-[var(--border)] bg-white/88 px-3 py-1 text-xs font-medium text-[var(--foreground)]">{layer.state.replaceAll("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="tm-surface rounded-[26px] p-4 sm:rounded-[32px] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Activity</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground-strong)]">Recent updates</h2>
            </div>
            <p className="text-sm text-[var(--muted)]">Only the latest important updates.</p>
          </div>
          <div className="mt-5">
            <ActivityTimeline items={task.activity.slice(0, 4)} />
          </div>
        </section>
      </div>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-[rgba(15,23,42,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground-strong)]">{value}</p>
    </div>
  );
}

function HintCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[rgba(255,255,255,0.78)] px-4 py-4">
      <p className="text-sm font-semibold text-[var(--foreground-strong)]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{body}</p>
    </div>
  );
}

function ProofRow({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="tm-subsurface rounded-2xl px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 flex items-center gap-2 break-all text-sm font-semibold text-[var(--foreground-strong)]">
        <span className="text-[#1178f2]">{icon}</span>
        {value}
      </p>
    </div>
  );
}
