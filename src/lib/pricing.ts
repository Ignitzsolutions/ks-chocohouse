import type { AppliedCoupon, BuyerGstDetails, PricingBreakdown } from "@/types/order";

export const DEFAULT_DELIVERY_FEE = 120;

export type CouponValidationResult = {
  valid: boolean;
  reason?: string;
  coupon: AppliedCoupon | null;
  discountAmount: number;
};

type CouponInput = AppliedCoupon & {
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  active?: boolean;
};

export function computeDeliveryFee(subtotalAmount: number) {
  return subtotalAmount > 0 ? DEFAULT_DELIVERY_FEE : 0;
}

export function computePricing(
  subtotalAmount: number,
  discountAmount = 0,
  deliveryFeeAmount = computeDeliveryFee(subtotalAmount)
): PricingBreakdown {
  const safeSubtotal = Math.max(0, Math.round(subtotalAmount));
  const safeDelivery = Math.max(0, Math.round(deliveryFeeAmount));
  const safeDiscount = Math.max(0, Math.min(Math.round(discountAmount), safeSubtotal + safeDelivery));
  return {
    subtotalAmount: safeSubtotal,
    deliveryFeeAmount: safeDelivery,
    discountAmount: safeDiscount,
    totalAmount: Math.max(0, safeSubtotal + safeDelivery - safeDiscount),
  };
}

export function normalizeCouponCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

export function normalizeBuyerGst(value: unknown): BuyerGstDetails | null {
  const raw = (value ?? {}) as Record<string, unknown>;
  const businessName = String(raw.businessName ?? "").trim();
  const gstin = String(raw.gstin ?? "").trim().toUpperCase();
  const billingAddress = String(raw.billingAddress ?? "").trimEnd();
  if (!businessName && !gstin && !billingAddress) {
    return null;
  }
  return {
    businessName,
    gstin,
    billingAddress,
  };
}

export function validateCouponForSubtotal(
  coupon: CouponInput | null,
  subtotalAmount: number,
  nowIso = new Date().toISOString()
): CouponValidationResult {
  if (!coupon) {
    return { valid: false, reason: "Coupon not found", coupon: null, discountAmount: 0 };
  }

  if (coupon.active === false) {
    return { valid: false, reason: "Coupon is inactive", coupon: null, discountAmount: 0 };
  }

  if (coupon.startsAt && coupon.startsAt > nowIso) {
    return { valid: false, reason: "Coupon is not active yet", coupon: null, discountAmount: 0 };
  }

  if (coupon.expiresAt && coupon.expiresAt < nowIso) {
    return { valid: false, reason: "Coupon has expired", coupon: null, discountAmount: 0 };
  }

  const minOrderAmount = Math.max(0, Math.round(coupon.minOrderAmount));
  if (Math.round(subtotalAmount) < minOrderAmount) {
    return {
      valid: false,
      reason: `Minimum order amount is ₹${minOrderAmount}`,
      coupon: null,
      discountAmount: 0,
    };
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    coupon.usedCount !== null &&
    coupon.usedCount !== undefined &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    return { valid: false, reason: "Coupon usage limit reached", coupon: null, discountAmount: 0 };
  }

  let discountAmount = 0;
  if (coupon.discountType === "percent") {
    discountAmount = Math.round((Math.max(0, subtotalAmount) * coupon.discountValue) / 100);
  } else {
    discountAmount = Math.round(coupon.discountValue);
  }

  if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
    discountAmount = Math.min(discountAmount, Math.max(0, Math.round(coupon.maxDiscountAmount)));
  }

  const normalizedCoupon: AppliedCoupon = {
    code: normalizeCouponCode(coupon.code),
    label: coupon.label,
    discountType: coupon.discountType,
    discountValue: Math.round(coupon.discountValue),
    minOrderAmount,
    maxDiscountAmount:
      coupon.maxDiscountAmount === null || coupon.maxDiscountAmount === undefined
        ? null
        : Math.max(0, Math.round(coupon.maxDiscountAmount)),
  };

  return {
    valid: true,
    coupon: normalizedCoupon,
    discountAmount: Math.max(0, Math.min(Math.round(discountAmount), Math.max(0, subtotalAmount))),
  };
}
