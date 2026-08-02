import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const recordVisitActivity = vi.fn();
  const dispatchVisitLineWebhookEvents = vi.fn();
  const parseVisitLineWebhookPayload = vi.fn();
  const verifyLineSignature = vi.fn();
  const recordSupportActivity = vi.fn();
  const processSupportRelay = vi.fn();
  const parseSupportRelayPayload = vi.fn();
  const getMainSupabase = vi.fn();

  return {
    recordVisitActivity,
    dispatchVisitLineWebhookEvents,
    parseVisitLineWebhookPayload,
    verifyLineSignature,
    recordSupportActivity,
    processSupportRelay,
    parseSupportRelayPayload,
    getMainSupabase,
    createSupportRelayDependencies: vi.fn(() => ({
      repository: { recordActivity: recordSupportActivity },
    })),
    createVisitLineImageHandler: vi.fn(() => vi.fn()),
    createVisitLineInviteApprovalHandler: vi.fn(() => vi.fn()),
    createVisitLineOfferReplyHandler: vi.fn(() => vi.fn()),
    createVisitLinePostbackHandler: vi.fn(() => vi.fn()),
    createVisitLineTextHandler: vi.fn(() => vi.fn()),
    createLegacyVisitLineImageAdapter: vi.fn(() => ({})),
    createLegacyVisitLineDeliveryAdapter: vi.fn(() => ({})),
    createLegacyVisitLineCardAdapter: vi.fn(() => ({})),
    createLegacyVisitLineActivityAdapter: vi.fn(() => ({ record: recordVisitActivity })),
    createSupabaseConversationLock: vi.fn(() => ({})),
    createLegacyVisitLineWorkflowAdapter: vi.fn(() => ({})),
    createSupabaseVisitSettings: vi.fn(() => ({})),
  };
});

vi.mock("@/lib/line", () => ({ verifyLineSignature: mocks.verifyLineSignature }));
vi.mock("@/lib/visit-line-ui", () => ({ buildDecisionCard: vi.fn(), buildTagQuickReply: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({ buildInviteEmailHtml: vi.fn() }));
vi.mock("@/modules/visit/line-inbound", () => ({
  dispatchVisitLineWebhookEvents: mocks.dispatchVisitLineWebhookEvents,
  parseVisitLineWebhookPayload: mocks.parseVisitLineWebhookPayload,
}));
vi.mock("@/lib/visit-run", () => ({
  endVisitRun: vi.fn(),
  reportVisitStep: vi.fn(),
  saveVisitArtifact: vi.fn(),
  startVisitRun: vi.fn(),
}));
vi.mock("@/modules/visit/line-image-application", () => ({
  createVisitLineImageHandler: mocks.createVisitLineImageHandler,
}));
vi.mock("@/modules/visit/line-invite-approval-application", () => ({
  createVisitLineInviteApprovalHandler: mocks.createVisitLineInviteApprovalHandler,
}));
vi.mock("@/modules/visit/line-offer-application", () => ({
  createVisitLineOfferReplyHandler: mocks.createVisitLineOfferReplyHandler,
}));
vi.mock("@/modules/visit/line-postback-application", () => ({
  createVisitLinePostbackHandler: mocks.createVisitLinePostbackHandler,
}));
vi.mock("@/modules/visit/line-text-application", () => ({
  createVisitLineTextHandler: mocks.createVisitLineTextHandler,
}));
vi.mock("@/adapters/visit/legacy-provider-adapter", () => ({
  legacyVisitProviders: { reviseInviteEmail: vi.fn(), sendEmail: vi.fn() },
}));
vi.mock("@/adapters/visit/legacy-line-adapters", () => ({
  createLegacyVisitLineImageAdapter: mocks.createLegacyVisitLineImageAdapter,
  createLegacyVisitLineDeliveryAdapter: mocks.createLegacyVisitLineDeliveryAdapter,
  createLegacyVisitLineCardAdapter: mocks.createLegacyVisitLineCardAdapter,
  createLegacyVisitLineActivityAdapter: mocks.createLegacyVisitLineActivityAdapter,
}));
vi.mock("@/adapters/subscribers/supabase-subscribers-repository", () => ({
  supabaseSubscribersRepository: { touch: vi.fn() },
}));
vi.mock("@/adapters/conversation/supabase-conversation-lock", () => ({
  createSupabaseConversationLock: mocks.createSupabaseConversationLock,
}));
vi.mock("@/adapters/operations/supabase-operations-repository", () => ({
  supabaseOperationsRepository: {},
}));
vi.mock("@/adapters/visit/legacy-line-workflow-adapter", () => ({
  createLegacyVisitLineWorkflowAdapter: mocks.createLegacyVisitLineWorkflowAdapter,
}));
vi.mock("@/adapters/visit/supabase-visit-settings", () => ({
  createSupabaseVisitSettings: mocks.createSupabaseVisitSettings,
}));

vi.mock("@/lib/supabase", () => ({ getMainSupabase: mocks.getMainSupabase }));
vi.mock("@/adapters/support/support-relay-dependencies", () => ({
  createSupportRelayDependencies: mocks.createSupportRelayDependencies,
}));
vi.mock("@/modules/support/relay", () => ({
  parseSupportRelayPayload: mocks.parseSupportRelayPayload,
  processSupportRelay: mocks.processSupportRelay,
}));

import { POST as postVisitWebhook } from "@/app/api/line/webhook/route";
import { POST as postSupportWebhook } from "@/app/api/line/webhook/support/route";

const originalAppBaseUrl = process.env.APP_BASE_URL;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getMainSupabase.mockReturnValue({});
  mocks.verifyLineSignature.mockReturnValue(true);
  mocks.parseVisitLineWebhookPayload.mockReturnValue({ kind: "valid", events: [] });
  mocks.parseSupportRelayPayload.mockReturnValue({ type: "parsed", events: [] });
});

afterEach(() => {
  if (originalAppBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalAppBaseUrl;
});

describe("LINE webhook route contracts", () => {
  it("rejects a primary webhook before parsing or dispatching when the signature is invalid", async () => {
    mocks.verifyLineSignature.mockReturnValue(false);

    const response = await postVisitWebhook(
      new NextRequest("http://localhost/api/line/webhook", { method: "POST", body: '{"events":[]}' }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "invalid signature" });
    expect(mocks.recordVisitActivity).toHaveBeenCalledWith({
      agent_slug: null,
      summary: "Webhook 收到簽章驗證失敗的請求",
      status: "failed",
    });
    expect(mocks.parseVisitLineWebhookPayload).not.toHaveBeenCalled();
    expect(mocks.dispatchVisitLineWebhookEvents).not.toHaveBeenCalled();
  });

  it("keeps valid primary events at the Visit dispatcher boundary", async () => {
    process.env.APP_BASE_URL = "https://kv.test";
    const events = [{ type: "follow" }];
    mocks.parseVisitLineWebhookPayload.mockReturnValue({ kind: "valid", events });

    const response = await postVisitWebhook(
      new NextRequest("http://localhost/api/line/webhook", {
        method: "POST",
        headers: { "x-line-signature": "valid-primary" },
        body: '{"events":[{"type":"follow"}]}',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.verifyLineSignature).toHaveBeenCalledWith('{"events":[{"type":"follow"}]}', "valid-primary");
    expect(mocks.dispatchVisitLineWebhookEvents).toHaveBeenCalledWith(expect.objectContaining({
      events,
      baseUrl: "https://kv.test",
      fallbackUserId: "未知使用者",
    }));
  });

  it("uses the support signature channel and never relays invalid support requests", async () => {
    mocks.verifyLineSignature.mockReturnValue(false);

    const response = await postSupportWebhook(
      new NextRequest("http://localhost/api/line/webhook/support", { method: "POST", body: '{"events":[]}' }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "invalid signature" });
    expect(mocks.verifyLineSignature).toHaveBeenCalledWith('{"events":[]}', null, "support");
    expect(mocks.recordSupportActivity).toHaveBeenCalledWith({
      summary: "客服 Webhook 收到簽章驗證失敗的請求",
      status: "failed",
    });
    expect(mocks.parseSupportRelayPayload).not.toHaveBeenCalled();
    expect(mocks.processSupportRelay).not.toHaveBeenCalled();
  });

  it("forwards only a parsed, signed support payload to the relay owner", async () => {
    const events = [{ type: "message", message: { type: "text", text: "需要幫忙" } }];
    mocks.parseSupportRelayPayload.mockReturnValue({ type: "parsed", events });

    const response = await postSupportWebhook(
      new NextRequest("http://localhost/api/line/webhook/support", {
        method: "POST",
        headers: { "x-line-signature": "valid-support", "content-type": "application/json; charset=utf-8" },
        body: '{"events":[{"type":"message"}]}',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.processSupportRelay).toHaveBeenCalledWith(expect.objectContaining({
      rawBody: '{"events":[{"type":"message"}]}',
      signature: "valid-support",
      contentType: "application/json; charset=utf-8",
      events,
      ports: expect.any(Object),
    }));
  });
});
