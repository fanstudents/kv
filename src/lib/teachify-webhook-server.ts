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

  if (candidate) {
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

  // 實測發現 Teachify 目前實際送來的不是訂單事件，而是「選課」事件
  // （type: "course.student_enroll"，資料在 data.course / data.user 底下，
  // 沒有 amount / trade_no / coupon_code）。比對 Teachify 訂單 API 後確認：
  // 這個事件的 data.created_at 跟對應訂單的 paid_at 精確對上，代表它確實是
  // 「付款完成」當下觸發的，只是 Teachify 沒有把金額明細放進這個事件的 payload。
  // 所以先讓它也能觸發通知（沒有金額總比整個漏掉訂單好），欄位留白並在文案裡
  // 如實說明，而不是編造金額。只認這個明確事件名稱，避免其他不明的
  // course.* 事件（例如課程資料異動）被誤判成新訂單而亂發通知。
  return parseEnrollmentPayload(b);
}

function isOrderLike(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return "id" in o && ("amount" in o || "trade_no" in o || "items" in o);
}

function parseEnrollmentPayload(b: Record<string, unknown>): NormalizedOrder | null {
  if (b.type !== "course.student_enroll") return null;
  if (!b.data || typeof b.data !== "object") return null;
  const d = b.data as Record<string, unknown>;
  const course = d.course && typeof d.course === "object" ? (d.course as Record<string, unknown>) : {};
  const user = d.user && typeof d.user === "object" ? (d.user as Record<string, unknown>) : {};
  if (typeof course.name !== "string" || typeof user.name !== "string") return null;

  return {
    id: String(d.id ?? ""),
    tradeNo: "",
    amount: 0,
    currency: "TWD",
    userName: user.name,
    userEmail: typeof user.email === "string" ? user.email : "",
    itemNames: [course.name],
    couponCode: null,
    isRefund: false,
    paidAt: typeof d.created_at === "string" ? d.created_at : null,
  };
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
