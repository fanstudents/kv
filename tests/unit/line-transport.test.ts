import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  pushLineMessage,
  replyLineMessage,
  verifyLineSignature,
} from "@/lib/line";

const LINE_ENV = [
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_SUPPORT_CHANNEL_SECRET",
  "LINE_SUPPORT_CHANNEL_ACCESS_TOKEN",
] as const;

const originalEnvironment = Object.fromEntries(LINE_ENV.map((name) => [name, process.env[name]]));

function restoreEnvironment() {
  for (const name of LINE_ENV) {
    const value = originalEnvironment[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function signature(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
}

afterEach(() => {
  restoreEnvironment();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LINE transport", () => {
  it("keeps primary and support webhook signatures isolated", () => {
    const body = '{"events":[]}';
    process.env.LINE_CHANNEL_SECRET = "primary-secret";
    process.env.LINE_SUPPORT_CHANNEL_SECRET = "support-secret";

    expect(verifyLineSignature(body, signature(body, "primary-secret"))).toBe(true);
    expect(verifyLineSignature(body, signature(body, "support-secret"))).toBe(false);
    expect(verifyLineSignature(body, signature(body, "support-secret"), "support")).toBe(true);
    expect(verifyLineSignature(body, null, "support")).toBe(false);
  });

  it("fails closed before transport when a channel token is missing", async () => {
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(pushLineMessage("U-primary", "hello")).rejects.toThrow('Missing LINE access token for channel "primary"');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends primary push payloads with the primary channel token", async () => {
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "primary-token";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await pushLineMessage("U-primary", "hello");

    expect(fetchMock).toHaveBeenCalledWith("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer primary-token",
      },
      body: JSON.stringify({
        to: "U-primary",
        messages: [{ type: "text", text: "hello" }],
      }),
    });
  });

  it("uses the support token for reply payloads and preserves provider failures", async () => {
    process.env.LINE_SUPPORT_CHANNEL_ACCESS_TOKEN = "support-token";
    const fetchMock = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(replyLineMessage("reply-support", "客服您好", "support")).rejects.toThrow(
      "LINE reply failed (429): rate limited",
    );
    expect(fetchMock).toHaveBeenCalledWith("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer support-token",
      },
      body: JSON.stringify({
        replyToken: "reply-support",
        messages: [{ type: "text", text: "客服您好" }],
      }),
    });
  });
});
