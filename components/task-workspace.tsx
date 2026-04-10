"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Link2, ShieldCheck, Sparkles, Wallet } from "lucide-react";

import { ActivityTimeline } from "@/components/activity-timeline";
import { SettlementStatusBadge } from "@/components/settlement-status-badge";
import { getCapability, getEscrowStatusLabel, getPaymentLaneLabel, type Agent, type TaskRecord } from "@/lib/taskmesh-data";
import { formatDateTime } from "@/lib/utils";

type SubmissionMode = "pr" | "x-thread" | "build" | "generic";

export function TaskWorkspace({ task, agents }: { task: TaskRecord; agents: Agent[] }) {
  const [submitted, setSubmitted] = useState(false);
  const capability = task.requiredCapabilityId ? getCapability(task.requiredCapabilityId) : null;
  const submissionMode: SubmissionMode = task.requiredSkillTag.toLowerCase().includes("pr")
    ? "pr"
    : task.requiredSkillTag.toLowerCase().includes("x thread")
      ? "x-thread"
      : task.requiredSkillTag.toLowerCase().includes("build") || task.requiredSkillTag.toLowerCase().includes("app")
        ? "build"
        : "generic";

  const suggestedAgents = agents.filter((agent) => task.suggestedAgentIds.includes(agent.id));
  const submissionTitle =
    submissionMode === "pr"
      ? "Submit PR link for review"
      : submissionMode === "x-thread"
        ? "Submit X thread link for review"
        : submissionMode === "build"
          ? "Submit demo and GitHub repo"
          : "Submit your work for review";

  return (
    <div className="grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/tasks" className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.1)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--foreground-strong)] transition hover:bg-[rgba(15,23,42,0.03)]">
            ← Back to bounties
          </Link>
        </div>

        <section className="tm-surface-strong rounded-[34px] p-6 sm:p-7">
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

        <section className="tm-surface rounded-[34px] p-6 sm:p-7 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Submission form</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground-strong)]">{submissionTitle}</h2>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.84)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Winner reviewed manually
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[30px] border border-[rgba(17,120,242,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,255,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Required fields</p>
              <div className="mt-4 space-y-3">
                {submissionMode === "pr" ? (
                  <>
                    <input placeholder="GitHub PR link" className="tm-input min-h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
                    <textarea placeholder="Short review note explaining the change and why it improves the Stellar flow" className="tm-input min-h-[132px] rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
                  </>
                ) : submissionMode === "x-thread" ? (
                  <>
                    <input placeholder="X/Twitter thread link" className="tm-input min-h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
                    <textarea placeholder="Why this thread is timely, accurate, and worth rewarding" className="tm-input min-h-[132px] rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
                  </>
                ) : submissionMode === "build" ? (
                  <>
                    <input placeholder="Live demo URL" className="tm-input min-h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
                    <input placeholder="GitHub repository URL" className="tm-input min-h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
                    <textarea placeholder="Short build note explaining what was built and how Stellar is used" className="tm-input min-h-[132px] rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
                  </>
                ) : (
                  <>
                    <input placeholder="Submission link" className="tm-input min-h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
                    <textarea placeholder="What are you submitting?" className="tm-input min-h-[132px] rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
                  </>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => setSubmitted(true)} className="tm-button-primary inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold shadow-[0_10px_24px_rgba(17,120,242,0.18)]">
                  Submit for review
                </button>
                <p className="self-center text-sm text-[var(--muted)]">Strongest approved submission gets paid.</p>
              </div>
              {submitted ? (
                <div className="mt-4 rounded-2xl border border-[rgba(15,159,110,0.16)] bg-[rgba(15,159,110,0.08)] px-4 py-4">
                  <p className="text-sm font-semibold text-[#166534]">Submission received</p>
                  <p className="mt-2 text-sm leading-7 text-[rgba(22,101,52,0.86)]">Your entry is now marked for manual review. If it stands out, it can be selected for the XLM payout.</p>
                </div>
              ) : null}
            </div>

            <div className="tm-subsurface rounded-[30px] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">What matters most</p>
              <div className="mt-4 space-y-3">
                <HintCard title="What to submit" body={task.desiredOutcome} />
                <HintCard title="How review works" body="This page should help you submit clearly. Final winner review happens manually in the bounties workflow." />
                <HintCard title="Payout rule" body="The winner is reviewed manually before the XLM payout is released." />
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
      </div>

      <div className="space-y-5">
        <section className="tm-surface-strong rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Payout summary</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground-strong)]">Manual review before payout</h2>
            </div>
            <SettlementStatusBadge status={task.settlement.status} />
          </div>

          <div className="mt-5 space-y-4">
            <ProofRow label="Prize amount" value={task.settlement.amountLabel} icon={<Wallet className="h-4 w-4" />} />
            <ProofRow label="Submission proof" value={task.settlement.proofLabel} icon={<ShieldCheck className="h-4 w-4" />} />
            <ProofRow label="Current payout proof" value={task.settlement.proofValue ?? "Not attached yet"} icon={<Link2 className="h-4 w-4" />} />
          </div>

          <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{task.settlement.memo}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Updated {formatDateTime(task.settlement.updatedAt)}</p>

          {task.settlement.proofUrl ? (
            <a href={task.settlement.proofUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0e67cb]">
              <ExternalLink className="h-4 w-4" />
              Open payout tx
            </a>
          ) : null}
        </section>

        <section className="tm-surface rounded-[32px] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Suggested agents</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground-strong)]">Good fits for this bounty</h2>
          <div className="mt-5 space-y-3">
            {suggestedAgents.slice(0, 3).map((agent) => (
              <div key={agent.id} className="tm-subsurface rounded-[24px] px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-[18px] bg-[rgba(15,23,42,0.06)] ring-1 ring-[rgba(15,23,42,0.08)]">
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

        <section className="tm-surface rounded-[32px] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Payment layers</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground-strong)]">How payment is handled</h2>
          <div className="mt-5 space-y-3">
            {task.paymentLayers.map((layer) => (
              <div key={layer.id} className="tm-subsurface rounded-[24px] px-4 py-4">
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

        <section className="tm-surface rounded-[32px] p-5 sm:p-6">
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
