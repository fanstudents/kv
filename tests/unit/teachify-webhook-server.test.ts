import { afterEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

import { verifyTeachifyWebhook } from "@/lib/teachify-webhook-server";

const originalSecret = process.env.TEACHIFY_WEBHOOK_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.TEACHIFY_WEBHOOK_SECRET;
  else process.env.TEACHIFY_WEBHOOK_SECRET = originalSecret;
});

describe("Teachify webhook signature contract", () => {
  it("keeps the existing unverified fallback when no secret is configured", () => {
    delete process.env.TEACHIFY_WEBHOOK_SECRET;

    expect(verifyTeachifyWebhook('{"id":"synthetic-order"}', null)).toBe("unverified");
  });

  it("accepts the deterministic HMAC-SHA256 fixture", () => {
    const rawBody = '{"id":"codex-teachify-acceptance","amount":1680}';
    process.env.TEACHIFY_WEBHOOK_SECRET = "fixture-secret";
    const signature = createHmac("sha256", "fixture-secret").update(rawBody).digest("hex");

    expect(verifyTeachifyWebhook(rawBody, signature)).toBe("ok");
  });

  it("rejects missing, malformed, and mismatched signatures when verification is enabled", () => {
    const rawBody = '{"id":"codex-teachify-acceptance"}';
    process.env.TEACHIFY_WEBHOOK_SECRET = "fixture-secret";

    expect(verifyTeachifyWebhook(rawBody, null)).toBe("invalid");
    expect(verifyTeachifyWebhook(rawBody, "wrong")).toBe("invalid");
    expect(verifyTeachifyWebhook(rawBody, "0".repeat(64))).toBe("invalid");
  });
});
