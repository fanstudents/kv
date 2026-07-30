import { describe, expect, it } from "vitest";
import { parseLiveTaskUpdateRequest } from "@/modules/live-task/update-rules";

describe("Live Task update rules", () => {
  it("keeps the existing update coercion and status vocabulary", () => {
    expect(
      parseLiveTaskUpdateRequest({
        agent: "visit",
        step: 3,
        status: "waiting",
        caption: "辨識中",
        image: "data:image/png;base64,AAEC",
      }),
    ).toEqual({
      agentSlug: "visit",
      patch: {
        step: 3,
        status: "waiting",
        caption: "辨識中",
        image: "data:image/png;base64,AAEC",
      },
    });
    expect(parseLiveTaskUpdateRequest({ agent: "visit", status: "other" }).patch.status).toBe("active");
  });

  it("defaults malformed fields without trimming or inventing values", () => {
    expect(parseLiveTaskUpdateRequest(null)).toEqual({
      agentSlug: "",
      patch: { step: 0, status: "active", caption: undefined, image: undefined },
    });
    expect(parseLiveTaskUpdateRequest({ agent: 1, step: "2", caption: 3, image: null })).toEqual({
      agentSlug: "",
      patch: { step: 0, status: "active", caption: undefined, image: undefined },
    });
  });
});
