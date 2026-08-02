import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const crawlSource = { kind: "firecrawl-knowledge-source" };
  return {
    crawlSource,
    createFirecrawlKnowledgeSource: vi.fn(() => crawlSource),
    recheckKnowledgeSources: vi.fn(),
  };
});

vi.mock("@/adapters/knowledge-base/firecrawl-knowledge-source", () => ({
  createFirecrawlKnowledgeSource: mocks.createFirecrawlKnowledgeSource,
}));
vi.mock("@/modules/knowledge-base/crawl-source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/knowledge-base/crawl-source")>()),
  recheckKnowledgeSources: mocks.recheckKnowledgeSources,
}));

import { GET as getKnowledgeBaseRecheck } from "@/app/api/cron/kb-recheck/route";

const originalCronSecret = process.env.CRON_SECRET;

function request(secret?: string) {
  return new NextRequest("http://localhost/api/cron/kb-recheck", {
    headers: secret ? { "x-cron-key": secret } : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
  mocks.recheckKnowledgeSources.mockResolvedValue({
    ok: true,
    checked: 2,
    changed: [{ sourceId: "source-1", url: "https://example.com", staleDocs: 3 }],
  });
});

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

describe("knowledge-base recheck cron route contracts", () => {
  it("fails closed before constructing a Firecrawl source when the cron secret is missing or wrong", async () => {
    const missing = await getKnowledgeBaseRecheck(request());
    expect(missing.status).toBe(503);
    await expect(missing.json()).resolves.toEqual({ error: "server misconfigured: CRON_SECRET not set" });

    process.env.CRON_SECRET = "cron-secret";
    const wrong = await getKnowledgeBaseRecheck(request("wrong-secret"));
    expect(wrong.status).toBe(401);
    await expect(wrong.json()).resolves.toEqual({ error: "unauthorized" });

    expect(mocks.createFirecrawlKnowledgeSource).not.toHaveBeenCalled();
    expect(mocks.recheckKnowledgeSources).not.toHaveBeenCalled();
  });

  it("returns the authorized recheck result without widening the source boundary", async () => {
    process.env.CRON_SECRET = "cron-secret";

    const response = await getKnowledgeBaseRecheck(request("cron-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      checked: 2,
      changed: [{ sourceId: "source-1", url: "https://example.com", staleDocs: 3 }],
    });
    expect(mocks.recheckKnowledgeSources).toHaveBeenCalledWith(mocks.crawlSource);
  });
});
