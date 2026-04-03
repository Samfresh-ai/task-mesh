import { setTimeout as delay } from "node:timers/promises";

import { spawnManagedServer, waitForHttpReady, writeBase64File, writeJson } from "./ui-proof-lib";

type PendingRequest = {
  resolve(value: unknown): void;
  reject(error: Error): void;
};

export class CdpSession {
  private readonly pending = new Map<number, PendingRequest>();
  private nextId = 0;

  private constructor(private readonly socket: WebSocket) {
    this.socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        error?: { message?: string };
        result?: unknown;
      };
      if (typeof message.id !== "number") {
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
        return;
      }
      pending.resolve(message.result);
    };
  }

  static async connect(wsUrl: string): Promise<CdpSession> {
    const socket = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`cdp-connect-timeout:${wsUrl}`)), 5_000);
      socket.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      socket.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`cdp-connect-failed:${wsUrl}`));
      };
    });
    return new CdpSession(socket);
  }

  async send<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close(): void {
    this.socket.close();
  }
}

export const waitForState = async <T>(input: {
  label: string;
  timeoutMs?: number;
  intervalMs?: number;
  read(): Promise<T>;
  ready(value: T): boolean;
  onProgress?: (state: {
    label: string;
    attempts: number;
    elapsedMs: number;
    value: T;
  }) => void;
}): Promise<{ value: T; elapsedMs: number; attempts: number }> => {
  const timeoutMs = input.timeoutMs ?? 20_000;
  const intervalMs = input.intervalMs ?? 350;
  const startedAt = Date.now();
  let attempts = 0;
  let lastValue: T | undefined;
  while (Date.now() - startedAt < timeoutMs) {
    attempts += 1;
    lastValue = await input.read();
    if (input.ready(lastValue)) {
      return {
        value: lastValue,
        elapsedMs: Date.now() - startedAt,
        attempts,
      };
    }
    input.onProgress?.({
      label: input.label,
      attempts,
      elapsedMs: Date.now() - startedAt,
      value: lastValue,
    });
    await delay(intervalMs);
  }
  throw new Error(`${input.label}-timeout:${JSON.stringify(lastValue)}`);
};

export type UiProofRuntime = {
  session: CdpSession;
  targetId: string;
  taskUrl: string;
  screenshotPath: string;
  timings: Record<string, number>;
  startedAt: number;
  reportProgress(message: string): void;
};

export type UiProofReadinessCheck = {
  url: string;
  expectText: string;
  timeoutMs?: number;
  intervalMs?: number;
};

export type UiProofConfig = {
  browserEndpoint: string;
  appRoot: string;
  port: number;
  taskUrl: string;
  screenshotPath: string;
  proofPath: string;
  readinessChecks: UiProofReadinessCheck[];
  prepare?(runtime: UiProofRuntime): Promise<void>;
  waitForReady(runtime: UiProofRuntime): Promise<{ elapsedMs: number }>;
  performProof(runtime: UiProofRuntime): Promise<{ elapsedMs: number }>;
  captureFinal(runtime: UiProofRuntime): Promise<unknown>;
};

const createProgressReporter = (label: string, intervalMs = 4_000) => {
  let lastEmission = 0;
  return (message: string, force = false) => {
    const now = Date.now();
    if (!force && now - lastEmission < intervalMs) {
      return;
    }
    lastEmission = now;
    process.stderr.write(`[${label}] ${message}\n`);
  };
};

export async function runUiProof(config: UiProofConfig): Promise<void> {
  const timings: Record<string, number> = {};
  const startedAt = Date.now();
  let managedServer: ReturnType<typeof spawnManagedServer> | null = null;
  const reportProgress = createProgressReporter("ui-proof");

  reportProgress(`starting proof for ${config.taskUrl}`, true);

  const existingServerReady = await Promise.allSettled(
    config.readinessChecks.map((check) =>
      waitForHttpReady({
        url: check.url,
        expectText: check.expectText,
        timeoutMs: check.timeoutMs ?? 1_200,
        intervalMs: check.intervalMs ?? 300,
        onProgress: ({ attempts, elapsedMs, lastError }) =>
          reportProgress(`waiting for existing server readiness at ${check.url} (attempt=${attempts} elapsedMs=${elapsedMs} lastError=${lastError})`),
      })
    )
  );

  const reusedServer = existingServerReady.every((result) => result.status === "fulfilled");

  if (!reusedServer) {
    reportProgress(`starting managed server on port ${config.port}`, true);
    managedServer = spawnManagedServer({
      cwd: config.appRoot,
      port: config.port,
    });
    for (const check of config.readinessChecks) {
      await waitForHttpReady({
        url: check.url,
        expectText: check.expectText,
        timeoutMs: check.timeoutMs ?? 30_000,
        intervalMs: check.intervalMs ?? 500,
        onProgress: ({ attempts, elapsedMs, lastError }) =>
          reportProgress(`waiting for managed server readiness at ${check.url} (attempt=${attempts} elapsedMs=${elapsedMs} lastError=${lastError})`),
      }).catch(async (error) => {
        const logTail = managedServer?.getLogTail() ?? "";
        await managedServer?.stop();
        throw new Error(`task-server-start-failed:${error instanceof Error ? error.message : String(error)}\n${logTail}`);
      });
    }
  } else {
    reportProgress(`reusing existing healthy server on port ${config.port}`, true);
  }

  timings.serverReadyMs = Date.now() - startedAt;
  reportProgress(`server ready in ${timings.serverReadyMs}ms`, true);

  const version = await fetch(`${config.browserEndpoint}/json/version`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`browser-endpoint-unavailable:${response.status}`);
    }
    return response.json() as Promise<{ Browser?: string }>;
  });
  timings.browserEndpointMs = Date.now() - startedAt;
  reportProgress(`browser endpoint reachable in ${timings.browserEndpointMs}ms`, true);

  const created = await fetch(`${config.browserEndpoint}/json/new?about:blank`, {
    method: "PUT",
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`browser-new-target-failed:${response.status}`);
    }
    return response.json() as Promise<{ id: string; webSocketDebuggerUrl: string }>;
  });

  const session = await CdpSession.connect(created.webSocketDebuggerUrl);
  const runtime: UiProofRuntime = {
    session,
    targetId: created.id,
    taskUrl: config.taskUrl,
    screenshotPath: config.screenshotPath,
    timings,
    startedAt,
    reportProgress: (message: string) => reportProgress(message),
  };

  try {
    reportProgress(`opened browser target ${created.id}`, true);
    await session.send("Page.enable");
    await session.send("Runtime.enable");
    await session.send("Network.enable");
    await session.send("Page.setLifecycleEventsEnabled", { enabled: true });
    await config.prepare?.(runtime);
    reportProgress(`navigating browser to ${config.taskUrl}`, true);
    await session.send("Page.navigate", { url: config.taskUrl });

    const ready = await config.waitForReady(runtime);
    timings.pageReadyMs = ready.elapsedMs;
    reportProgress(`page ready in ${timings.pageReadyMs}ms`, true);

    const proof = await config.performProof(runtime);
    timings.proofStepMs = proof.elapsedMs;
    reportProgress(`proof step completed in ${timings.proofStepMs}ms`, true);

    const screenshot = await session.send<{ data: string }>("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    });
    await writeBase64File(config.screenshotPath, screenshot.data);
    reportProgress(`screenshot captured at ${config.screenshotPath}`, true);

    const finalSnapshot = await config.captureFinal(runtime);

    const result = {
      ok: true,
      browser: version.Browser ?? null,
      reusedServer,
      managedServerStarted: Boolean(managedServer),
      timings,
      screenshotPath: config.screenshotPath,
      finalSnapshot,
      capturedAt: new Date().toISOString(),
    };
    await writeJson(config.proofPath, result);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    reportProgress(`proof failed: ${error instanceof Error ? error.message : String(error)}`, true);
    const failure = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      capturedAt: new Date().toISOString(),
    };
    await writeJson(config.proofPath, failure).catch(() => undefined);
    console.error(JSON.stringify(failure, null, 2));
    process.exitCode = 1;
  } finally {
    session.close();
    await fetch(`${config.browserEndpoint}/json/close/${created.id}`).catch(() => undefined);
    if (managedServer) {
      reportProgress(`stopping managed server on port ${config.port}`, true);
      await managedServer.stop();
    }
    reportProgress(`closed browser target ${created.id}`, true);
  }

  if (process.exitCode && process.exitCode !== 0) {
    process.exit(process.exitCode);
  }
}
