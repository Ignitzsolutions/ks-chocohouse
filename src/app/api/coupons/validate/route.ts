import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { validateCouponCode } from "@/lib/coupons";
import { computePricing } from "@/lib/pricing";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      subtotal?: number;
      deliveryFee?: number;
    };

    initDb();
    const subtotalAmount = Math.max(0, Math.round(Number(body.subtotal ?? 0)));
    const deliveryFeeAmount = Math.max(0, Math.round(Number(body.deliveryFee ?? 0)));
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

    const pricing = computePricing(subtotalAmount, result.discountAmount, deliveryFeeAmount);
    return NextResponse.json({
      valid: true,
      normalizedCode: result.coupon.code,
      label: result.coupon.label,
      discountAmount: pricing.discountAmount,
      payableTotal: pricing.totalAmount,
      pricing,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to validate coupon", details: String(error) },
      { status: 500 }
    );
  }
}
