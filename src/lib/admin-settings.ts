import type Database from "better-sqlite3";

export const ADMIN_SETTINGS_ID = "primary";
export const DEFAULT_GST_RATE_PERCENT = 18;
export const DEFAULT_DELIVERY_FEE_AMOUNT = 120;
export const DEFAULT_FREE_DELIVERY_THRESHOLD = 1500;

export type AdminSettings = {
  gstEnabled: boolean;
  gstRatePercent: number;
  deliveryFeeAmount: number;
  freeDeliveryThreshold: number;
  updatedAt?: string | null;
};

type AdminSettingsRow = {
  id: string;
  gst_enabled: number;
  gst_rate_percent: number;
  delivery_fee_amount: number;
  free_delivery_threshold: number;
  updated_at: string | null;
};

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  gstEnabled: true,
  gstRatePercent: DEFAULT_GST_RATE_PERCENT,
  deliveryFeeAmount: DEFAULT_DELIVERY_FEE_AMOUNT,
  freeDeliveryThreshold: DEFAULT_FREE_DELIVERY_THRESHOLD,
  updatedAt: null,
};

function clampCurrency(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function clampPercent(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export function normalizeAdminSettings(value: Partial<AdminSettings> | null | undefined): AdminSettings {
  return {
    gstEnabled: value?.gstEnabled ?? DEFAULT_ADMIN_SETTINGS.gstEnabled,
    gstRatePercent: clampPercent(
      value?.gstRatePercent,
      DEFAULT_ADMIN_SETTINGS.gstRatePercent
    ),
    deliveryFeeAmount: clampCurrency(
      value?.deliveryFeeAmount,
      DEFAULT_ADMIN_SETTINGS.deliveryFeeAmount
    ),
    freeDeliveryThreshold: clampCurrency(
      value?.freeDeliveryThreshold,
      DEFAULT_ADMIN_SETTINGS.freeDeliveryThreshold
    ),
    updatedAt: value?.updatedAt ?? null,
  };
}

export function mapAdminSettingsRow(row: AdminSettingsRow | undefined): AdminSettings {
  if (!row) return DEFAULT_ADMIN_SETTINGS;
  return normalizeAdminSettings({
    gstEnabled: Number(row.gst_enabled ?? 0) === 1,
    gstRatePercent: Number(row.gst_rate_percent ?? DEFAULT_GST_RATE_PERCENT),
    deliveryFeeAmount: Number(row.delivery_fee_amount ?? DEFAULT_DELIVERY_FEE_AMOUNT),
    freeDeliveryThreshold: Number(
      row.free_delivery_threshold ?? DEFAULT_FREE_DELIVERY_THRESHOLD
    ),
    updatedAt: row.updated_at ?? null,
  });
}

export function getAdminSettings(db: Database.Database) {
  const row = db
    .prepare(
      `SELECT id, gst_enabled, gst_rate_percent, delivery_fee_amount, free_delivery_threshold, updated_at
       FROM admin_settings
       WHERE id = ?
       LIMIT 1`
    )
    .get(ADMIN_SETTINGS_ID) as AdminSettingsRow | undefined;

  return mapAdminSettingsRow(row);
}
