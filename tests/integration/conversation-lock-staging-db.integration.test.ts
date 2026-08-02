import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseConversationLock } from "@/adapters/conversation/supabase-conversation-lock";
import type { Database } from "@/lib/database.types";
import {
  createStagingMainDatabaseClient,
  requireStagingMainDatabaseEnvironment,
} from "./staging-main-db";

const FIXTURE_PREFIX = "codex-lock-staging-db:";
const lifecycleUserId = `${FIXTURE_PREFIX}lifecycle:${randomUUID()}`;
const raceUserId = `${FIXTURE_PREFIX}race:${randomUUID()}`;
let stagingClient: SupabaseClient<Database> | null = null;

beforeAll(() => {
  const environment = requireStagingMainDatabaseEnvironment(
    "CONVERSATION_LOCK_STAGING_DB_ACCEPTANCE",
    "npm run test:integration:conversation-lock:staging",
  );
  stagingClient = createStagingMainDatabaseClient(environment);
});

afterAll(async () => {
  if (!stagingClient) return;
  const { error } = await stagingClient
    .from("line_conversation_locks")
    .delete()
    .in("line_user_id", [lifecycleUserId, raceUserId]);
  if (error) throw new Error(`Conversation lock staging cleanup failed: ${error.message}`);
});

describe("Conversation lock staging Main DB behavior", () => {
  it("preserves one owner across renewal, contention, expiry takeover, and release", async () => {
    const client = stagingClient;
    if (!client) throw new Error("Conversation lock staging fixture did not initialize");
    const lock = createSupabaseConversationLock();

    await expect(lock.acquire(lifecycleUserId, "visit", {
      ttlMinutes: 9,
      context: { stage: "card_review" },
    })).resolves.toEqual({ ok: true });
    await expect(lock.acquire(lifecycleUserId, "visit", {
      ttlMinutes: 10,
      context: { stage: "approval" },
    })).resolves.toEqual({ ok: true });
    await expect(lock.acquire(lifecycleUserId, "support"))
      .resolves.toEqual({ ok: false, heldBy: "visit" });

    const { error: expireError } = await client
      .from("line_conversation_locks")
      .update({ expires_at: "2026-08-01T00:00:00.000Z" })
      .eq("line_user_id", lifecycleUserId);
    expect(expireError).toBeNull();
    await expect(lock.acquire(lifecycleUserId, "support", {
      context: { stage: "takeover" },
    })).resolves.toEqual({ ok: true });

    await lock.release(lifecycleUserId, "visit");
    const { data: ownedBySupport, error: ownerReadError } = await client
      .from("line_conversation_locks")
      .select("owner_agent_slug,context")
      .eq("line_user_id", lifecycleUserId)
      .single();
    expect(ownerReadError).toBeNull();
    expect(ownedBySupport).toEqual({ owner_agent_slug: "support", context: { stage: "takeover" } });

    await lock.release(lifecycleUserId, "support");
    const { count, error: releaseReadError } = await client
      .from("line_conversation_locks")
      .select("line_user_id", { count: "exact", head: true })
      .eq("line_user_id", lifecycleUserId);
    expect(releaseReadError).toBeNull();
    expect(count).toBe(0);
  });

  it("allows exactly one winner when different owners acquire a missing row concurrently", async () => {
    const lock = createSupabaseConversationLock();
    const outcomes = await Promise.all([
      lock.acquire(raceUserId, "visit"),
      lock.acquire(raceUserId, "support"),
    ]);

    const winners = outcomes.filter((outcome) => outcome.ok);
    const blocked = outcomes.filter((outcome) => !outcome.ok);
    expect(winners).toHaveLength(1);
    expect(blocked).toHaveLength(1);
    if (!blocked[0]?.ok) {
      expect(["visit", "support"]).toContain(blocked[0].heldBy);
    }
  });
});
