import { NextResponse } from "next/server";
import { getAdminSettings } from "@/lib/admin-settings";
import { getDb, initDb } from "@/lib/db";
import { generateOrderId } from "@/lib/order-id";
import { recordOrderEvent } from "@/lib/admin-sales";
import { getCouponByCode, incrementCouponUsage, validateCouponCode } from "@/lib/coupons";
import { computePricing, normalizeBuyerGst, normalizeCouponCode } from "@/lib/pricing";
import { getDisplaySizeOptions, getProductPriceForOption } from "@/lib/products";
import { getProductsByIds } from "@/lib/product-store";
import { jsonError } from "@/lib/api-response";
import { enforceAllowedOrigin, enforceRateLimit } from "@/lib/request-guard";

type IncomingItem = {
  id: string;
  qty: number;
  sizeLabel?: string;
  customizationNote?: string;
};

type SnapshotItem = {
  id: string;
  name: string;
  category: string;
  hsnCode: string;
  qty: number;
  sizeLabel?: string;
  customizationNote?: string;
  unitPrice: number;
  lineTotal: number;
};

const VALID_PAYMENT_METHODS = new Set(["UPI QR", "UPI Transfer", "Bank Transfer"]);
const MAX_DELIVERY_LEAD_DAYS = 90;
const MAX_QTY_PER_LINE = 100;
const MAX_TOTAL_QTY = 500;

function todayIsoDate() {
  // Compare in local server date (assumes deploy TZ matches business TZ — Asia/Kolkata typical).
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function addDaysIso(baseIso: string, days: number) {
  const base = new Date(`${baseIso}T00:00:00`);
  base.setDate(base.getDate() + days);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

    const incomingItems: IncomingItem[] = Array.isArray(orderDetails?.items)
      ? orderDetails.items
          .map((item: Record<string, unknown>) => ({
            id: String(item.id ?? "").trim(),
            qty: Math.floor(Number(item.qty ?? 0)),
            sizeLabel: String(item.sizeLabel ?? "").trim() || undefined,
            customizationNote:
              String(item.customizationNote ?? "").trim() || undefined,
          }))
          .filter((item: IncomingItem) => item.id && item.qty > 0)
      : [];

    if (incomingItems.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    for (const item of incomingItems) {
      if (item.qty > MAX_QTY_PER_LINE) {
        return NextResponse.json(
          { error: `Quantity per item cannot exceed ${MAX_QTY_PER_LINE}` },
          { status: 400 }
        );
      }
    }
    const totalQty = incomingItems.reduce((sum, item) => sum + item.qty, 0);
    if (totalQty > MAX_TOTAL_QTY) {
      return NextResponse.json(
        { error: `Total quantity cannot exceed ${MAX_TOTAL_QTY}` },
        { status: 400 }
      );
    }

    const deliveryDate = String(orderDetails?.delivery_date ?? "").trim();
    if (!deliveryDate || !isValidDateString(deliveryDate)) {
      return NextResponse.json(
        { error: "A valid delivery date is required" },
        { status: 400 }
      );
    }
    const today = todayIsoDate();
    if (deliveryDate < today) {
      return NextResponse.json(
        { error: "Delivery date cannot be in the past" },
        { status: 400 }
      );
    }
    const maxDeliveryDate = addDaysIso(today, MAX_DELIVERY_LEAD_DAYS);
    if (deliveryDate > maxDeliveryDate) {
      return NextResponse.json(
        {
          error: `Delivery date cannot be more than ${MAX_DELIVERY_LEAD_DAYS} days out`,
        },
        { status: 400 }
      );
    }

    initDb();
    const db = getDb();
    const settings = getAdminSettings(db);

    // Re-fetch every product from the DB, INCLUDING unavailable ones.
    // We recompute prices server-side and reject unavailable/missing items —
    // never trust the client-provided unitPrice or lineTotal.
    const products = getProductsByIds(incomingItems.map((item) => item.id));
    const productById = new Map(products.map((product) => [product.id, product]));

    const missing: string[] = [];
    const unavailable: string[] = [];
    for (const item of incomingItems) {
      const product = productById.get(item.id);
      if (!product) missing.push(item.id);
      else if (!product.available) unavailable.push(item.id);
    }
    if (missing.length > 0 || unavailable.length > 0) {
      return NextResponse.json(
        {
          error: "Some items are no longer available",
          missingProductIds: missing,
          unavailableProductIds: unavailable,
        },
        { status: 409 }
      );
    }

    // Validate every sizeLabel against the product's allowed options so a
    // client cannot forge a tiny size (e.g. "0.001 kg") to bypass pricing.
    // - kg products MUST have a sizeLabel drawn from the allowed list.
    // - pcs products may omit sizeLabel; if provided it must match the list.
    const invalidSize: { id: string; sizeLabel: string }[] = [];
    for (const item of incomingItems) {
      const product = productById.get(item.id)!;
      const allowedOptions = getDisplaySizeOptions(product);
      const normalizedAllowed = allowedOptions.map((label) =>
        label.trim().toLowerCase()
      );
      const providedLabel = String(item.sizeLabel ?? "").trim();

      if (product.pricingMode === "kg") {
        if (!providedLabel) {
          invalidSize.push({ id: item.id, sizeLabel: "" });
          continue;
        }
        if (!normalizedAllowed.includes(providedLabel.toLowerCase())) {
          invalidSize.push({ id: item.id, sizeLabel: providedLabel });
        }
      } else if (providedLabel && normalizedAllowed.length > 0) {
        if (!normalizedAllowed.includes(providedLabel.toLowerCase())) {
          invalidSize.push({ id: item.id, sizeLabel: providedLabel });
        }
      }
    }
    if (invalidSize.length > 0) {
      return NextResponse.json(
        {
          error: "Selected size is not available for one or more items",
          invalidSizeItems: invalidSize,
        },
        { status: 400 }
      );
    }

    const snapshottedItems: SnapshotItem[] = incomingItems.map((item) => {
      const product = productById.get(item.id)!;
      const unitPrice = getProductPriceForOption(product, item.sizeLabel);
      const lineTotal = Number((unitPrice * item.qty).toFixed(2));
      return {
        id: product.id,
        name: item.sizeLabel ? `${product.name} (${item.sizeLabel})` : product.name,
        category: product.category,
        hsnCode: product.hsnCode ?? "",
        qty: item.qty,
        sizeLabel: item.sizeLabel,
        customizationNote: item.customizationNote,
        unitPrice,
        lineTotal,
      };
    });

    const subtotalAmount = Number(
      snapshottedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
    );
    const normalizedBuyerGst = normalizeBuyerGst(buyerGst);

    const blocked = db
      .prepare("SELECT date FROM blackout_dates WHERE date = ?")
      .get(deliveryDate);
    if (blocked) {
      return NextResponse.json(
        { error: "Selected date is blocked for orders" },
        { status: 400 }
      );
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

    const pricing = computePricing(subtotalAmount, couponValidation.discountAmount, settings);
    if (pricing.totalAmount <= 0) {
      return NextResponse.json({ error: "Invalid payable amount" }, { status: 400 });
    }

    // Dedup guard: if the same payment reference was submitted for an online
    // order in the last hour, return the existing order instead of creating a
    // duplicate. Protects against double-click / retry / stale-tab resubmits.
    const existingOrder = db
      .prepare(
        `SELECT id, total_amount, status
         FROM orders
         WHERE payment_reference = ?
           AND source = 'online'
           AND created_at > datetime('now', '-1 hour')
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(normalizedReference) as
      | { id: string; total_amount: number; status: string }
      | undefined;
    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        orderId: existingOrder.id,
        pricing,
        duplicate: true,
        message: "This payment reference was already submitted",
      });
    }

    const orderId = generateOrderId("WEB");
    const now = new Date().toISOString();
    const categorySummary = Array.from(
      new Set(snapshottedItems.map((item) => item.category).filter(Boolean))
    ).join(", ");
    const quantity = totalQty || 1;
    const cakeName =
      snapshottedItems.length === 1
        ? snapshottedItems[0].name
        : "Mixed Order";

    try {
      db.transaction(() => {
        db.prepare(
        `INSERT INTO orders
          (id, cake_name, quantity, customer_name, phone, email, address, pincode, delivery_date, delivery_slot, cake_message, order_items_json, category_summary, buyer_gst_json, source, payment_method, payment_reference, payment_status, txn_id, invoice_number, invoice_ready, paid_at, subtotal_amount, delivery_fee_amount, discount_amount, gst_enabled, gst_rate_percent, gst_amount, billing_breakdown_json, coupon_code, coupon_snapshot_json, total_amount, order_kind, lifecycle_state, parent_order_id, voided_at, voided_by, void_reason, status, created_at, updated_at, status_updated_at, payment_updated_at)
          VALUES (@id, @cake_name, @quantity, @customer_name, @phone, @email, @address, @pincode, @delivery_date, @delivery_slot, @cake_message, @order_items_json, @category_summary, @buyer_gst_json, @source, @payment_method, @payment_reference, @payment_status, @txn_id, @invoice_number, @invoice_ready, @paid_at, @subtotal_amount, @delivery_fee_amount, @discount_amount, @gst_enabled, @gst_rate_percent, @gst_amount, @billing_breakdown_json, @coupon_code, @coupon_snapshot_json, @total_amount, @order_kind, @lifecycle_state, @parent_order_id, @voided_at, @voided_by, @void_reason, @status, @created_at, @updated_at, @status_updated_at, @payment_updated_at)`
      ).run({
        id: orderId,
        cake_name: cakeName,
        quantity,
        customer_name: String(orderDetails?.customer_name ?? "Customer").trim() || "Customer",
        phone: String(orderDetails?.phone ?? "").trim(),
        email: String(orderDetails?.email ?? "").trim(),
        address: String(orderDetails?.address ?? "").trim(),
        pincode: String(orderDetails?.pincode ?? "").trim(),
        delivery_date: deliveryDate,
        delivery_slot: String(orderDetails?.delivery_slot ?? "").trim(),
        cake_message: String(orderDetails?.cake_message ?? "").trimEnd(),
        order_items_json: JSON.stringify(snapshottedItems),
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
        gst_enabled: pricing.gstEnabled ? 1 : 0,
        gst_rate_percent: pricing.gstRatePercent,
        gst_amount: pricing.gstAmount,
        billing_breakdown_json: JSON.stringify(pricing),
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
    } catch (insertError) {
      // Race: a concurrent request inserted the same payment_reference between
      // our SELECT above and this INSERT. The partial unique index on
      // orders(payment_reference) fires SQLITE_CONSTRAINT_UNIQUE — return the
      // existing order so the customer sees success exactly once.
      const message = String((insertError as { message?: string })?.message ?? "");
      if (message.includes("UNIQUE") && message.includes("payment_reference")) {
        const winner = db
          .prepare(
            `SELECT id FROM orders
             WHERE payment_reference = ? AND source = 'online'
             ORDER BY created_at DESC LIMIT 1`
          )
          .get(normalizedReference) as { id: string } | undefined;
        if (winner) {
          return NextResponse.json({
            ok: true,
            orderId: winner.id,
            pricing,
            duplicate: true,
            message: "This payment reference was already submitted",
          });
        }
      }
      throw insertError;
    }

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
