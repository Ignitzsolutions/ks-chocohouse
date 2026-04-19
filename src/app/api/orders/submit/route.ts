import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { generateOrderId } from "@/lib/order-id";
import { recordOrderEvent } from "@/lib/admin-sales";
import { getCouponByCode, incrementCouponUsage, validateCouponCode } from "@/lib/coupons";
import { computePricing, normalizeBuyerGst, normalizeCouponCode } from "@/lib/pricing";
import { jsonError } from "@/lib/api-response";
import { enforceAllowedOrigin, enforceRateLimit } from "@/lib/request-guard";

type NormalizedOrderItem = {
  id: string;
  name: string;
  category: string;
  qty: number;
  sizeLabel?: string;
  customizationNote?: string;
  unitPrice: number;
  lineTotal: number;
};

const VALID_PAYMENT_METHODS = new Set(["UPI QR", "UPI Transfer", "Bank Transfer"]);

export async function POST(request: Request) {
  try {
    const invalidOrigin = enforceAllowedOrigin(request);
    if (invalidOrigin) return invalidOrigin;

    const rateLimited = enforceRateLimit(request, {
      key: "order-submit",
      limit: 25,
      windowMs: 5 * 60 * 1000,
    });
    if (rateLimited) return rateLimited;

    const { paymentReference, paymentMethod, orderDetails, couponCode, buyerGst } =
      await request.json();

    const normalizedReference = String(paymentReference ?? "").trim().toUpperCase();
    if (normalizedReference.length < 6) {
      return NextResponse.json(
        { error: "Payment reference is required" },
        { status: 400 }
      );
    }

    const normalizedMethod = String(paymentMethod ?? "").trim();
    if (!VALID_PAYMENT_METHODS.has(normalizedMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    const normalizedItems: NormalizedOrderItem[] = Array.isArray(orderDetails?.items)
      ? orderDetails.items
          .map((item: Record<string, unknown>) => ({
            id: String(item.id ?? ""),
            name: String(item.name ?? ""),
            category: String(item.category ?? ""),
            qty: Number(item.qty ?? 0),
            sizeLabel: String(item.sizeLabel ?? "").trim() || undefined,
            customizationNote: String(item.customizationNote ?? "").trim() || undefined,
            unitPrice: Number(item.unitPrice ?? 0),
            lineTotal: Number(item.lineTotal ?? 0),
          }))
          .filter((item: NormalizedOrderItem) => item.id && item.name && item.qty > 0)
      : [];

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const subtotalAmount = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const normalizedBuyerGst = normalizeBuyerGst(buyerGst);

    initDb();
    const db = getDb();

    if (orderDetails?.delivery_date) {
      const blocked = db
        .prepare("SELECT date FROM blackout_dates WHERE date = ?")
        .get(orderDetails.delivery_date);
      if (blocked) {
        return NextResponse.json(
          { error: "Selected date is blocked for orders" },
          { status: 400 }
        );
      }
    }

    const normalizedCoupon = normalizeCouponCode(couponCode);
    const couponValidation = normalizedCoupon
      ? validateCouponCode(db, normalizedCoupon, subtotalAmount)
      : { valid: false, coupon: null, discountAmount: 0 };

    if (normalizedCoupon && !couponValidation.valid) {
      return NextResponse.json(
        { error: couponValidation.reason ?? "Invalid coupon" },
        { status: 400 }
      );
    }

    const pricing = computePricing(subtotalAmount, couponValidation.discountAmount);
    if (pricing.totalAmount <= 0) {
      return NextResponse.json({ error: "Invalid payable amount" }, { status: 400 });
    }

    const orderId = generateOrderId("KSC");
    const now = new Date().toISOString();
    const categorySummary =
      orderDetails?.categorySummary ??
      Array.from(
        new Set(normalizedItems.map((item) => item.category).filter(Boolean))
      ).join(", ");
    const quantity =
      orderDetails?.quantity ??
      normalizedItems.reduce((sum, item) => sum + item.qty, 0);
    const cakeName =
      orderDetails?.cake_name ??
      (normalizedItems.length === 1 ? normalizedItems[0].name : "Mixed Order");

    db.transaction(() => {
      db.prepare(
        `INSERT INTO orders
          (id, cake_name, quantity, customer_name, phone, email, address, pincode, delivery_date, delivery_slot, cake_message, order_items_json, category_summary, buyer_gst_json, source, payment_method, payment_reference, payment_status, txn_id, invoice_number, invoice_ready, paid_at, subtotal_amount, delivery_fee_amount, discount_amount, coupon_code, coupon_snapshot_json, total_amount, order_kind, lifecycle_state, parent_order_id, voided_at, voided_by, void_reason, status, created_at, updated_at, status_updated_at, payment_updated_at)
          VALUES (@id, @cake_name, @quantity, @customer_name, @phone, @email, @address, @pincode, @delivery_date, @delivery_slot, @cake_message, @order_items_json, @category_summary, @buyer_gst_json, @source, @payment_method, @payment_reference, @payment_status, @txn_id, @invoice_number, @invoice_ready, @paid_at, @subtotal_amount, @delivery_fee_amount, @discount_amount, @coupon_code, @coupon_snapshot_json, @total_amount, @order_kind, @lifecycle_state, @parent_order_id, @voided_at, @voided_by, @void_reason, @status, @created_at, @updated_at, @status_updated_at, @payment_updated_at)`
      ).run({
        id: orderId,
        cake_name: cakeName,
        quantity: quantity || 1,
        customer_name: String(orderDetails?.customer_name ?? "Customer").trim() || "Customer",
        phone: String(orderDetails?.phone ?? "").trim(),
        email: String(orderDetails?.email ?? "").trim(),
        address: String(orderDetails?.address ?? "").trim(),
        pincode: String(orderDetails?.pincode ?? "").trim(),
        delivery_date: String(orderDetails?.delivery_date ?? "").trim(),
        delivery_slot: String(orderDetails?.delivery_slot ?? "").trim(),
        cake_message: String(orderDetails?.cake_message ?? "").trimEnd(),
        order_items_json: JSON.stringify(normalizedItems),
        category_summary: categorySummary,
        buyer_gst_json: normalizedBuyerGst ? JSON.stringify(normalizedBuyerGst) : null,
        source: "online",
        payment_method: normalizedMethod,
        payment_reference: normalizedReference,
        payment_status: "Verification Pending",
        txn_id: normalizedReference,
        invoice_number: null,
        invoice_ready: 0,
        paid_at: null,
        subtotal_amount: pricing.subtotalAmount,
        delivery_fee_amount: pricing.deliveryFeeAmount,
        discount_amount: pricing.discountAmount,
        coupon_code: couponValidation.coupon?.code ?? null,
        coupon_snapshot_json: couponValidation.coupon
          ? JSON.stringify(getCouponByCode(db, couponValidation.coupon.code))
          : null,
        total_amount: pricing.totalAmount,
        order_kind: "sale",
        lifecycle_state: "finalized",
        parent_order_id: null,
        voided_at: null,
        voided_by: null,
        void_reason: null,
        status: "Payment Verification Pending",
        created_at: now,
        updated_at: now,
        status_updated_at: now,
        payment_updated_at: now,
      });

      if (couponValidation.coupon) {
        incrementCouponUsage(db, couponValidation.coupon.code);
      }
    })();

    recordOrderEvent({
      orderId,
      eventType: "status_changed",
      fromValue: null,
      toValue: "Payment Verification Pending",
      actor: "customer",
      createdAt: now,
      meta: { source: "online" },
    });

    return NextResponse.json({
      ok: true,
      orderId,
      pricing,
      message: "Payment reference submitted for verification",
    });
  } catch (error) {
    return jsonError("Failed to place order", 500, error);
  }
}
