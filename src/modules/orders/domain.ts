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
