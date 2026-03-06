import type Database from "better-sqlite3";
import { normalizeCouponCode, validateCouponForSubtotal } from "@/lib/pricing";
import type { AppliedCoupon } from "@/types/order";

export type CouponRow = {
  code: string;
  label: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  active: number;
  created_at: string;
  updated_at: string;
};

export function toCouponInput(row: CouponRow): AppliedCoupon & {
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
} {
  return {
    code: row.code,
    label: row.label,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minOrderAmount: Number(row.min_order_amount),
    maxDiscountAmount:
      row.max_discount_amount === null ? null : Number(row.max_discount_amount),
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    usageLimit: row.usage_limit === null ? null : Number(row.usage_limit),
    usedCount: Number(row.used_count ?? 0),
    active: Number(row.active ?? 0) === 1,
  };
}

export function getCouponByCode(db: Database.Database, code: unknown) {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) return null;
  const row = db
    .prepare(
      `SELECT code, label, discount_type, discount_value, min_order_amount, max_discount_amount,
              starts_at, expires_at, usage_limit, used_count, active, created_at, updated_at
       FROM coupons
       WHERE code = ?`
    )
    .get(normalizedCode) as CouponRow | undefined;
  return row ?? null;
}

export function validateCouponCode(
  db: Database.Database,
  code: unknown,
  subtotalAmount: number,
  nowIso = new Date().toISOString()
) {
  const row = getCouponByCode(db, code);
  return validateCouponForSubtotal(row ? toCouponInput(row) : null, subtotalAmount, nowIso);
}

export function incrementCouponUsage(db: Database.Database, code: string) {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) return;
  db.prepare(
    `UPDATE coupons
     SET used_count = COALESCE(used_count, 0) + 1,
         updated_at = @updated_at
     WHERE code = @code`
  ).run({
    code: normalizedCode,
    updated_at: new Date().toISOString(),
  });
}
