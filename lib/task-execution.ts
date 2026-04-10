import type { Agent, TaskRecord } from "@/lib/taskmesh-data";
import { getCapability } from "@/lib/taskmesh-data";
import { clamp, hashKey } from "@/lib/utils";

export type ExecutionTraceStep = {
  id: string;
  label: string;
  detail: string;
  durationMs: number;
};

export type ExecutionArtifactMetric = {
  label: string;
  value: string;
};

export type ExecutionArtifactSection = {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
};

export type ExecutionArtifact = {
  artifactId: string;
  title: string;
  kindLabel: string;
  preview: string;
  summary: string;
  metrics: ExecutionArtifactMetric[];
  sections: ExecutionArtifactSection[];
  notes: string[];
};

export type ExecutionResult = {
  runId: string;
  taskId: string;
  agentId: string;
  runtimeLabel: string;
  fitScore: number;
  qualityLabel: string;
  startedAt: string;
  completedAt: string;
  deliverySummary: string;
  deliverableUrl?: string;
  trace: ExecutionTraceStep[];
  artifact: ExecutionArtifact;
};

const researchProfiles = [
  {
    name: "Trustline Studio",
    focus: "developer tooling",
    momentum: "consistent builder chatter around onboarding speed",
    angle: "Pitch them as a force multiplier for hackathon onboarding and starter repos.",
  },
  {
    name: "Canopy Wallet",
    focus: "wallet experience",
    momentum: "high buyer value because the product maps directly to new-user activation",
    angle: "Lead with distribution and demo visibility rather than abstract ecosystem language.",
  },
  {
    name: "AnchorPath",
    focus: "payments infrastructure",
    momentum: "useful because it signals serious transaction throughput, not just surface polish",
    angle: "Frame the outreach around settlement credibility and merchant-ready use cases.",
  },
  {
    name: "Soroflow Labs",
    focus: "contract tooling",
    momentum: "good fit for builders who want to show Soroban-adjacent workflows quickly",
    angle: "Invite them as a technical credibility anchor for advanced participants.",
  },
  {
    name: "OrbitKit",
    focus: "analytics and observability",
    momentum: "teams can use their visibility story to justify why they belong in the shortlist",
    angle: "Emphasize that they help participants prove outcomes, not just ship code.",
  },
  {
    name: "LumenRail",
    focus: "infra and indexing",
    momentum: "strong because infra teams raise the floor for every other participating builder",
    angle: "Use the outreach note to position them as a leverage play for ecosystem throughput.",
  },
];

const reviewRiskBank = [
  "Do not let x402 service receipts masquerade as bounty payout proof.",
  "Keep Soroban reward release and external capability execution decoupled so failed service calls do not look like payout failures.",
  "Do not let a provider own bounty truth; TaskMesh should stay the system of record for acceptance, proof, and release.",
  "Gate external capabilities behind explicit bounty metadata so agent routing remains inspectable in the UI.",
];

const migrationPillars = [
  "TaskMesh is a decentralized agent marketplace on Stellar, not a generic gig board.",
  "The loop is economic and explicit: bounty, acceptance, proof submission, verification, then Stellar payout.",
  "x402 and MPP are service lanes beside Soroban escrow, not replacements for it.",
];

function computeSeed(parts: string[]) {
  return hashKey(parts)
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 17), 0);
}

function pickResearchProfiles(task: TaskRecord, agent: Agent) {
  const baseSeed = computeSeed([task.id, agent.id, task.requiredSkillTag]);

  return [...researchProfiles]
    .map((profile, index) => ({
      ...profile,
      score: 72 + ((baseSeed + index * 29) % 21) + (agent.capabilityIds.includes("research-summary") ? 8 : 0),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

function computeFitScore(task: TaskRecord, agent: Agent) {
  let score = 70;
  if (task.requiredCapabilityId && agent.capabilityIds.includes(task.requiredCapabilityId)) {
    score += 16;
  }
  if (agent.specialties.some((specialty) => specialty.includes(task.requiredSkillTag.split(" ")[0] ?? ""))) {
    score += 7;
  }
  if (agent.status === "available") {
    score += 4;
  }
  if (agent.status === "busy") {
    score -= 5;
  }

  return clamp(score, 52, 98);
}

function buildResearchArtifact(task: TaskRecord, agent: Agent, fitScore: number): Omit<ExecutionResult, "runId" | "taskId" | "agentId" | "startedAt" | "completedAt"> {
  const shortlist = pickResearchProfiles(task, agent);
  const capability = task.requiredCapabilityId ? getCapability(task.requiredCapabilityId) : null;
  const artifactId = `RS-${computeSeed([task.id, agent.id]).toString(16).toUpperCase().slice(0, 8)}`;

  return {
    runtimeLabel: "Local research work run",
    fitScore,
    qualityLabel: fitScore >= 88 ? "Strong bounty fit" : "Supported bounty result",
    deliverySummary: `${agent.name} prepared a ranked proof-ready brief with ${shortlist.length} builder targets, why-now notes, and outreach angles that a poster can verify quickly.`,
    deliverableUrl: `taskmesh://artifact/${task.id}/${artifactId.toLowerCase()}`,
    trace: [
      {
        id: "ingest",
        label: "Read the bounty brief",
        detail: `Read ${task.operatorBrief.length} poster requirements and locked the proof artifact shape for ${task.postedBy}.`,
        durationMs: 700,
      },
      {
        id: "score",
        label: "Rank candidate profiles",
        detail: `Ranked seeded builder profiles against ${task.requiredSkillTag} and ${agent.name}'s strengths.`,
        durationMs: 950,
      },
      {
        id: "package",
        label: "Draft the outreach brief",
        detail: "Compressed the shortlist into a concise brief with direct angles instead of generic notes.",
        durationMs: 820,
      },
      {
        id: "handoff",
        label: "Prepare the proof artifact",
        detail: "Attached the summary, artifact id, and poster-verification metadata for the workspace.",
        durationMs: 540,
      },
    ],
    artifact: {
      artifactId,
      title: "Stellar Builder Outreach Brief",
      kindLabel: "Research deliverable",
      preview: shortlist.map((entry) => entry.name).join(" • "),
      summary: `Shortlist generated locally from TaskMesh seed profiles. The output is deterministic, agent-sensitive, and packaged as a proof-ready outreach memo.`,
      metrics: [
        { label: "Targets", value: String(shortlist.length) },
        { label: "Agent fit", value: `${fitScore}/100` },
        { label: "Capability", value: capability?.name ?? "TaskMesh native" },
        { label: "Turnaround", value: agent.avgTurnaround },
      ],
      sections: [
        {
          id: "executive-brief",
          title: "Quick read",
          body: `${agent.name} prioritized builder profiles that make the hackathon look serious quickly: one wallet-facing product, one infra-heavy team, one tooling layer, and one observability angle. The aim is ecosystem leverage, not logo density.`,
        },
        {
          id: "shortlist",
          title: "Ranked shortlist",
          body: "Ordered by TaskMesh fit score and usefulness for hackathon outreach.",
          bullets: shortlist.map(
            (entry, index) =>
              `${index + 1}. ${entry.name} (${entry.focus}) | Why now: ${entry.momentum}. Outreach angle: ${entry.angle}`,
          ),
        },
        {
          id: "workspace-note",
          title: "Workspace note",
          body: "This proof artifact was generated locally inside TaskMesh, not pulled from a live internet crawl. It shows the real execution path and verification format without pretending to be live market data.",
        },
      ],
      notes: [
        "Best used as a demo of the real work path and proof packaging.",
        "Swap the seeded profile bank later for a live crawl without changing the UI contract.",
      ],
    },
  };
}

function buildReviewArtifact(task: TaskRecord, agent: Agent, fitScore: number): Omit<ExecutionResult, "runId" | "taskId" | "agentId" | "startedAt" | "completedAt"> {
  const artifactId = `CR-${computeSeed([task.id, agent.id]).toString(16).toUpperCase().slice(0, 8)}`;

  return {
    runtimeLabel: "Local review work run",
    fitScore,
    qualityLabel: fitScore >= 88 ? "Implementation-ready review" : "Structured review",
    deliverySummary: `${agent.name} produced a focused memo with explicit risks, a minimum contract shape, and a rollout order that keeps Soroban escrow authoritative.`,
    deliverableUrl: `taskmesh://artifact/${task.id}/${artifactId.toLowerCase()}`,
    trace: [
      {
        id: "scope",
        label: "Lock the review scope",
        detail: "Reduced the bounty to the adapter boundary, failure handling, and rollout sequence.",
        durationMs: 640,
      },
      {
        id: "risk-scan",
        label: "Check integration risks",
        detail: "Evaluated where x402 service behavior could damage the core bounty state machine.",
        durationMs: 780,
      },
      {
        id: "contract",
        label: "Draft the adapter contract",
        detail: "Wrote the minimum useful interface rather than a full orchestration layer.",
        durationMs: 820,
      },
      {
        id: "memo",
        label: "Prepare the memo",
        detail: "Compressed the findings into a memo an engineer can act on quickly.",
        durationMs: 520,
      },
    ],
    artifact: {
      artifactId,
      title: "x402 Service Contract Memo",
      kindLabel: "Engineering review",
      preview: "service request • provider receipt • normalized output • payout isolation",
      summary: "The memo keeps service providers outside the critical path until the adapter proves its reliability. TaskMesh remains the source of truth for bounty lifecycle and payout state.",
      metrics: [
        { label: "Key risks", value: "4" },
        { label: "Agent fit", value: `${fitScore}/100` },
        { label: "Delivery mode", value: "Implementation memo" },
        { label: "Turnaround", value: agent.avgTurnaround },
      ],
      sections: [
        {
          id: "risk-bank",
          title: "Risk bank",
          body: "Highest-value risks to address before a broader capability offer exists.",
          bullets: reviewRiskBank,
        },
        {
          id: "contract",
          title: "Minimum adapter contract",
          body: "Recommended interface: `requestCapability(bountyId, capabilityId, input) -> { executionId, normalizedOutput, providerReceipt }`. This keeps provider detail out of the bounty model while still giving the workspace proof that work actually ran.",
        },
        {
          id: "rollout",
          title: "Rollout order",
          body: "Start with read-only capability execution and visible receipts. Add retries and provider fallback later. Keep escrow release logic outside the provider layer.",
        },
      ],
      notes: [
        "This is a deterministic local memo generated from the bounty and selected agent.",
        "It is stronger than a canned placeholder but still not a repository-backed code review.",
      ],
    },
  };
}

function buildMigrationArtifact(task: TaskRecord, agent: Agent, fitScore: number): Omit<ExecutionResult, "runId" | "taskId" | "agentId" | "startedAt" | "completedAt"> {
  const artifactId = `MN-${computeSeed([task.id, agent.id]).toString(16).toUpperCase().slice(0, 8)}`;

  return {
    runtimeLabel: "Local writing work run",
    fitScore,
    qualityLabel: fitScore >= 88 ? "Publish-ready copy" : "Clean working draft",
    deliverySummary: `${agent.name} drafted a market note that recenters the brand around visible bounty work, proof submission, and Stellar payout proof.`,
    deliverableUrl: `taskmesh://artifact/${task.id}/${artifactId.toLowerCase()}`,
    trace: [
      {
        id: "extract",
        label: "Extract legacy claims",
        detail: "Identified the language likely to confuse the current TaskMesh story.",
        durationMs: 560,
      },
      {
        id: "reframe",
        label: "Reframe product narrative",
        detail: "Shifted the copy toward one visible transaction loop and away from speculative positioning.",
        durationMs: 840,
      },
      {
        id: "publish",
        label: "Prepare the migration note",
        detail: "Prepared a clean proof-ready note with message pillars and publish guidance.",
        durationMs: 520,
      },
    ],
      artifact: {
        artifactId,
        title: "TaskMesh Migration Note",
        kindLabel: "Migration note",
      preview: migrationPillars.join(" • "),
      summary: "Short migration copy that tells demo viewers what changed and why the product now centers on visible agent work.",
      metrics: [
        { label: "Pillars", value: String(migrationPillars.length) },
        { label: "Agent fit", value: `${fitScore}/100` },
        { label: "Tone", value: "Buyer-ready" },
        { label: "Turnaround", value: agent.avgTurnaround },
      ],
      sections: [
        {
          id: "headline",
          title: "Recommended headline",
          body: "TaskMesh is now a focused agent marketplace: post the bounty, let a worker accept it, inspect the proof, and settle on Stellar.",
        },
        {
          id: "message-pillars",
          title: "Message pillars",
          body: "Use these lines to keep the story tight.",
          bullets: migrationPillars,
        },
        {
          id: "publish-note",
          title: "Publish note",
          body: "Mention paid service lanes only as support infrastructure. Do not let them compete with the Soroban bounty loop in headlines, hero copy, or navigation.",
        },
      ],
      notes: [
        "This output is deterministic local copy generation, not a live docs migration.",
      ],
    },
  };
}

export function generateExecutionResult(task: TaskRecord, agent: Agent): ExecutionResult {
  const fitScore = computeFitScore(task, agent);
  const base = (() => {
    switch (task.executionProfile) {
      case "research_brief":
        return buildResearchArtifact(task, agent, fitScore);
      case "code_review":
        return buildReviewArtifact(task, agent, fitScore);
      case "migration_note":
      default:
        return buildMigrationArtifact(task, agent, fitScore);
    }
  })();

  const startedAt = new Date().toISOString();
  const completedAt = new Date(Date.now() + base.trace.reduce((sum, step) => sum + step.durationMs, 0)).toISOString();

  return {
    runId: `run-${task.id}-${agent.id}`,
    taskId: task.id,
    agentId: agent.id,
    startedAt,
    completedAt,
    ...base,
  };
}
