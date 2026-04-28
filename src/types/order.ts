export type BuyerGstDetails = {
  businessName: string;
  gstin: string;
  billingAddress: string;
};

export type AppliedCoupon = {
  code: string;
  label: string;
  discountType: "flat" | "percent";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
};

export type BillingLineItem = {
  key: "subtotal" | "discount" | "cgst" | "sgst" | "delivery" | "shippingIgst" | "total";
  label: string;
  amount: number;
  ratePercent?: number;
  kind: "charge" | "discount" | "tax" | "total";
};

export type PricingBreakdown = {
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstEnabled: boolean;
  gstRatePercent: number;
  gstAmount: number;
  cgstEnabled: boolean;
  cgstRatePercent: number;
  cgstAmount: number;
  sgstEnabled: boolean;
  sgstRatePercent: number;
  sgstAmount: number;
  deliveryFeeAmount: number;
  deliveryFeeEnabled: boolean;
  freeDeliveryApplied: boolean;
  shippingIgstEnabled: boolean;
  shippingIgstRatePercent: number;
  shippingIgstAmount: number;
  totalAmount: number;
  billingLines: BillingLineItem[];
};

export type OrderLifecycleState = "draft" | "finalized" | "void";
export type OrderKind = "sale" | "return";
