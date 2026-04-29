import { NextResponse } from "next/server";
import { requireAdminApi, requireAdminApiWithRequest } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-response";
import { getDb, initDb } from "@/lib/db";
import { normalizeCouponCode } from "@/lib/pricing";

function toMoney(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Number(parsed.toFixed(2))) : fallback;
}

function toNullableMoney(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Number(parsed.toFixed(2))) : null;
}

function toNullableInt(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function toNullableText(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw || null;
}

export async function GET() {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;
    initDb();
    const coupons = getDb()
      .prepare(
        `SELECT code, label, discount_type, discount_value, min_order_amount, max_discount_amount,
                starts_at, expires_at, usage_limit, used_count, active, created_at, updated_at
         FROM coupons
         ORDER BY updated_at DESC, code ASC`
      )
      .all();
    return NextResponse.json({ coupons });
  } catch (error) {
    return jsonError("Failed to load coupons", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;
    initDb();
    const body = await request.json();
    const code = normalizeCouponCode(body?.code);
    const label = String(body?.label ?? "").trim();
    const discountType = body?.discountType === "percent" ? "percent" : "flat";
    const discountValue = Math.max(0, toMoney(body?.discountValue, 0));
    if (!code || !label || discountValue <= 0) {
      return NextResponse.json(
        { error: "Code, label, and a positive discount value are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO coupons
          (code, label, discount_type, discount_value, min_order_amount, max_discount_amount,
           starts_at, expires_at, usage_limit, used_count, active, created_at, updated_at)
         VALUES (@code, @label, @discount_type, @discount_value, @min_order_amount, @max_discount_amount,
                 @starts_at, @expires_at, @usage_limit, 0, @active, @created_at, @updated_at)`
      )
      .run({
        code,
        label,
        discount_type: discountType,
        discount_value: discountValue,
        min_order_amount: Math.max(0, toMoney(body?.minOrderAmount, 0)),
        max_discount_amount: toNullableMoney(body?.maxDiscountAmount),
        starts_at: toNullableText(body?.startsAt),
        expires_at: toNullableText(body?.expiresAt),
        usage_limit: toNullableInt(body?.usageLimit),
        active: body?.active === false ? 0 : 1,
        created_at: now,
        updated_at: now,
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Failed to create coupon", 500, error);
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;
    initDb();
    const body = await request.json();
    const code = normalizeCouponCode(body?.code);
    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const updates: string[] = [];
    const params: Record<string, unknown> = {
      code,
      updated_at: new Date().toISOString(),
    };

    if (body?.label !== undefined) {
      updates.push("label = @label");
      params.label = String(body.label ?? "").trim();
    }
    if (body?.discountType !== undefined) {
      updates.push("discount_type = @discount_type");
      params.discount_type = body.discountType === "percent" ? "percent" : "flat";
    }
    if (body?.discountValue !== undefined) {
      updates.push("discount_value = @discount_value");
      params.discount_value = Math.max(0, toMoney(body.discountValue, 0));
    }
    if (body?.minOrderAmount !== undefined) {
      updates.push("min_order_amount = @min_order_amount");
      params.min_order_amount = Math.max(0, toMoney(body.minOrderAmount, 0));
    }
    if (body?.maxDiscountAmount !== undefined) {
      updates.push("max_discount_amount = @max_discount_amount");
      params.max_discount_amount = toNullableMoney(body.maxDiscountAmount);
    }
    if (body?.startsAt !== undefined) {
      updates.push("starts_at = @starts_at");
      params.starts_at = toNullableText(body.startsAt);
    }
    if (body?.expiresAt !== undefined) {
      updates.push("expires_at = @expires_at");
      params.expires_at = toNullableText(body.expiresAt);
    }
    if (body?.usageLimit !== undefined) {
      updates.push("usage_limit = @usage_limit");
      params.usage_limit = toNullableInt(body.usageLimit);
    }
    if (body?.active !== undefined) {
      updates.push("active = @active");
      params.active = body.active ? 1 : 0;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = @updated_at");
    getDb()
      .prepare(`UPDATE coupons SET ${updates.join(", ")} WHERE code = @code`)
      .run(params);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Failed to update coupon", 500, error);
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;
    initDb();
    const body = await request.json();
    const code = normalizeCouponCode(body?.code);
    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    getDb().prepare("DELETE FROM coupons WHERE code = ?").run(code);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Failed to delete coupon", 500, error);
  }
}
