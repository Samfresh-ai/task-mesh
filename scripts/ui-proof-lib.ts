import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export type HttpReadyResult = {
  attempts: number;
  elapsedMs: number;
  status: number;
  body: string;
};

export async function waitForHttpReady(input: {
  url: string;
  expectText?: string;
  timeoutMs?: number;
  intervalMs?: number;
  onProgress?: (state: {
    url: string;
    attempts: number;
    elapsedMs: number;
    lastError: string;
  }) => void;
}): Promise<HttpReadyResult> {
  const timeoutMs = input.timeoutMs ?? 30_000;
  const intervalMs = input.intervalMs ?? 500;
  const startedAt = Date.now();
  let attempts = 0;
  let lastError = "not-started";

  while (Date.now() - startedAt < timeoutMs) {
    attempts += 1;
    try {
      const response = await fetch(input.url, {
        headers: {
          "cache-control": "no-cache",
        },
      });
      const body = await response.text();
      if (response.ok && (!input.expectText || body.includes(input.expectText))) {
        return {
          attempts,
          elapsedMs: Date.now() - startedAt,
          status: response.status,
          body,
        };
      }
      lastError = `http-${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    input.onProgress?.({
      url: input.url,
      attempts,
      elapsedMs: Date.now() - startedAt,
      lastError,
    });
    await delay(intervalMs);
  }

  throw new Error(`http-ready-timeout:${input.url}:${lastError}`);
}

export function spawnManagedServer(input: {
  cwd: string;
  port: number;
}): {
  child: ChildProcessByStdio<null, Readable, Readable>;
  getLogTail(): string;
  stop(): Promise<void>;
} {
  const logLines: string[] = [];
  const nextBinary = join(input.cwd, "node_modules", ".bin", "next");
  const child = spawn(nextBinary, ["start", "-p", String(input.port)], {
    cwd: input.cwd,
    env: {
      ...process.env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const capture = (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    logLines.push(...text.split(/\r?\n/).filter(Boolean));
    if (logLines.length > 120) {
      logLines.splice(0, logLines.length - 120);
    }
  };

  child.stdout.on("data", capture);
  child.stderr.on("data", capture);

  return {
    child,
    getLogTail: () => logLines.join("\n"),
    stop: async () => {
      if (child.exitCode !== null || child.killed) {
        return;
      }
      child.kill("SIGTERM");
      await Promise.race([
        new Promise<void>((resolve) => child.once("exit", () => resolve())),
        delay(3_000).then(() => {
          if (child.exitCode === null && !child.killed) {
            child.kill("SIGKILL");
          }
        }),
      ]);
    },
  };
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeBase64File(path: string, base64: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(base64, "base64"));
}
