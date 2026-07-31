import { describe, expect, it } from "vitest";
import { buildAgentStatusMap } from "@/modules/agents/status-rules";

describe("buildAgentStatusMap", () => {
  const catalog = [
    { slug: "active", status: "active" },
    { slug: "draft", status: "draft" },
  ];

  it("lets database rows override catalog defaults and keeps unknown rows", () => {
    expect(
      buildAgentStatusMap(catalog, [
        { slug: "active", enabled: 0 },
        { slug: "external", enabled: "yes" },
      ]),
    ).toEqual({ active: false, external: true, draft: false });
  });

  it("uses static catalog status when no rows are available", () => {
    expect(buildAgentStatusMap(catalog, null)).toEqual({ active: true, draft: false });
  });
});
