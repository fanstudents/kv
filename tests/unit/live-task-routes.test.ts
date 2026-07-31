import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createLiveTaskStateRepository, createSupabaseVisitLiveTaskHistoryRepository } = vi.hoisted(() => ({
  createLiveTaskStateRepository: vi.fn(),
  createSupabaseVisitLiveTaskHistoryRepository: vi.fn(),
}));

vi.mock("@/adapters/live-task/live-task-state-repository", () => ({ createLiveTaskStateRepository }));
vi.mock("@/adapters/live-task/supabase-visit-history-repository", () => ({ createSupabaseVisitLiveTaskHistoryRepository }));

import { GET as getLiveTask, POST as postLiveTask } from "@/app/api/live-task/route";
import { GET as getHistory } from "@/app/api/live-task/history/route";
import { GET as getImage } from "@/app/api/live-task/image/route";

function stateRepository(overrides: Record<string, unknown> = {}) {
  return {
    getTaskState: vi.fn(async () => null),
    getCurrentStep: vi.fn(async () => null),
    setState: vi.fn(async () => undefined),
    getImage: vi.fn(async () => null),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  createLiveTaskStateRepository.mockReturnValue(stateRepository());
  createSupabaseVisitLiveTaskHistoryRepository.mockReturnValue({
    listContacts: vi.fn(async () => []), listOffers: vi.fn(async () => []), listInvites: vi.fn(async () => []),
  });
});

describe("Live task route contracts", () => {
  it("keeps inactive and active live-state response shapes", async () => {
    const inactive = await getLiveTask(new NextRequest("http://localhost/api/live-task?agent=visit"));
    await expect(inactive.json()).resolves.toEqual({ active: false });

    createLiveTaskStateRepository.mockReturnValueOnce(stateRepository({
      getTaskState: vi.fn(async () => ({ step: 1, status: "active", caption: "working", hasImage: true, imageVersion: 2, updatedAt: 1700000000000 })),
      getCurrentStep: vi.fn(async () => null),
    }));
    const active = await getLiveTask(new NextRequest("http://localhost/api/live-task?agent=visit"));
    await expect(active.json()).resolves.toEqual({
      active: true, nodeId: null, runId: null, step: 1, status: "active", caption: "working", hasImage: true, imageVersion: 2, updatedAt: 1700000000000,
    });
  });

  it("keeps POST missing-agent and successful state update responses", async () => {
    const missing = await postLiveTask(new NextRequest("http://localhost/api/live-task", { method: "POST", body: "{}" }));
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toEqual({ error: "missing agent" });

    const repository = stateRepository();
    createLiveTaskStateRepository.mockReturnValueOnce(repository);
    const success = await postLiveTask(new NextRequest("http://localhost/api/live-task", {
      method: "POST",
      body: JSON.stringify({ agent: "visit", step: 3, status: "waiting", caption: "waiting" }),
    }));
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ ok: true });
    expect(repository.setState).toHaveBeenCalledWith("visit", { step: 3, status: "waiting", caption: "waiting", image: undefined });
  });

  it("keeps the Visit-only history response", async () => {
    const repository = {
      listContacts: vi.fn(async () => [{ id: "c1", name: "A", company: null, createdAt: "2026-07-31T01:00:00Z" }]),
      listOffers: vi.fn(async () => [{ contactId: "c1", status: "accepted", createdAt: "2026-07-31T02:00:00Z" }]),
      listInvites: vi.fn(async () => []),
    };
    createSupabaseVisitLiveTaskHistoryRepository.mockReturnValueOnce(repository);
    const response = await getHistory(new NextRequest("http://localhost/api/live-task/history?agent=visit"));
    await expect(response.json()).resolves.toEqual({ items: [{ name: "A", company: null, outcome: "已確認", at: "2026-07-31T01:00:00Z" }] });
    expect(repository.listContacts).toHaveBeenCalledWith(8);
  });

  it("keeps body-less image 404 and image response headers", async () => {
    const missing = await getImage(new NextRequest("http://localhost/api/live-task/image?agent=visit"));
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("");

    createLiveTaskStateRepository.mockReturnValueOnce(stateRepository({ getImage: vi.fn(async () => "data:image/png;base64,AAEC") }));
    const image = await getImage(new NextRequest("http://localhost/api/live-task/image?agent=visit"));
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect(image.headers.get("cache-control")).toBe("no-store");
    expect(Array.from(new Uint8Array(await image.arrayBuffer()))).toEqual([0, 1, 2]);
  });
});
