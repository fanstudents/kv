import { describe, expect, it, vi } from "vitest";
import { runLiveTaskImage } from "@/modules/live-task/image-application";

describe("Live Task image application", () => {
  it("maps missing or malformed images to not-found", async () => {
    const port = { getImage: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce("not-a-data-url") };

    await expect(runLiveTaskImage({ agentSlug: "visit" }, port)).resolves.toEqual({ kind: "not-found" });
    await expect(runLiveTaskImage({ agentSlug: "visit" }, port)).resolves.toEqual({ kind: "not-found" });
  });

  it("returns the data URL descriptor unchanged", async () => {
    const port = { getImage: vi.fn().mockResolvedValue("data:image/png;base64,AAEC") };

    await expect(runLiveTaskImage({ agentSlug: "visit" }, port)).resolves.toEqual({
      kind: "ok",
      contentType: "image/png",
      base64: "AAEC",
    });
    expect(port.getImage).toHaveBeenCalledWith("visit");
  });
});
