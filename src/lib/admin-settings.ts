import type Database from "better-sqlite3";

export const ADMIN_SETTINGS_ID = "primary";
export const DEFAULT_GST_RATE_PERCENT = 18;
export const DEFAULT_CGST_RATE_PERCENT = 9;
export const DEFAULT_SGST_RATE_PERCENT = 9;
export const DEFAULT_IGST_AMOUNT = 0;
export const DEFAULT_DELIVERY_FEE_AMOUNT = 120;
export const DEFAULT_FREE_DELIVERY_THRESHOLD = 1500;

export type AdminSettings = {
  discountEnabled: boolean;
  gstEnabled: boolean;
  gstRatePercent: number;
  cgstEnabled: boolean;
  cgstRatePercent: number;
  sgstEnabled: boolean;
  sgstRatePercent: number;
  deliveryFeeEnabled: boolean;
  deliveryFeeAmount: number;
  freeDeliveryThreshold: number;
  shippingIgstEnabled: boolean;
  shippingIgstRatePercent: number;
  shippingIgstAmount: number;
  splashEnabled: boolean;
  splashImageSrc: string;
  updatedAt?: string | null;
};

type AdminSettingsRow = {
  id: string;
  discount_enabled?: number;
  gst_enabled: number;
  gst_rate_percent: number;
  cgst_enabled?: number;
  cgst_rate_percent?: number;
  sgst_enabled?: number;
  sgst_rate_percent?: number;
  delivery_fee_enabled?: number;
  delivery_fee_amount: number;
  free_delivery_threshold: number;
  shipping_igst_enabled?: number;
  shipping_igst_rate_percent?: number;
  shipping_igst_amount?: number;
  splash_enabled?: number;
  splash_image_src?: string | null;
  updated_at: string | null;
};

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  discountEnabled: true,
  gstEnabled: true,
  gstRatePercent: DEFAULT_GST_RATE_PERCENT,
  cgstEnabled: true,
  cgstRatePercent: DEFAULT_CGST_RATE_PERCENT,
  sgstEnabled: true,
  sgstRatePercent: DEFAULT_SGST_RATE_PERCENT,
  deliveryFeeEnabled: true,
  deliveryFeeAmount: DEFAULT_DELIVERY_FEE_AMOUNT,
  freeDeliveryThreshold: DEFAULT_FREE_DELIVERY_THRESHOLD,
  shippingIgstEnabled: false,
  shippingIgstRatePercent: 0,
  shippingIgstAmount: DEFAULT_IGST_AMOUNT,
  splashEnabled: false,
  splashImageSrc: "",
  updatedAt: null,
};

function clampCurrency(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Number(parsed.toFixed(2)));
}

function clampPercent(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Number(parsed.toFixed(2))));
}

export function normalizeAdminSettings(value: Partial<AdminSettings> | null | undefined): AdminSettings {
  const fallbackGstRate = clampPercent(value?.gstRatePercent, DEFAULT_ADMIN_SETTINGS.gstRatePercent);
  const cgstRatePercent = clampPercent(
    value?.cgstRatePercent,
    fallbackGstRate / 2
  );
  const sgstRatePercent = clampPercent(
    value?.sgstRatePercent,
    Math.max(0, fallbackGstRate - cgstRatePercent)
  );
  return {
    discountEnabled: value?.discountEnabled ?? DEFAULT_ADMIN_SETTINGS.discountEnabled,
    gstEnabled: value?.gstEnabled ?? DEFAULT_ADMIN_SETTINGS.gstEnabled,
    gstRatePercent: Math.min(100, cgstRatePercent + sgstRatePercent),
    cgstEnabled: value?.cgstEnabled ?? value?.gstEnabled ?? DEFAULT_ADMIN_SETTINGS.cgstEnabled,
    cgstRatePercent,
    sgstEnabled: value?.sgstEnabled ?? value?.gstEnabled ?? DEFAULT_ADMIN_SETTINGS.sgstEnabled,
    sgstRatePercent,
    deliveryFeeEnabled: value?.deliveryFeeEnabled ?? DEFAULT_ADMIN_SETTINGS.deliveryFeeEnabled,
    deliveryFeeAmount: clampCurrency(
      value?.deliveryFeeAmount,
      DEFAULT_ADMIN_SETTINGS.deliveryFeeAmount
    ),
    freeDeliveryThreshold: clampCurrency(
      value?.freeDeliveryThreshold,
      DEFAULT_ADMIN_SETTINGS.freeDeliveryThreshold
    ),
    shippingIgstEnabled: value?.shippingIgstEnabled ?? DEFAULT_ADMIN_SETTINGS.shippingIgstEnabled,
    shippingIgstRatePercent: clampPercent(value?.shippingIgstRatePercent, 0),
    shippingIgstAmount: clampCurrency(
      value?.shippingIgstAmount,
      DEFAULT_ADMIN_SETTINGS.shippingIgstAmount
    ),
    splashEnabled: value?.splashEnabled ?? DEFAULT_ADMIN_SETTINGS.splashEnabled,
    splashImageSrc: String(value?.splashImageSrc ?? DEFAULT_ADMIN_SETTINGS.splashImageSrc).trim(),
    updatedAt: value?.updatedAt ?? null,
  };
}

export function mapAdminSettingsRow(row: AdminSettingsRow | undefined): AdminSettings {
  if (!row) return DEFAULT_ADMIN_SETTINGS;
  return normalizeAdminSettings({
    discountEnabled: row.discount_enabled === undefined ? true : Number(row.discount_enabled ?? 0) === 1,
    gstEnabled: Number(row.gst_enabled ?? 0) === 1,
    gstRatePercent: Number(row.gst_rate_percent ?? DEFAULT_GST_RATE_PERCENT),
    cgstEnabled: row.cgst_enabled === undefined ? Number(row.gst_enabled ?? 0) === 1 : Number(row.cgst_enabled ?? 0) === 1,
    cgstRatePercent: Number(row.cgst_rate_percent ?? DEFAULT_CGST_RATE_PERCENT),
    sgstEnabled: row.sgst_enabled === undefined ? Number(row.gst_enabled ?? 0) === 1 : Number(row.sgst_enabled ?? 0) === 1,
    sgstRatePercent: Number(row.sgst_rate_percent ?? DEFAULT_SGST_RATE_PERCENT),
    deliveryFeeEnabled: row.delivery_fee_enabled === undefined ? true : Number(row.delivery_fee_enabled ?? 0) === 1,
    deliveryFeeAmount: Number(row.delivery_fee_amount ?? DEFAULT_DELIVERY_FEE_AMOUNT),
    freeDeliveryThreshold: Number(
      row.free_delivery_threshold ?? DEFAULT_FREE_DELIVERY_THRESHOLD
    ),
    shippingIgstEnabled: row.shipping_igst_enabled === undefined ? false : Number(row.shipping_igst_enabled ?? 0) === 1,
    shippingIgstRatePercent: Number(row.shipping_igst_rate_percent ?? 0),
    shippingIgstAmount: Number(row.shipping_igst_amount ?? DEFAULT_IGST_AMOUNT),
    splashEnabled: row.splash_enabled === undefined ? false : Number(row.splash_enabled ?? 0) === 1,
    splashImageSrc: row.splash_image_src ?? "",
    updatedAt: row.updated_at ?? null,
  });
}

export function getAdminSettings(db: Database.Database) {
  const row = db
    .prepare(
      `SELECT id, discount_enabled, gst_enabled, gst_rate_percent, cgst_enabled, cgst_rate_percent,
              sgst_enabled, sgst_rate_percent, delivery_fee_enabled, delivery_fee_amount,
              free_delivery_threshold, shipping_igst_enabled, shipping_igst_rate_percent,
              shipping_igst_amount, splash_enabled, splash_image_src, updated_at
       FROM admin_settings
       WHERE id = ?
       LIMIT 1`
    )
    .get(ADMIN_SETTINGS_ID) as AdminSettingsRow | undefined;

  return mapAdminSettingsRow(row);
}
