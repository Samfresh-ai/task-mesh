import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { taskToBountyRecord, type BountyRecord } from "@/lib/bounty-domain";
import { getTasks } from "@/lib/taskmesh-data";

type StoredBountyPayload = {
  version: 1;
  updatedAt: string;
  bounties: BountyRecord[];
};

export type BountyStoreStatus = {
  backend: "json_file";
  filePath: string;
  initializedFromSeed: boolean;
  updatedAt: string;
  bountyCount: number;
};

const STORE_VERSION = 1;
const defaultStorePath = path.join(process.cwd(), ".taskmesh", "bounties.json");

let cachedPayload: StoredBountyPayload | null = null;
let initializedFromSeed = false;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getStorePath() {
  const configuredPath = process.env.TASKMESH_BOUNTY_STORE_PATH?.trim();
  return configuredPath ? path.resolve(configuredPath) : defaultStorePath;
}

function seedPayload(): StoredBountyPayload {
  initializedFromSeed = true;

  return {
    version: STORE_VERSION,
    updatedAt: new Date().toISOString(),
    bounties: getTasks().map((task) => taskToBountyRecord(task)),
  };
}

function ensureStoreDirectory(filePath: string) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function writePayload(payload: StoredBountyPayload) {
  const filePath = getStorePath();
  ensureStoreDirectory(filePath);
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function readPayload(): StoredBountyPayload {
  const filePath = getStorePath();

  if (!existsSync(filePath)) {
    const payload = seedPayload();
    writePayload(payload);
    return payload;
  }

  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<StoredBountyPayload>;

  if (parsed.version !== STORE_VERSION || !Array.isArray(parsed.bounties)) {
    throw new Error(`Invalid bounty store payload in ${filePath}. Remove the file to reseed it.`);
  }

  initializedFromSeed = false;

  return {
    version: STORE_VERSION,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    bounties: parsed.bounties,
  };
}

function getPayload() {
  if (!cachedPayload) {
    cachedPayload = readPayload();
  }

  return cachedPayload;
}

function persistBounties(bounties: BountyRecord[]) {
  const payload: StoredBountyPayload = {
    version: STORE_VERSION,
    updatedAt: new Date().toISOString(),
    bounties: clone(bounties),
  };

  cachedPayload = payload;
  writePayload(payload);

  return clone(payload);
}

export function listStoredBounties() {
  return clone(getPayload().bounties);
}

export function getStoredBounty(id: string) {
  const bounty = getPayload().bounties.find((entry) => entry.id === id);
  return bounty ? clone(bounty) : null;
}

export function saveStoredBounty(bounty: BountyRecord) {
  const current = getPayload().bounties;
  const existingIndex = current.findIndex((entry) => entry.id === bounty.id);
  const next = existingIndex === -1 ? [clone(bounty), ...current] : current.map((entry, index) => (index === existingIndex ? clone(bounty) : entry));

  persistBounties(next);

  return clone(bounty);
}

export function getBountyStoreStatus(): BountyStoreStatus {
  const payload = getPayload();

  return {
    backend: "json_file",
    filePath: getStorePath(),
    initializedFromSeed,
    updatedAt: payload.updatedAt,
    bountyCount: payload.bounties.length,
  };
}
