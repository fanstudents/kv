import { z } from "zod";

/**
 * The only cross-workflow setting shared by the current report/test-preview
 * consumers. It describes LINE presentation, not workflow policy.
 */
export const pushStyleSchema = z.enum(["text", "flex", "confirm", "buttons"]);

export type PushStyle = z.infer<typeof pushStyleSchema>;

export const PUSH_STYLE_DEFAULT: PushStyle = "flex";
