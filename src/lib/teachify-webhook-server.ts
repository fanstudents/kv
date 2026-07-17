import "server-only";
import crypto from "node:crypto";
import type { NormalizedOrder } from "@/lib/teachify-orders";

// Teachify 的 webhook payload 格式尚未 100% 確認，這裡採防禦性寫法：
// 不管訂單物件是直接送過來，還是包在 { order: {...} } / { data: {...} } / { event, order } 裡，
// 都嘗試找出來；找不到就回傳 null，讓呼叫端記錄原始 payload 以便之後對照調整。
export function parseOrderPayload(body: unknown): NormalizedOrder | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  let candidate: Record<string, unknown> | null = null;
  if (isOrderLike(b)) candidate = b;
  else if (isOrderLike(b.order)) candidate = b.order as Record<string, unknown>;
  else if (isOrderLike(b.data)) candidate = b.data as Record<string, unknown>;

  if (!candidate) return null;

  const items = Array.isArray(candidate.items) ? (candidate.items as Record<string, unknown>[]) : [];
  const itemNames = items
    .map((it) => (typeof it.name === "string" ? it.name : null))
    .filter((n): n is string => Boolean(n));

  return {
    id: String(candidate.id ?? ""),
    tradeNo: String(candidate.trade_no ?? candidate.tradeNo ?? ""),
    amount: Number(candidate.amount ?? 0),
    currency: String(candidate.currency ?? "TWD"),
    userName: String(candidate.user_name ?? candidate.userName ?? "（未提供姓名）"),
    userEmail: String(candidate.user_email ?? candidate.userEmail ?? ""),
    itemNames: itemNames.length > 0 ? itemNames : ["（未提供品項名稱）"],
    couponCode: typeof candidate.coupon_code === "string" ? candidate.coupon_code : null,
    isRefund: Boolean(candidate.refund) || candidate.status === "refunded",
    paidAt: typeof candidate.paid_at === "string" ? candidate.paid_at : null,
  };
}

function isOrderLike(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return "id" in o && ("amount" in o || "trade_no" in o || "items" in o);
}

// 若有設定 TEACHIFY_WEBHOOK_SECRET，會嘗試用 HMAC-SHA256 驗證簽章。
// 目前 Teachify 實際的簽章 header 名稱與演算法尚未跟平台文件核對過，
// 沒設定密鑰時會直接放行（並在呼叫端記錄成「未驗證」），待確認後再收緊。
export function verifyTeachifyWebhook(rawBody: string, signatureHeader: string | null): "ok" | "unverified" | "invalid" {
  const secret = process.env.TEACHIFY_WEBHOOK_SECRET;
  if (!secret) return "unverified";
  if (!signatureHeader) return "invalid";

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return "invalid";
  return crypto.timingSafeEqual(a, b) ? "ok" : "invalid";
}
