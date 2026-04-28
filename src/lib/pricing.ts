import {
  DEFAULT_ADMIN_SETTINGS,
  normalizeAdminSettings,
  type AdminSettings,
} from "@/lib/admin-settings";
import type { AppliedCoupon, BillingLineItem, BuyerGstDetails, PricingBreakdown } from "@/types/order";

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

export function computeDeliveryFee(
  subtotalAmount: number,
  settings: Partial<AdminSettings> | null | undefined = DEFAULT_ADMIN_SETTINGS
) {
  const normalizedSettings = normalizeAdminSettings(settings);
  const safeSubtotal = Math.max(0, Math.round(subtotalAmount));
  const freeDeliveryApplied =
    normalizedSettings.deliveryFeeEnabled &&
    safeSubtotal > 0 &&
    safeSubtotal >= normalizedSettings.freeDeliveryThreshold;
  const deliveryFeeAmount =
    normalizedSettings.deliveryFeeEnabled && safeSubtotal > 0 && !freeDeliveryApplied
      ? normalizedSettings.deliveryFeeAmount
      : 0;

  return {
    deliveryFeeAmount,
    freeDeliveryApplied,
  };
}

export function computePricing(
  subtotalAmount: number,
  discountAmount = 0,
  settings: Partial<AdminSettings> | null | undefined = DEFAULT_ADMIN_SETTINGS,
  options?: {
    forceDeliveryFeeAmount?: number;
    deliveryEnabled?: boolean;
  }
): PricingBreakdown {
  const normalizedSettings = normalizeAdminSettings(settings);
  const safeSubtotal = Math.max(0, Math.round(subtotalAmount));
  const safeDiscount = normalizedSettings.discountEnabled
    ? Math.max(0, Math.min(Math.round(discountAmount), safeSubtotal))
    : 0;
  const taxableAmount = Math.max(0, safeSubtotal - safeDiscount);
  const cgstEnabled = normalizedSettings.gstEnabled && normalizedSettings.cgstEnabled;
  const sgstEnabled = normalizedSettings.gstEnabled && normalizedSettings.sgstEnabled;
  const cgstRatePercent = normalizedSettings.cgstRatePercent;
  const sgstRatePercent = normalizedSettings.sgstRatePercent;
  const cgstAmount = cgstEnabled ? Math.round((taxableAmount * cgstRatePercent) / 100) : 0;
  const sgstAmount = sgstEnabled ? Math.round((taxableAmount * sgstRatePercent) / 100) : 0;
  const delivery =
    options?.forceDeliveryFeeAmount !== undefined
      ? {
          deliveryFeeAmount: Math.max(0, Math.round(options.forceDeliveryFeeAmount)),
          freeDeliveryApplied: Math.max(0, Math.round(options.forceDeliveryFeeAmount)) === 0,
        }
      : options?.deliveryEnabled === false
        ? { deliveryFeeAmount: 0, freeDeliveryApplied: false }
        : computeDeliveryFee(safeSubtotal, normalizedSettings);
  const shippingIgstEnabled =
    normalizedSettings.gstEnabled &&
    normalizedSettings.shippingIgstEnabled &&
    delivery.deliveryFeeAmount > 0;
  const shippingIgstRatePercent = normalizedSettings.shippingIgstRatePercent;
  const shippingIgstAmount = shippingIgstEnabled
    ? Math.round((delivery.deliveryFeeAmount * shippingIgstRatePercent) / 100)
    : 0;
  const gstRatePercent = cgstRatePercent + sgstRatePercent;
  const gstAmount = cgstAmount + sgstAmount + shippingIgstAmount;
  const billingLines: BillingLineItem[] = [
    { key: "subtotal", label: "Subtotal", amount: safeSubtotal, kind: "charge" },
  ];
  if (safeDiscount > 0) {
    billingLines.push({ key: "discount", label: "Discount", amount: safeDiscount, kind: "discount" });
  }
  if (cgstEnabled || sgstEnabled || delivery.deliveryFeeAmount > 0 || shippingIgstEnabled) {
    if (cgstEnabled) {
      billingLines.push({
        key: "cgst",
        label: `CGST (${cgstRatePercent}%)`,
        amount: cgstAmount,
        ratePercent: cgstRatePercent,
        kind: "tax",
      });
    }
    if (sgstEnabled) {
      billingLines.push({
        key: "sgst",
        label: `SGST (${sgstRatePercent}%)`,
        amount: sgstAmount,
        ratePercent: sgstRatePercent,
        kind: "tax",
      });
    }
    if (delivery.deliveryFeeAmount > 0) {
      billingLines.push({
        key: "delivery",
        label: "Shipping / Delivery Fee",
        amount: delivery.deliveryFeeAmount,
        kind: "charge",
      });
    }
    if (shippingIgstEnabled) {
      billingLines.push({
        key: "shippingIgst",
        label: `Shipping IGST (${shippingIgstRatePercent}%)`,
        amount: shippingIgstAmount,
        ratePercent: shippingIgstRatePercent,
        kind: "tax",
      });
    }
  }
  const totalAmount = Math.max(
    0,
    taxableAmount + cgstAmount + sgstAmount + delivery.deliveryFeeAmount + shippingIgstAmount
  );
  billingLines.push({ key: "total", label: "Total", amount: totalAmount, kind: "total" });

  return {
    subtotalAmount: safeSubtotal,
    discountAmount: safeDiscount,
    taxableAmount,
    gstEnabled: cgstEnabled || sgstEnabled || shippingIgstEnabled,
    gstRatePercent,
    gstAmount,
    cgstEnabled,
    cgstRatePercent,
    cgstAmount,
    sgstEnabled,
    sgstRatePercent,
    sgstAmount,
    deliveryFeeAmount: delivery.deliveryFeeAmount,
    deliveryFeeEnabled: normalizedSettings.deliveryFeeEnabled,
    freeDeliveryApplied: delivery.freeDeliveryApplied,
    shippingIgstEnabled,
    shippingIgstRatePercent,
    shippingIgstAmount,
    totalAmount,
    billingLines,
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
