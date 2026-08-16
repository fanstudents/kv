import { describe, expect, it } from "vitest";
import { AGENT_LIVE_TASKS } from "@/lib/agent-briefings";

describe("Visit live briefing projection", () => {
  it("uses the runtime research step ids and shows the optional fallback clearly", () => {
    const nodes = AGENT_LIVE_TASKS.visit.flow.flatMap((column) => column.nodes);
    const byId = new Map(nodes.map((node) => [node.id, node]));

    expect([...byId.keys()]).toEqual(expect.arrayContaining([
      "research-search",
      "research-firecrawl",
      "research-store",
    ]));
    expect(byId.get("research-search")).toMatchObject({
      label: "搜尋公開背景",
      app: "openai",
    });
    expect(byId.get("research-store")).toMatchObject({
      label: "保存研究摘要",
      kind: "store",
    });
    expect(byId.get("research-firecrawl")).toMatchObject({
      branch: "查不到公司簡介才走",
      app: "firecrawl",
    });
    expect(byId.get("research-firecrawl")?.detail).toContain("搜尋缺少公司簡介時才啟用");
  });
});
