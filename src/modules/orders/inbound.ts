import type { NormalizedOrder } from "@/modules/orders/domain";

export function parseOrderPayload(body: unknown): NormalizedOrder | null {
  if (!body || typeof body !== "object") return null;
  const envelope = body as Record<string, unknown>;

  let candidate: Record<string, unknown> | null = null;
  if (isOrderLike(envelope)) candidate = envelope;
  else if (isOrderLike(envelope.order)) candidate = envelope.order as Record<string, unknown>;
  else if (isOrderLike(envelope.data)) candidate = envelope.data as Record<string, unknown>;

  if (candidate) return normalizeOrderCandidate(candidate);
  return parseEnrollmentPayload(envelope);
}

function isOrderLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const order = value as Record<string, unknown>;
  return "id" in order && ("amount" in order || "trade_no" in order || "items" in order);
}

function normalizeOrderCandidate(candidate: Record<string, unknown>): NormalizedOrder {
  const items = Array.isArray(candidate.items)
    ? (candidate.items as Record<string, unknown>[])
    : [];
  const itemNames = items
    .map((item) => (typeof item.name === "string" ? item.name : null))
    .filter((name): name is string => Boolean(name));

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

function parseEnrollmentPayload(envelope: Record<string, unknown>): NormalizedOrder | null {
  if (envelope.type !== "course.student_enroll") return null;
  if (!envelope.data || typeof envelope.data !== "object") return null;

  const data = envelope.data as Record<string, unknown>;
  const course =
    data.course && typeof data.course === "object"
      ? (data.course as Record<string, unknown>)
      : {};
  const user =
    data.user && typeof data.user === "object" ? (data.user as Record<string, unknown>) : {};
  if (typeof course.name !== "string" || typeof user.name !== "string") return null;

  return {
    id: String(data.id ?? ""),
    tradeNo: "",
    amount: 0,
    currency: "TWD",
    userName: user.name,
    userEmail: typeof user.email === "string" ? user.email : "",
    itemNames: [course.name],
    couponCode: null,
    isRefund: false,
    paidAt: typeof data.created_at === "string" ? data.created_at : null,
  };
}
