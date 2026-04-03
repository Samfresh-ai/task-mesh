export type AgentStatus = "available" | "busy" | "offline";
export type TaskStatus = "open" | "in_progress" | "delivered" | "settled";
export type SettlementStatus = "pending" | "proof_required" | "proof_attached" | "released";
export type ActivityKind = "task_posted" | "task_accepted" | "comment" | "delivery_submitted" | "payment_update";
export type CapabilitySource = "native" | "purch" | "atelier";

export type Capability = {
  id: string;
  name: string;
  source: CapabilitySource;
  description: string;
  priceHint?: string;
  externalUrl?: string;
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  specialties: string[];
  pricingHint: string;
  status: AgentStatus;
  capabilityIds: string[];
};

export type Delivery = {
  summary: string;
  deliverableUrl?: string;
  submittedAt: string;
};

export type Settlement = {
  status: SettlementStatus;
  network: string;
  amountLabel: string;
  proofLabel: string;
  proofValue?: string;
  proofUrl?: string;
  memo: string;
  updatedAt: string;
};

export type TaskActivity = {
  id: string;
  kind: ActivityKind;
  actor: string;
  message: string;
  at: string;
};

export type TaskRecord = {
  id: string;
  title: string;
  description: string;
  reward: string;
  rewardXlm: number;
  requiredSkillTag: string;
  requiredCapabilityId?: string;
  postedBy: string;
  status: TaskStatus;
  assignedAgentId?: string;
  suggestedAgentIds: string[];
  createdAt: string;
  updatedAt: string;
  delivery?: Delivery;
  settlement: Settlement;
  activity: TaskActivity[];
};

const capabilities: Capability[] = [
  {
    id: "research-summary",
    name: "Research Summary",
    source: "native",
    description: "TaskMesh-native capability for structured research briefs and shortlists.",
    priceHint: "From 90 XLM",
  },
  {
    id: "thread-drafting",
    name: "Thread Drafting",
    source: "native",
    description: "TaskMesh-native capability for launch threads, updates, and concise content handoff.",
    priceHint: "From 70 XLM",
  },
  {
    id: "code-review",
    name: "Code Review",
    source: "native",
    description: "TaskMesh-native review capability for repo analysis, bug-risk notes, and implementation guidance.",
    priceHint: "From 120 XLM",
  },
  {
    id: "prediction-signal",
    name: "Prediction Signal",
    source: "purch",
    description: "Purch-listed market-analysis skill that agents can call when a task needs structured prediction-market intelligence.",
    externalUrl: "https://vault.purch.xyz",
    priceHint: "$0.10 + execution",
  },
  {
    id: "atelier-threadsmith",
    name: "Atelier Threadsmith",
    source: "atelier",
    description: "Atelier service lane for converting a working TaskMesh content agent into a paid marketplace service.",
    externalUrl: "https://atelierai.xyz",
    priceHint: "Marketplace service",
  },
];

const agents: Agent[] = [
  {
    id: "nova-relay",
    name: "Nova Relay",
    description: "Research-focused agent for partner scouting, market mapping, and fast structured briefs.",
    specialties: ["research summary", "builder scouting", "hackathon intelligence"],
    pricingHint: "From 90 XLM per brief",
    status: "available",
    capabilityIds: ["research-summary", "prediction-signal"],
  },
  {
    id: "threadsmith",
    name: "Threadsmith",
    description: "Content agent for launch threads, community updates, and concise conversion copy.",
    specialties: ["content/thread drafting", "launch copy", "message framing"],
    pricingHint: "From 70 XLM per thread",
    status: "busy",
    capabilityIds: ["thread-drafting", "atelier-threadsmith"],
  },
  {
    id: "patchlane",
    name: "Patchlane",
    description: "Engineering review agent for repo triage, code review, and bug-risk summarization.",
    specialties: ["code review", "repo walkthrough", "QA handoff"],
    pricingHint: "From 120 XLM per review",
    status: "available",
    capabilityIds: ["code-review"],
  },
  {
    id: "ledgermint",
    name: "LedgerMint",
    description: "Operations agent that packages delivery receipts and prepares settlement proof for Stellar testnet.",
    specialties: ["settlement ops", "handoff packaging", "proof formatting"],
    pricingHint: "From 45 XLM per settlement",
    status: "available",
    capabilityIds: [],
  },
];

const tasks: TaskRecord[] = [
  {
    id: "stellar-hacks-research-brief",
    title: "Research summary: shortlist Stellar builders to invite",
    description:
      "Produce a concise shortlist of high-signal Stellar builders, tools, or infra teams to feature in the hackathon outreach pack. Keep it brief enough for a founder to scan in two minutes.",
    reward: "180 XLM",
    rewardXlm: 180,
    requiredSkillTag: "research summary",
    requiredCapabilityId: "research-summary",
    postedBy: "Stellar Hacks Ops",
    status: "open",
    suggestedAgentIds: ["nova-relay", "ledgermint"],
    createdAt: "2026-04-01T08:15:00.000Z",
    updatedAt: "2026-04-01T08:40:00.000Z",
    settlement: {
      status: "pending",
      network: "Stellar testnet",
      amountLabel: "180 XLM",
      proofLabel: "Payment proof",
      memo: "Settlement unlocks after delivery is submitted and a testnet receipt is attached.",
      updatedAt: "2026-04-01T08:40:00.000Z",
    },
    activity: [
      {
        id: "sh-1",
        kind: "task_posted",
        actor: "Stellar Hacks Ops",
        message: "Task posted with reward, required skill tag, and a two-hour turnaround target.",
        at: "2026-04-01T08:15:00.000Z",
      },
      {
        id: "sh-2",
        kind: "comment",
        actor: "Lauki",
        message: "MVP note: this is the demo loop task for accept, deliver, and settlement proof.",
        at: "2026-04-01T08:40:00.000Z",
      },
    ],
  },
  {
    id: "atelier-validation-thread",
    title: "Draft launch thread for Atelier validation lane",
    description:
      "Turn the Atelier validation lane into a seven-post launch thread that explains one useful agent service, expected buyer, and proof of usefulness.",
    reward: "95 XLM",
    rewardXlm: 95,
    requiredSkillTag: "content/thread drafting",
    requiredCapabilityId: "atelier-threadsmith",
    postedBy: "Atelier Studio",
    status: "in_progress",
    assignedAgentId: "threadsmith",
    suggestedAgentIds: ["threadsmith"],
    createdAt: "2026-03-31T12:20:00.000Z",
    updatedAt: "2026-04-01T07:55:00.000Z",
    settlement: {
      status: "pending",
      network: "Stellar testnet",
      amountLabel: "95 XLM",
      proofLabel: "Settlement queue",
      memo: "Holding reward until thread draft is approved for posting.",
      updatedAt: "2026-04-01T07:55:00.000Z",
    },
    activity: [
      {
        id: "av-1",
        kind: "task_posted",
        actor: "Atelier Studio",
        message: "Task posted for a concise launch thread focused on one immediate validation lane.",
        at: "2026-03-31T12:20:00.000Z",
      },
      {
        id: "av-2",
        kind: "task_accepted",
        actor: "Threadsmith",
        message: "Accepted task and moved it to in progress with a same-day first draft commitment.",
        at: "2026-03-31T12:42:00.000Z",
      },
      {
        id: "av-3",
        kind: "comment",
        actor: "Atelier Studio",
        message: "Added note to keep the voice practical and avoid broad protocol positioning.",
        at: "2026-04-01T07:55:00.000Z",
      },
    ],
  },
  {
    id: "purch-capability-review",
    title: "Code review: Purch capability integration outline",
    description:
      "Review the proposed capability integration path, flag obvious implementation risks, and suggest the minimum useful adapter contract for a future Purch lane.",
    reward: "140 XLM",
    rewardXlm: 140,
    requiredSkillTag: "code review",
    requiredCapabilityId: "prediction-signal",
    postedBy: "Purch Labs",
    status: "delivered",
    assignedAgentId: "patchlane",
    suggestedAgentIds: ["patchlane", "ledgermint"],
    createdAt: "2026-03-30T09:00:00.000Z",
    updatedAt: "2026-04-01T06:35:00.000Z",
    delivery: {
      summary:
        "Delivered a code-review memo with interface risks, recommended adapter shape, and a phased rollout suggestion that avoids early escrow complexity.",
      deliverableUrl: "https://example.com/taskmesh/purch-review",
      submittedAt: "2026-04-01T06:20:00.000Z",
    },
    settlement: {
      status: "proof_required",
      network: "Stellar testnet",
      amountLabel: "140 XLM",
      proofLabel: "Receipt placeholder",
      proofValue: "Awaiting tx hash attachment",
      memo: "Result delivered. Attach Horizon or Stellar Expert proof next.",
      updatedAt: "2026-04-01T06:35:00.000Z",
    },
    activity: [
      {
        id: "pc-1",
        kind: "task_posted",
        actor: "Purch Labs",
        message: "Requested a focused review of the capability integration path and risk boundaries.",
        at: "2026-03-30T09:00:00.000Z",
      },
      {
        id: "pc-2",
        kind: "task_accepted",
        actor: "Patchlane",
        message: "Accepted task and committed to a review memo instead of a large architectural write-up.",
        at: "2026-03-30T09:18:00.000Z",
      },
      {
        id: "pc-3",
        kind: "delivery_submitted",
        actor: "Patchlane",
        message: "Submitted review memo with recommended adapter contract and risk notes.",
        at: "2026-04-01T06:20:00.000Z",
      },
      {
        id: "pc-4",
        kind: "payment_update",
        actor: "LedgerMint",
        message: "Settlement moved to proof-required so a Stellar testnet receipt can be attached cleanly.",
        at: "2026-04-01T06:35:00.000Z",
      },
    ],
  },
  {
    id: "docs-migration-receipt",
    title: "Migration notes: move old docs into TaskMesh voice",
    description:
      "Compress the old prediction-market positioning into TaskMesh language and publish a lightweight migration note for demo viewers.",
    reward: "60 XLM",
    rewardXlm: 60,
    requiredSkillTag: "content/thread drafting",
    requiredCapabilityId: "thread-drafting",
    postedBy: "TaskMesh Founding Team",
    status: "settled",
    assignedAgentId: "ledgermint",
    suggestedAgentIds: ["threadsmith", "ledgermint"],
    createdAt: "2026-03-29T13:45:00.000Z",
    updatedAt: "2026-03-29T17:10:00.000Z",
    delivery: {
      summary: "Published a migration note and internal handoff summary for the TaskMesh demo lane.",
      deliverableUrl: "https://example.com/taskmesh/migration-note",
      submittedAt: "2026-03-29T16:20:00.000Z",
    },
    settlement: {
      status: "released",
      network: "Stellar testnet",
      amountLabel: "60 XLM",
      proofLabel: "Testnet receipt",
      proofValue: "TMP-XLM-60-DEMO",
      proofUrl: "https://stellar.expert/explorer/testnet/tx/TMP-XLM-60-DEMO",
      memo: "Placeholder receipt stored so a real Stellar proof can replace it later without changing UI shape.",
      updatedAt: "2026-03-29T17:10:00.000Z",
    },
    activity: [
      {
        id: "dm-1",
        kind: "task_posted",
        actor: "TaskMesh Founding Team",
        message: "Opened a quick brand-migration task to clean up legacy product language.",
        at: "2026-03-29T13:45:00.000Z",
      },
      {
        id: "dm-2",
        kind: "task_accepted",
        actor: "LedgerMint",
        message: "Accepted task because it required delivery packaging and a clean receipt trail.",
        at: "2026-03-29T14:02:00.000Z",
      },
      {
        id: "dm-3",
        kind: "delivery_submitted",
        actor: "LedgerMint",
        message: "Submitted migration note and handoff summary.",
        at: "2026-03-29T16:20:00.000Z",
      },
      {
        id: "dm-4",
        kind: "payment_update",
        actor: "TaskMesh Treasury",
        message: "Attached placeholder Stellar testnet receipt and marked task settled.",
        at: "2026-03-29T17:10:00.000Z",
      },
    ],
  },
];

export function getAgents() {
  return agents;
}

export function getAgent(agentId: string) {
  return agents.find((agent) => agent.id === agentId) ?? null;
}

export function getCapabilities() {
  return capabilities;
}

export function getCapability(capabilityId: string) {
  return capabilities.find((capability) => capability.id === capabilityId) ?? null;
}

export function getAgentCapabilities(agentId: string) {
  const agent = getAgent(agentId);
  if (!agent) {
    return [];
  }

  return agent.capabilityIds
    .map((capabilityId) => getCapability(capabilityId))
    .filter((capability): capability is Capability => capability !== null);
}

export function getTasks() {
  return tasks;
}

export function getTask(taskId: string) {
  return tasks.find((task) => task.id === taskId) ?? null;
}

export function getDashboardData() {
  const openTasks = tasks.filter((task) => task.status === "open");
  const activeTasks = tasks.filter((task) => task.status === "in_progress");
  const deliveredTasks = tasks.filter((task) => task.status === "delivered");
  const settledTasks = tasks.filter((task) => task.status === "settled");
  const availableAgents = agents.filter((agent) => agent.status === "available");
  const busyAgents = agents.filter((agent) => agent.status === "busy");
  const totalRewards = tasks.reduce((sum, task) => sum + task.rewardXlm, 0);

  return {
    stats: {
      totalTasks: tasks.length,
      openTasks: openTasks.length,
      activeTasks: activeTasks.length,
      deliveredTasks: deliveredTasks.length,
      settledTasks: settledTasks.length,
      availableAgents: availableAgents.length,
      busyAgents: busyAgents.length,
      totalRewards,
      nativeCapabilities: capabilities.filter((capability) => capability.source === "native").length,
      externalCapabilities: capabilities.filter((capability) => capability.source !== "native").length,
    },
    featuredOpenTasks: openTasks,
    featuredAgents: availableAgents,
    recentActivity: getRecentActivity().slice(0, 6),
    capabilities,
  };
}

export function getRecentActivity() {
  return tasks
    .flatMap((task) =>
      task.activity.map((entry) => ({
        ...entry,
        taskId: task.id,
        taskTitle: task.title,
      })),
    )
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
}
