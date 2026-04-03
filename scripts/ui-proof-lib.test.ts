import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { waitForHttpReady } from "./ui-proof-lib";
import { waitForState } from "./ui-proof-runner";

test("waitForHttpReady resolves only after expected text appears", async () => {
  let attempts = 0;
  const progressAttempts: number[] = [];
  const server = http.createServer((_, response) => {
    attempts += 1;
    response.writeHead(200, { "content-type": "text/plain" });
    response.end(attempts >= 3 ? "Generate testnet settlement" : "warming");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  assert(address && typeof address === "object");
  const result = await waitForHttpReady({
    url: `http://127.0.0.1:${address.port}`,
    expectText: "Generate testnet settlement",
    timeoutMs: 5_000,
    intervalMs: 25,
    onProgress: ({ attempts: currentAttempt }) => progressAttempts.push(currentAttempt),
  });

  assert.equal(result.status, 200);
  assert.match(result.body, /Generate testnet settlement/);
  assert(result.attempts >= 3);
  assert(progressAttempts.length >= 2);

  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("waitForHttpReady rejects instead of reporting false ready", async () => {
  const server = http.createServer((_, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("still warming");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  assert(address && typeof address === "object");

  await assert.rejects(
    () =>
      waitForHttpReady({
        url: `http://127.0.0.1:${address.port}`,
        expectText: "Generate testnet settlement",
        timeoutMs: 150,
        intervalMs: 25,
      }),
    /http-ready-timeout/
  );

  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("waitForState waits for a real ready predicate instead of the first value", async () => {
  let value = 0;
  const progressValues: number[] = [];
  const result = await waitForState({
    label: "counter-ready",
    intervalMs: 10,
    timeoutMs: 500,
    read: async () => {
      value += 1;
      return value;
    },
    onProgress: ({ value: currentValue }) => progressValues.push(currentValue),
    ready: (current) => current >= 4,
  });

  assert.equal(result.value, 4);
  assert(result.attempts >= 4);
  assert.deepEqual(progressValues.slice(0, 3), [1, 2, 3]);
});
