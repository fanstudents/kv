import type { Json } from "@/lib/database.types";

/** Narrows unknown application payloads before writing generated Supabase Json columns. */
export function isDatabaseJson(value: unknown): value is Json {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) return value.every(isDatabaseJson);
  if (typeof value !== "object") return false;

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(value).every(isDatabaseJson);
}
