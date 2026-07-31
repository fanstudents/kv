import { describe, expect, it, vi } from "vitest";

const runtimeFns = vi.hoisted(() => ({
  startVisitRun: vi.fn(),
  reportVisitStep: vi.fn(),
  endVisitRun: vi.fn(),
  saveVisitArtifact: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/visit-run", () => runtimeFns);

import { createLegacyVisitRuntimeAdapter } from "@/adapters/visit/legacy-runtime-adapter";

describe("legacy Visit runtime adapter", () => {
  it("keeps the existing Visit runtime facade bindings", async () => {
    const adapter = createLegacyVisitRuntimeAdapter();
    const report = { userId: "line-1", nodeId: "scan", step: 0, status: "active" as const };
    const end = { userId: "line-1", status: "failed" as const, summary: "failed" };
    const artifact = { userId: "line-1", title: "mail", content: "body" };

    await adapter.startVisitRun({ userId: "line-1", messageId: "message-1" });
    await adapter.reportVisitStep(report);
    await adapter.endVisitRun(end);
    await adapter.saveVisitArtifact(artifact);

    expect(runtimeFns.startVisitRun).toHaveBeenCalledWith({ userId: "line-1", messageId: "message-1" });
    expect(runtimeFns.reportVisitStep).toHaveBeenCalledWith(report);
    expect(runtimeFns.endVisitRun).toHaveBeenCalledWith(end);
    expect(runtimeFns.saveVisitArtifact).toHaveBeenCalledWith(artifact);
  });
});
