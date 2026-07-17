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
  if (order.isRefund) {
    return `💸 訂單退款\n\n${order.userName}（${order.userEmail}）\n品項：${itemLine}\n金額：${order.currency} ${order.amount}\n單號：${order.tradeNo}`;
  }
  return `🎉 新訂單成立！\n\n${order.userName}（${order.userEmail}）\n品項：${itemLine}\n金額：${order.currency} ${order.amount}${
    order.couponCode ? `（優惠碼：${order.couponCode}）` : ""
  }\n單號：${order.tradeNo}`;
}
