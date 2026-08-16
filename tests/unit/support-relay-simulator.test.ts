import { createHmac, createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSupportRelayDependencies } from "@/adapters/support/support-relay-dependencies";

const scriptPath = fileURLToPath(new URL("../../scripts/support-relay-simulator.mjs", import.meta.url));
const children: ChildProcess[] = [];

async function startSimulator() {
  const child = spawn(process.execPath, [scriptPath], {
    env: {
      ...process.env,
      SUPPORT_RELAY_SIMULATOR_HOST: "127.0.0.1",
      SUPPORT_RELAY_SIMULATOR_PORT: "0",
      SUPPORT_RELAY_SIMULATOR_MODE: "ack",
      SUPPORT_RELAY_SIMULATOR_SECRET: "simulator-secret",
      LINE_SUPPORT_CHANNEL_SECRET: "support-channel-secret",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);

  const ready = await new Promise<{ port: number }>((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`simulator did not start: ${output}`)), 5000);
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      for (const line of output.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.ready) {
            clearTimeout(timeout);
            resolve(parsed);
            return;
          }
        } catch {
          // Wait for the complete JSON line.
        }
      }
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`simulator exited with ${code}: ${output}`));
      }
    });
  });

  return { child, baseUrl: `http://127.0.0.1:${ready.port}` };
}

function relayHeaders(rawBody: string) {
  return {
    "content-type": "application/json",
    "x-line-signature": createHmac("sha256", "support-channel-secret").update(rawBody).digest("base64"),
    "x-kv-support-relay-key": `body:${createHash("sha256").update(rawBody, "utf8").digest("hex")}`,
  };
}

afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    child.kill("SIGTERM");
    await Promise.race([
      once(child, "exit").catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, 1000)),
    ]);
  }
});

describe("support relay simulator", () => {
  it("accepts a valid relay and exposes a protected receipt", async () => {
    const { baseUrl } = await startSimulator();
    const body = JSON.stringify({ events: [{ type: "message", message: { type: "text", text: "acceptance" } }] });

    const response = await fetch(`${baseUrl}/relay`, { method: "POST", headers: relayHeaders(body), body });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      receipt: { eventCount: 1, eventTypes: ["message"], outcome: "received" },
    });

    const unauthorized = await fetch(`${baseUrl}/receipts`);
    expect(unauthorized.status).toBe(401);

    const receipts = await fetch(`${baseUrl}/receipts`, { headers: { "x-simulator-secret": "simulator-secret" } });
    expect(receipts.status).toBe(200);
    await expect(receipts.json()).resolves.toMatchObject({ ok: true, receipts: [{ outcome: "received" }] });
  });

  it("rejects a forged signature before creating a receipt", async () => {
    const { baseUrl } = await startSimulator();
    const body = JSON.stringify({ events: [] });
    const response = await fetch(`${baseUrl}/relay`, {
      method: "POST",
      headers: {
        ...relayHeaders(body),
        "x-line-signature": "forged",
      },
      body,
    });
    expect(response.status).toBe(401);

    const receipts = await fetch(`${baseUrl}/receipts`, { headers: { "x-simulator-secret": "simulator-secret" } });
    await expect(receipts.json()).resolves.toMatchObject({ receipts: [] });
  });

  it("accepts the real Support relay adapter transport", async () => {
    const { baseUrl } = await startSimulator();
    vi.stubEnv("SUPPORT_RELAY_TARGET_URL", `${baseUrl}/relay`);
    const body = JSON.stringify({ events: [{ type: "message", message: { type: "text", text: "adapter acceptance" } }] });
    const signature = createHmac("sha256", "support-channel-secret").update(body).digest("base64");

    await expect(
      createSupportRelayDependencies({} as never).relay.forward({
        rawBody: body,
        signature,
        contentType: "application/json",
      })
    ).resolves.toBeUndefined();

    const receipts = await fetch(`${baseUrl}/receipts`, { headers: { "x-simulator-secret": "simulator-secret" } });
    await expect(receipts.json()).resolves.toMatchObject({
      receipts: [{ eventCount: 1, outcome: "received" }],
    });
  });
});
