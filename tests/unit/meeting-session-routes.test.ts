import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createMeetingSessionRepository } = vi.hoisted(() => ({
  createMeetingSessionRepository: vi.fn(),
}));

vi.mock("@/adapters/meeting/meeting-session-repository", () => ({
  createMeetingSessionRepository,
}));

import { POST as finishMeeting } from "@/app/api/meeting/finish/route";
import { POST as logMeetingTurn } from "@/app/api/meeting/log-turn/route";
import { GET as getMeetingRecording } from "@/app/api/meeting/recording/route";
import { POST as startMeeting } from "@/app/api/meeting/start/route";

beforeEach(() => vi.clearAllMocks());

describe("Meeting session route contracts", () => {
  it("keeps start's create-failure response", async () => {
    createMeetingSessionRepository.mockReturnValue({ create: vi.fn(async () => null) });

    const response = await startMeeting(
      new NextRequest("http://localhost/api/meeting/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("keeps finish's missing-meeting guard before repository calls", async () => {
    createMeetingSessionRepository.mockReturnValue({});

    const response = await finishMeeting(
      new NextRequest("http://localhost/api/meeting/finish", { method: "POST", body: new FormData() })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    expect(createMeetingSessionRepository).toHaveBeenCalledTimes(1);
  });

  it("keeps turn-log's invalid JSON payload guard", async () => {
    createMeetingSessionRepository.mockReturnValue({});

    const response = await logMeetingTurn(
      new NextRequest("http://localhost/api/meeting/log-turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    expect(createMeetingSessionRepository).toHaveBeenCalledTimes(1);
  });

  it("keeps recording's missing-id guard", async () => {
    createMeetingSessionRepository.mockReturnValue({});

    const response = await getMeetingRecording(new NextRequest("http://localhost/api/meeting/recording"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    expect(createMeetingSessionRepository).toHaveBeenCalledTimes(1);
  });
});
