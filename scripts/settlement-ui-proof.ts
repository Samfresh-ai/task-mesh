import { join } from "node:path";

import { runUiProof, waitForState, type UiProofRuntime } from "./ui-proof-runner";

const browserEndpoint = "http://127.0.0.1:18800";
const taskUrl = "http://127.0.0.1:3000/tasks/purch-capability-review";
const outputDir = join(process.cwd(), "runtime-proof", "settlement-ui");
const screenshotPath = join(outputDir, "settlement-ui-proof.png");
const proofPath = join(outputDir, "settlement-ui-proof.json");

type SettlementPageState = {
  href: string;
  title: string;
  hydrated: boolean;
  buttonText: string | null;
  buttonDisabled: boolean;
  settlementText: string;
  statusBadge?: string | null;
  message?: string | null;
  proofHash?: string | null;
  proofLink?: string | null;
};

const pageStateExpression = `(() => {
  const button = [...document.querySelectorAll("button")].find((entry) => /Generate testnet settlement|Generating/i.test(entry.textContent || ""));
  const settlementSection = [...document.querySelectorAll("section")].find((entry) => (entry.textContent || "").includes("Settlement adapter surface"));
  const settlementText = settlementSection?.innerText || "";
  const proofLink = settlementSection?.querySelector('a[href*="stellar.expert/explorer/testnet/tx/"]');
  const proofHashMatch = settlementText.match(/[A-Fa-f0-9]{64}/);
  const settlementMessageMatch = settlementText.match(/Live Stellar testnet settlement proof attached\\.?/i);
  const statusBadge = settlementSection?.querySelector("span");
  const buttonKeys = button ? Object.keys(button) : [];

  return {
    href: window.location.href,
    title: document.title,
    hydrated: buttonKeys.some((key) => key.startsWith("__reactProps$") || key.startsWith("__reactFiber$")),
    buttonText: button ? button.textContent?.trim() || "" : null,
    buttonDisabled: button ? button.disabled : true,
    settlementText,
    statusBadge: statusBadge ? statusBadge.textContent?.trim() || "" : null,
    proofHash: proofHashMatch ? proofHashMatch[0] : null,
    proofLink: proofLink ? proofLink.getAttribute("href") || "" : null,
    message: settlementMessageMatch ? settlementMessageMatch[0].trim() : null
  };
})()`;

const readPageState = async (runtime: UiProofRuntime): Promise<SettlementPageState> =>
  runtime.session.send<{
    result: {
      value?: SettlementPageState;
    };
  }>("Runtime.evaluate", {
    expression: pageStateExpression,
    returnByValue: true,
  }).then(
    (result) =>
      result.result.value ?? {
        href: "",
        title: "",
        hydrated: false,
        buttonText: null,
        buttonDisabled: true,
        settlementText: "",
        statusBadge: null,
        message: null,
        proofHash: null,
        proofLink: null,
      }
  );

runUiProof({
  browserEndpoint,
  appRoot: process.cwd(),
  port: 3000,
  taskUrl,
  screenshotPath,
  proofPath,
  readinessChecks: [
    {
      url: taskUrl,
      expectText: "Generate testnet settlement",
    },
    {
      url: "http://127.0.0.1:3000/api/stellar/testnet-settlement",
      expectText: "\"ok\":true",
      timeoutMs: 10_000,
    },
  ],
  prepare: async (runtime) => {
    await runtime.session.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1024,
      deviceScaleFactor: 1,
      mobile: false,
    });
  },
  waitForReady: async (runtime) =>
    waitForState({
      label: "settlement-page-ready",
      read: () => readPageState(runtime),
      onProgress: ({ attempts, elapsedMs, value }) =>
        runtime.reportProgress(
          `waiting for settlement page hydration (attempt=${attempts} elapsedMs=${elapsedMs} button=${value.buttonText ?? "none"} hydrated=${value.hydrated})`
        ),
      ready: (value) =>
        value.href === runtime.taskUrl &&
        value.hydrated === true &&
        value.buttonText === "Generate testnet settlement" &&
        value.buttonDisabled === false &&
        value.settlementText.includes("Awaiting tx hash attachment"),
    }).then((result) => ({ elapsedMs: result.elapsedMs })),
  performProof: async (runtime) => {
    runtime.reportProgress("clicking Generate testnet settlement", true);
    await runtime.session.send("Runtime.evaluate", {
      expression: `(() => {
        const button = [...document.querySelectorAll("button")].find((entry) => /Generate testnet settlement/i.test(entry.textContent || ""));
        if (!button) {
          throw new Error("settlement-button-missing");
        }
        button.click();
        return true;
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    const settled = await waitForState({
      label: "settlement-proof-visible",
      timeoutMs: 30_000,
      intervalMs: 500,
      read: () => readPageState(runtime),
      onProgress: ({ attempts, elapsedMs, value }) =>
        runtime.reportProgress(
          `waiting for settlement proof in DOM (attempt=${attempts} elapsedMs=${elapsedMs} status=${value.statusBadge ?? "none"} proofHash=${value.proofHash ? "present" : "missing"})`
        ),
      ready: (value) =>
        typeof value.message === "string" &&
        /Live Stellar testnet settlement proof attached/i.test(value.message) &&
        Boolean(value.proofLink?.includes("stellar.expert/explorer/testnet/tx/")) &&
        Boolean(value.proofHash?.match(/[A-Fa-f0-9]{64}/)),
    });
    return { elapsedMs: settled.elapsedMs };
  },
  captureFinal: async (runtime) =>
    runtime.session.send<{
      result: {
        value?: {
          title: string;
          url: string;
          bodyText: string;
        };
      };
    }>("Runtime.evaluate", {
      expression: `(() => ({
        title: document.title,
        url: window.location.href,
        bodyText: document.body ? document.body.innerText : ""
      }))()`,
      returnByValue: true,
    }).then((result) => result.result.value ?? null),
});
