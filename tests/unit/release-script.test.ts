import { describe, expect, it, vi } from "vitest";
import {
  commitsMatch,
  databaseUrlMatchesProject,
  verifyRemoteRelease,
} from "../../scripts/release.mjs";

describe("release command contracts", () => {
  it("accepts full and abbreviated forms of the same commit", () => {
    expect(commitsMatch("1234567890abcdef", "1234567")).toBe(true);
    expect(commitsMatch("1234567", "1234567890abcdef")).toBe(true);
    expect(commitsMatch("1234567", "abcdef0")).toBe(false);
  });

  it("matches direct and pooler database URLs to the approved project ref", () => {
    expect(databaseUrlMatchesProject(
      "postgresql://postgres:secret@db.projectref.supabase.co:5432/postgres",
      "projectref",
    )).toBe(true);
    expect(databaseUrlMatchesProject(
      "postgresql://postgres.projectref:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
      "projectref",
    )).toBe(true);
    expect(databaseUrlMatchesProject(
      "postgresql://postgres.otherref:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
      "projectref",
    )).toBe(false);
  });

  it("accepts a remote release only when version and readiness match", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        commit: "1234567890abcdef",
        schemaVersion: "20260814164718",
        environment: "staging",
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok" })));

    await expect(verifyRemoteRelease({
      baseUrl: "https://staging.example.com/",
      expected: {
        commit: "1234567",
        schemaVersion: "20260814164718",
        environment: "staging",
      },
      fetchImpl,
    })).resolves.toMatchObject({ health: { status: "ok" } });
  });

  it("blocks promotion when the deployed schema identity differs", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        commit: "1234567890abcdef",
        schemaVersion: "wrong-schema",
        environment: "staging",
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok" })));

    await expect(verifyRemoteRelease({
      baseUrl: "https://staging.example.com",
      expected: {
        commit: "1234567",
        schemaVersion: "20260814164718",
        environment: "staging",
      },
      fetchImpl,
    })).rejects.toThrow("Remote schema version does not match release schema");
  });
});
