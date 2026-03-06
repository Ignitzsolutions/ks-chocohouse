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
  deliveryFeeAmount: number;
  discountAmount: number;
  totalAmount: number;
};

export type OrderLifecycleState = "draft" | "finalized" | "void";
export type OrderKind = "sale" | "return";
