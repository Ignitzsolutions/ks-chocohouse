import { NextResponse } from "next/server";
import { getAdminSettings } from "@/lib/admin-settings";
import { getDb, initDb } from "@/lib/db";
import { validateCouponCode } from "@/lib/coupons";
import { computePricing } from "@/lib/pricing";
import { jsonError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      subtotal?: number;
    };

    initDb();
    const subtotalAmount = Math.max(0, Math.round(Number(body.subtotal ?? 0)));
    const result = validateCouponCode(getDb(), body.code, subtotalAmount);
    if (!result.valid || !result.coupon) {
      return NextResponse.json(
        {
          valid: false,
          error: result.reason ?? "Invalid coupon",
        },
        { status: 400 }
      );
    }

    const pricing = computePricing(subtotalAmount, result.discountAmount, getAdminSettings(getDb()));
    return NextResponse.json({
      valid: true,
      normalizedCode: result.coupon.code,
      label: result.coupon.label,
      discountAmount: pricing.discountAmount,
      payableTotal: pricing.totalAmount,
      pricing,
    });
  } catch (error) {
    return jsonError("Failed to validate coupon", 500, error);
  }
}
