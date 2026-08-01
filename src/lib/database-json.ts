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

/** Matches JSON request serialization before a generated Supabase Json-column write. */
export function normalizeDatabaseJson(value: unknown, fallback: Json = {}): Json {
  const candidate = value ?? fallback;
  if (isDatabaseJson(candidate)) return candidate;

  const serialized = JSON.stringify(candidate);
  if (serialized === undefined) return fallback;
  const normalized: unknown = JSON.parse(serialized);
  if (!isDatabaseJson(normalized)) throw new Error("Database JSON value must be serializable");
  return normalized;
}
