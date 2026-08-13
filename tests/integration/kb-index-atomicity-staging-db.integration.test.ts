import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database, Json } from "@/lib/database.types";
import {
  createStagingMainDatabaseClient,
  requireStagingMainDatabaseEnvironment,
} from "./staging-main-db";

const docId = `codex-kb-atomicity:${randomUUID()}`;
const embedding: number[] = Array.from({ length: 1536 }, (_, index) => (index === 0 ? 1 : 0));
let stagingClient: SupabaseClient<Database> | null = null;

function chunk(index: number, content: string, vector = embedding): Json {
  return {
    doc_id: docId,
    chunk_index: index,
    title: "Codex KB atomicity fixture",
    content,
    level: 1,
    source_page: null,
    token_estimate: content.length,
    embedding: JSON.stringify(vector),
  };
}

beforeAll(async () => {
  const environment = requireStagingMainDatabaseEnvironment(
    "KB_INDEX_STAGING_DB_ACCEPTANCE",
    "npm run test:integration:kb-index:staging",
  );
  stagingClient = createStagingMainDatabaseClient(environment);

  const { error } = await stagingClient.from("kb_chunks").insert({
    doc_id: docId,
    chunk_index: 0,
    title: "Codex KB atomicity fixture",
    content: "previous searchable index",
    level: 1,
    token_estimate: 25,
    embedding: JSON.stringify(embedding),
  });
  if (error) throw new Error(`KB atomicity fixture setup failed: ${error.message}`);
});

afterAll(async () => {
  if (!stagingClient) return;
  const { error } = await stagingClient.from("kb_chunks").delete().eq("doc_id", docId);
  if (error) throw new Error(`KB atomicity fixture cleanup failed: ${error.message}`);
});

describe.sequential("Knowledge Base atomic index replacement on staging Main DB", () => {
  it("rolls the deletion back when any replacement chunk is invalid", async () => {
    const client = stagingClient;
    if (!client) throw new Error("KB atomicity fixture did not initialize");

    const { error } = await client.rpc("replace_kb_chunks", {
      p_doc_ids: [docId],
      p_chunks: [chunk(0, "invalid replacement", [0.1])],
    });
    expect(error).not.toBeNull();

    const { data, error: readError } = await client
      .from("kb_chunks")
      .select("chunk_index,content")
      .eq("doc_id", docId);
    expect(readError).toBeNull();
    expect(data).toEqual([{ chunk_index: 0, content: "previous searchable index" }]);
  });

  it("replaces the previous index as one complete set", async () => {
    const client = stagingClient;
    if (!client) throw new Error("KB atomicity fixture did not initialize");

    const { data: replacedCount, error } = await client.rpc("replace_kb_chunks", {
      p_doc_ids: [docId],
      p_chunks: [chunk(0, "replacement chunk one"), chunk(1, "replacement chunk two")],
    });
    expect(error).toBeNull();
    expect(replacedCount).toBe(2);

    const { data, error: readError } = await client
      .from("kb_chunks")
      .select("chunk_index,content")
      .eq("doc_id", docId)
      .order("chunk_index");
    expect(readError).toBeNull();
    expect(data).toEqual([
      { chunk_index: 0, content: "replacement chunk one" },
      { chunk_index: 1, content: "replacement chunk two" },
    ]);
  });
});
