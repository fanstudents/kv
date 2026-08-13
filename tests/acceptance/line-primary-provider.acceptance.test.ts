import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createLineAgentTestPushAdapter } from "@/adapters/agents/line-agent-test-push-adapter";
import { getMainSupabase } from "@/lib/supabase";
import { parseAgentTestPushRequest, runAgentTestPush } from "@/modules/agents/test-push";
import { requireStagingMainDatabaseEnvironment } from "../integration/staging-main-db";

const GATE = "LINE_PRIMARY_ACCEPTANCE";
const COMMAND = "npm run acceptance:line:primary";

let activityId: string | null = null;
let recipient = "";
let marker = "";

beforeAll(() => {
  requireStagingMainDatabaseEnvironment(GATE, COMMAND);
  recipient = process.env.LINE_ACCEPTANCE_USER_ID?.trim() ?? "";
  if (!/^U[0-9a-f]{32}$/i.test(recipient)) {
    throw new Error("LINE_ACCEPTANCE_USER_ID must be exactly one allowlisted LINE user ID; no message was sent.");
  }
  if (!process.env.LINE_CHANNEL_ID || !process.env.LINE_CHANNEL_SECRET || !process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error("Primary LINE channel credentials are incomplete; no message was sent.");
  }
  marker = `KV-LINE-ACCEPTANCE-${Date.now()}`;
});

afterAll(async () => {
  if (!activityId) return;
  const { error } = await getMainSupabase().from("line_agent_activity").delete().eq("id", activityId);
  if (error) throw new Error(`LINE acceptance cleanup failed: ${error.message}`);
});

describe.sequential("controlled primary LINE provider acceptance", () => {
  it("sends a readable UTF-8 message and persists then cleans its staging activity", async () => {
    const parsed = parseAgentTestPushRequest("visit", {
      to: recipient,
      text: `[KV Staging Acceptance] Primary LINE channel UTF-8 驗收成功。${marker}`,
      style: "text",
      title: "KV Staging",
      accentColor: "#06C755",
    });
    if (parsed.kind !== "valid") throw new Error(parsed.message);

    const result = await runAgentTestPush(parsed.input, createLineAgentTestPushAdapter());
    expect(result.kind).toBe("success");
    if (result.kind !== "success") throw new Error(result.message);

    activityId = typeof result.activity?.id === "string" ? result.activity.id : null;
    expect(activityId).toBeTruthy();

    const { data, error } = await getMainSupabase()
      .from("line_agent_activity")
      .select("id, agent_slug, status, summary")
      .eq("id", activityId!)
      .single();
    if (error) throw error;
    expect(data).toMatchObject({
      id: activityId,
      agent_slug: "visit",
      status: "success",
    });
  });
});
