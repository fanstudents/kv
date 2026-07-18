import crypto from "node:crypto";

// 後台登入用的輕量 session：用 AUTH_SECRET 對 payload 做 HMAC-SHA256 簽章，
// 存在 httpOnly cookie。不依賴外部服務，適合單一管理者的內部控制台。
export const SESSION_COOKIE = "kv_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

export function createSessionToken(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET environment variable");

  const payload = Buffer.from(JSON.stringify({ iat: Date.now(), exp: Date.now() + SESSION_TTL_MS })).toString(
    "base64url"
  );
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return false;

  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && Date.now() < exp;
  } catch {
    return false;
  }
}

// 定值時間比對密碼：先各自雜湊成固定長度再比對，避免長度或提前結束造成的旁路。
export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const hash = (s: string) => crypto.createHash("sha256").update(s, "utf8").digest();
  return crypto.timingSafeEqual(hash(input), hash(expected));
}

export const SESSION_MAX_AGE = SESSION_TTL_MS / 1000;
