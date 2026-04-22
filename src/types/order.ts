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

export type PricingBreakdown = {
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstEnabled: boolean;
  gstRatePercent: number;
  gstAmount: number;
  deliveryFeeAmount: number;
  freeDeliveryApplied: boolean;
  totalAmount: number;
};

export type OrderLifecycleState = "draft" | "finalized" | "void";
export type OrderKind = "sale" | "return";
