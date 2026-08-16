import { beforeEach, describe, expect, it, vi } from "vitest";

const { createChatCompletion } = vi.hoisted(() => ({ createChatCompletion: vi.fn() }));

vi.mock("@/adapters/openai/client", () => ({ createChatCompletion }));

import {
  detectBusinessCardRotation,
  prepareBusinessCardImage,
  rotateBusinessCardDataUrl,
} from "@/adapters/visit/business-card-image";

beforeEach(() => vi.clearAllMocks());

describe("business card image orientation", () => {
  it("uses a low-detail orientation-only request", async () => {
    createChatCompletion.mockResolvedValue({ choices: [{ message: { content: '{"rotation":270}' } }] });

    await expect(detectBusinessCardRotation("data:image/png;base64,abc")).resolves.toBe(270);
    expect(createChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              expect.objectContaining({ type: "image_url", image_url: expect.objectContaining({ detail: "low" }) }),
            ]),
          }),
        ]),
      }),
      { operation: "名片方向判斷", agentSlug: "visit" },
    );
  });

  it("falls back to zero for malformed model output", async () => {
    createChatCompletion.mockResolvedValue({ choices: [{ message: { content: '{"rotation":45}' } }] });

    await expect(detectBusinessCardRotation("data:image/png;base64,abc")).resolves.toBe(0);
  });

  it("does not decode or rewrite an already upright image", async () => {
    const image = "data:image/png;base64,abc";
    createChatCompletion.mockResolvedValue({ choices: [{ message: { content: '{"rotation":0}' } }] });

    await expect(prepareBusinessCardImage(image)).resolves.toBe(image);
    await expect(rotateBusinessCardDataUrl(image, 0)).resolves.toBe(image);
  });
});
