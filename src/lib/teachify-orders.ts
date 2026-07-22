// 純資料處理，不含伺服器專用邏輯，安全供 client 端（設定頁預覽）使用。

export interface NormalizedOrder {
  id: string;
  tradeNo: string;
  amount: number;
  currency: string;
  userName: string;
  userEmail: string;
  itemNames: string[];
  couponCode: string | null;
  isRefund: boolean;
  paidAt: string | null;
}

export function formatOrderText(order: NormalizedOrder): string {
  const itemLine = order.itemNames.join("、");
  // 沒有單號通常代表這筆是從「選課」事件補進來的（Teachify 目前這類事件沒附金額），
  // 如實告知缺少金流明細，不要顯示看起來像真的、其實是預設值的「TWD 0」。
  const hasPaymentDetail = Boolean(order.tradeNo);
  const amountLine = hasPaymentDetail
    ? `金額：${order.currency} ${order.amount}${order.couponCode ? `（優惠碼：${order.couponCode}）` : ""}\n單號：${order.tradeNo}`
    : "（此通知來自選課紀錄，Teachify 未提供金額與單號明細）";

  if (order.isRefund) {
    return `💸 訂單退款\n\n${order.userName}（${order.userEmail}）\n品項：${itemLine}\n${amountLine}`;
  }
  return `🎉 新訂單成立！\n\n${order.userName}（${order.userEmail}）\n品項：${itemLine}\n${amountLine}`;
}
