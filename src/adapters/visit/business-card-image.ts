import "server-only";

import sharp from "sharp";
import { z } from "zod";

import { createChatCompletion } from "@/adapters/openai/client";

const rotationSchema = z.object({ rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]) });

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function detectBusinessCardRotation(imageDataUrl: string): Promise<0 | 90 | 180 | 270> {
  const response = await createChatCompletion(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "只判斷名片照片需要順時針旋轉幾度，印刷文字才會水平且由左至右可讀。" +
            "只能回傳 JSON：{\"rotation\":0}，數字只能是 0、90、180、270。不要辨識名片欄位。",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "這張名片需要順時針旋轉幾度？" },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    },
    { operation: "名片方向判斷", agentSlug: "visit" },
  );

  const parsed = rotationSchema.safeParse(parseJson(response.choices[0]?.message.content ?? "{}"));
  return parsed.success ? parsed.data.rotation : 0;
}

export async function rotateBusinessCardDataUrl(
  imageDataUrl: string,
  rotation: 0 | 90 | 180 | 270,
): Promise<string> {
  if (rotation === 0) return imageDataUrl;
  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(imageDataUrl);
  if (!match) return imageDataUrl;

  const [, contentType, base64] = match;
  const rotated = await sharp(Buffer.from(base64, "base64")).rotate(rotation).toBuffer();
  return `data:${contentType};base64,${rotated.toString("base64")}`;
}

export async function prepareBusinessCardImage(imageDataUrl: string): Promise<string> {
  const rotation = await detectBusinessCardRotation(imageDataUrl);
  return rotateBusinessCardDataUrl(imageDataUrl, rotation);
}
