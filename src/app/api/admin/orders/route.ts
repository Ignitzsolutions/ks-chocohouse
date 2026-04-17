import { NextResponse } from "next/server";
import { requireAdminApi, requireAdminApiWithRequest } from "@/lib/admin-auth";
import { recordOrderEvent } from "@/lib/admin-sales";
import { jsonError } from "@/lib/api-response";
import { getCouponByCode, incrementCouponUsage, validateCouponCode } from "@/lib/coupons";
import { getDb, initDb } from "@/lib/db";
import { buildInvoiceNumber } from "@/lib/invoice-number";
import { generateOrderId } from "@/lib/order-id";
import { computePricing, normalizeBuyerGst, normalizeCouponCode } from "@/lib/pricing";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price_inr: number;
};

type OfflineSelectedItem = {
  productId: string;
  qty: number;
};

type OfflineOrderItem = {
  id: string;
  name: string;
  category: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

type OrderMutationRow = {
  id: string;
  cake_name: string;
  quantity: number;
  customer_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  pincode: string | null;
  sale_date: string | null;
  cake_message: string | null;
  order_items_json: string | null;
  category_summary: string | null;
  buyer_gst_json: string | null;
  source: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_status: string | null;
  invoice_number: string | null;
  invoice_ready: number | null;
  total_amount: number;
  subtotal_amount: number | null;
  delivery_fee_amount: number | null;
  discount_amount: number | null;
  coupon_code: string | null;
  coupon_snapshot_json: string | null;
  order_kind: string | null;
  lifecycle_state: string | null;
  parent_order_id: string | null;
  status: string;
  created_at: string;
};

function normalizeDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function toInt(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed);
}

function parseOfflineItems(items: unknown[]) {
  return items
    .map((item) => ({
      productId: String((item as Record<string, unknown>)?.productId ?? ""),
      qty: Math.max(1, toInt((item as Record<string, unknown>)?.qty, 1)),
    }))
    .filter((item): item is OfflineSelectedItem => Boolean(item.productId));
}

function resolveOfflineItems(items: OfflineSelectedItem[]) {
  const db = getDb();
  const placeholders = items.map(() => "?").join(", ");
  const products = db
    .prepare(
      `SELECT id, name, category, price_inr
       FROM products
       WHERE id IN (${placeholders})`
    )
    .all(...items.map((item) => item.productId)) as ProductRow[];

  if (products.length !== items.length) {
    return null;
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const rows: OfflineOrderItem[] = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) return null;
    const unitPrice = toInt(product.price_inr, 0);
    rows.push({
      id: product.id,
      name: product.name,
      category: product.category,
      qty: item.qty,
      unitPrice,
      lineTotal: unitPrice * item.qty,
    });
  }
  return rows;
}

function getExistingOrder(id: string) {
  return getDb()
    .prepare(
      `SELECT id, cake_name, quantity, customer_name, phone, email, address, pincode,
              sale_date, cake_message, order_items_json, category_summary, buyer_gst_json, source,
              payment_method, payment_reference, payment_status, invoice_number, invoice_ready,
              total_amount, subtotal_amount, delivery_fee_amount, discount_amount, coupon_code,
              coupon_snapshot_json, order_kind, lifecycle_state, parent_order_id, status, created_at
       FROM orders
       WHERE id = ?
       LIMIT 1`
    )
    .get(id) as OrderMutationRow | undefined;
}

function isOfflineDraft(order: OrderMutationRow | undefined) {
  return order?.source === "offline" && (order.lifecycle_state ?? "finalized") === "draft";
}

function writeOrderEvent(
  orderId: string,
  eventType: string,
  createdAt: string,
  actor: string,
  fromValue?: string | null,
  toValue?: string | null,
  meta?: Record<string, unknown>
) {
  recordOrderEvent({
    orderId,
    eventType,
    fromValue,
    toValue,
    actor,
    createdAt,
    meta,
  });
}

export async function GET(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = normalizeDate(searchParams.get("date"));
    const slot = searchParams.get("slot");

    let query = "SELECT * FROM orders WHERE 1=1";
    const params: Record<string, string> = {};

    if (status && status !== "All") {
      query += " AND status = @status";
      params.status = status;
    }

    if (date) {
      query += " AND delivery_date = @date";
      params.date = date;
    }

    if (slot && slot !== "All") {
      query += " AND delivery_slot = @slot";
      params.slot = slot;
    }

    query += " ORDER BY datetime(created_at) DESC";
    return NextResponse.json({ orders: getDb().prepare(query).all(params) });
  } catch (error) {
    return jsonError("Failed to load orders", 500, error);
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const id = String(body?.id ?? "");
    const status = String(body?.status ?? "").trim();
    const action = String(body?.action ?? "").trim();
    const actor = String(body?.adminName ?? "admin");
    const db = getDb();
    if (!id) {
      return NextResponse.json({ error: "Order id is required" }, { status: 400 });
    }

    const existing = getExistingOrder(id);
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === "verify_payment") {
      db.transaction(() => {
        db.prepare(
          `UPDATE orders
           SET payment_status = 'Verified',
               payment_verified_at = COALESCE(payment_verified_at, @now),
               payment_verified_by = COALESCE(payment_verified_by, @actor),
               status = CASE
                 WHEN status = 'Payment Verification Pending' THEN 'Awaiting Approval'
                 ELSE status
               END,
               paid_at = COALESCE(paid_at, @now),
               invoice_number = COALESCE(invoice_number, @invoice_number),
               invoice_ready = 1,
               lifecycle_state = CASE
                 WHEN COALESCE(lifecycle_state, 'finalized') = 'draft' THEN 'finalized'
                 ELSE COALESCE(lifecycle_state, 'finalized')
               END,
               payment_updated_at = @now,
               status_updated_at = CASE
                 WHEN status = 'Payment Verification Pending' THEN @now
                 ELSE COALESCE(status_updated_at, created_at)
               END,
               updated_at = @now
           WHERE id = @id`
        ).run({
          id,
          now,
          actor,
          invoice_number: buildInvoiceNumber(
            id,
            existing.source,
            existing.order_kind,
            existing.source === "offline" ? existing.sale_date : now
          ),
        });

        if ((existing.payment_status ?? "Verification Pending") !== "Verified") {
          writeOrderEvent(
            id,
            "payment_verified",
            now,
            actor,
            existing.payment_status ?? "Verification Pending",
            "Verified"
          );
        }
        if (existing.status === "Payment Verification Pending") {
          writeOrderEvent(id, "status_changed", now, actor, existing.status, "Awaiting Approval");
        }
        if (!existing.invoice_number && Number(existing.invoice_ready ?? 0) !== 1) {
          writeOrderEvent(
            id,
            "invoice_generated",
            now,
            actor,
            null,
            buildInvoiceNumber(
              id,
              existing.source,
              existing.order_kind,
              existing.source === "offline" ? existing.sale_date : now
            )
          );
        }
      })();
      return NextResponse.json({ ok: true });
    }

    if (action === "reject_payment") {
      db.transaction(() => {
        db.prepare(
          `UPDATE orders
           SET payment_status = 'Rejected',
               payment_verified_at = @now,
               payment_verified_by = @actor,
               status = 'Payment Rejected',
               invoice_ready = 0,
               invoice_number = NULL,
               payment_updated_at = @now,
               status_updated_at = @now,
               updated_at = @now
           WHERE id = @id`
        ).run({ id, now, actor });

        if ((existing.payment_status ?? "Verification Pending") !== "Rejected") {
          writeOrderEvent(
            id,
            "payment_rejected",
            now,
            actor,
            existing.payment_status ?? "Verification Pending",
            "Rejected"
          );
        }
        if (existing.status !== "Payment Rejected") {
          writeOrderEvent(id, "status_changed", now, actor, existing.status, "Payment Rejected");
        }
      })();
      return NextResponse.json({ ok: true });
    }

    if (action === "finalize_offline_draft") {
      if (!isOfflineDraft(existing)) {
        return NextResponse.json({ error: "Only offline drafts can be finalized" }, { status: 400 });
      }

      db.transaction(() => {
        db.prepare(
          `UPDATE orders
           SET lifecycle_state = 'finalized',
               invoice_number = COALESCE(invoice_number, @invoice_number),
               invoice_ready = 1,
               status = 'Delivered',
               paid_at = COALESCE(paid_at, @now),
               updated_at = @now,
               status_updated_at = @now,
               payment_updated_at = @now
           WHERE id = @id`
        ).run({
          id,
          invoice_number: buildInvoiceNumber(
            id,
            existing.source,
            existing.order_kind,
            existing.sale_date ?? now
          ),
          now,
        });

        writeOrderEvent(id, "status_changed", now, actor, existing.status, "Delivered");
        writeOrderEvent(
          id,
          "invoice_generated",
          now,
          actor,
          null,
          buildInvoiceNumber(id, existing.source, existing.order_kind, existing.sale_date ?? now)
        );
      })();

      if (existing.coupon_code) {
        incrementCouponUsage(db, existing.coupon_code);
      }

      return NextResponse.json({
        ok: true,
        invoiceUrl: `/api/orders/${encodeURIComponent(id)}/invoice`,
      });
    }

    if (action === "void_offline_invoice") {
      if (existing.source !== "offline" || (existing.lifecycle_state ?? "finalized") !== "finalized") {
        return NextResponse.json(
          { error: "Only finalized offline invoices can be voided" },
          { status: 400 }
        );
      }

      const voidReason = String(body?.voidReason ?? "").trim();
      db.prepare(
        `UPDATE orders
         SET lifecycle_state = 'void',
             status = 'Cancelled',
             voided_at = @voided_at,
             voided_by = @voided_by,
             void_reason = @void_reason,
             updated_at = @updated_at,
             status_updated_at = @status_updated_at
         WHERE id = @id`
      ).run({
        id,
        voided_at: now,
        voided_by: actor,
        void_reason: voidReason || null,
        updated_at: now,
        status_updated_at: now,
      });

      writeOrderEvent(id, "invoice_voided", now, actor, "finalized", "void", {
        reason: voidReason || null,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "create_offline_return") {
      if (existing.source !== "offline" || (existing.lifecycle_state ?? "finalized") === "draft") {
        return NextResponse.json(
          { error: "Only finalized offline invoices can be returned" },
          { status: 400 }
        );
      }

      const parsedItems = (() => {
        try {
          const raw = JSON.parse(existing.order_items_json ?? "[]") as Array<
            OfflineOrderItem & { lineTotal?: number; unitPrice?: number }
          >;
          return Array.isArray(raw) ? raw : [];
        } catch {
          return [];
        }
      })();

      const returnOrderId = generateOrderId("RTN");
      const returnItems = parsedItems.map((item) => ({
        ...item,
        lineTotal: -Math.abs(toInt(item.lineTotal, 0)),
        unitPrice: -Math.abs(toInt(item.unitPrice, 0)),
      }));
      const subtotalAmount = -Math.abs(toInt(existing.subtotal_amount, Math.abs(existing.total_amount)));
      const deliveryFeeAmount = -Math.abs(toInt(existing.delivery_fee_amount, 0));
      const discountAmount = -Math.abs(toInt(existing.discount_amount, 0));
      const totalAmount = -Math.abs(toInt(existing.total_amount, 0));

      db.transaction(() => {
        db.prepare(
          `INSERT INTO orders
            (id, cake_name, quantity, customer_name, phone, email, address, pincode, delivery_date,
             delivery_slot, cake_message, order_items_json, category_summary, buyer_gst_json, source,
             payment_method, payment_reference, payment_status, payment_verified_at, payment_verified_by,
             txn_id, invoice_number, invoice_ready, paid_at, subtotal_amount, delivery_fee_amount,
             discount_amount, coupon_code, coupon_snapshot_json, total_amount, order_kind, lifecycle_state,
             parent_order_id, voided_at, voided_by, void_reason, status, created_at, updated_at,
             status_updated_at, payment_updated_at)
           VALUES (@id, @cake_name, @quantity, @customer_name, @phone, @email, @address, @pincode, @delivery_date,
                   @delivery_slot, @cake_message, @order_items_json, @category_summary, @buyer_gst_json, @source,
                   @payment_method, @payment_reference, @payment_status, @payment_verified_at, @payment_verified_by,
                   @txn_id, @invoice_number, @invoice_ready, @paid_at, @subtotal_amount, @delivery_fee_amount,
                   @discount_amount, @coupon_code, @coupon_snapshot_json, @total_amount, @order_kind, @lifecycle_state,
                   @parent_order_id, @voided_at, @voided_by, @void_reason, @status, @created_at, @updated_at,
                   @status_updated_at, @payment_updated_at)`
        ).run({
          id: returnOrderId,
          cake_name: `Return - ${existing.cake_name}`,
          quantity: existing.quantity,
          customer_name: existing.customer_name,
          phone: existing.phone ?? "",
          email: existing.email ?? "",
          address: existing.address ?? "",
          pincode: existing.pincode ?? "",
          delivery_date: "",
          delivery_slot: "",
          cake_message: existing.cake_message ?? "",
          order_items_json: JSON.stringify(returnItems),
          category_summary: existing.category_summary ?? "",
          buyer_gst_json: existing.buyer_gst_json,
          source: "offline",
          payment_method: existing.payment_method ?? "Offline",
          payment_reference: existing.payment_reference ?? "",
          payment_status: "Verified",
          payment_verified_at: now,
          payment_verified_by: actor,
          txn_id: `RETURN-${existing.id}`,
          invoice_number: buildInvoiceNumber(
            returnOrderId,
            "offline",
            "return",
            existing.sale_date ?? now
          ),
          invoice_ready: 1,
          paid_at: now,
          subtotal_amount: subtotalAmount,
          delivery_fee_amount: deliveryFeeAmount,
          discount_amount: discountAmount,
          coupon_code: existing.coupon_code,
          coupon_snapshot_json: existing.coupon_snapshot_json,
          total_amount: totalAmount,
          order_kind: "return",
          lifecycle_state: "finalized",
          parent_order_id: existing.id,
          voided_at: null,
          voided_by: null,
          void_reason: null,
          status: "Delivered",
          created_at: now,
          updated_at: now,
          status_updated_at: now,
          payment_updated_at: now,
        });
      })();

      writeOrderEvent(returnOrderId, "return_created", now, actor, existing.id, returnOrderId);
      return NextResponse.json({
        ok: true,
        orderId: returnOrderId,
        invoiceUrl: `/api/orders/${encodeURIComponent(returnOrderId)}/invoice`,
      });
    }

    if (!status) {
      return NextResponse.json(
        { error: "Status or action is required" },
        { status: 400 }
      );
    }

    db.prepare(
      `UPDATE orders
       SET status = ?,
           status_updated_at = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(status, now, now, id);

    if (existing.status !== status) {
      writeOrderEvent(id, "status_changed", now, actor, existing.status, status);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Failed to update order", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const db = getDb();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const parsedItems = parseOfflineItems(items);
    if (parsedItems.length === 0) {
      return NextResponse.json(
        { error: "Invalid product selection" },
        { status: 400 }
      );
    }

    const rows = resolveOfflineItems(parsedItems);
    if (!rows) {
      return NextResponse.json(
        { error: "One or more selected products were not found" },
        { status: 400 }
      );
    }

    const subtotalAmount = rows.reduce((sum, row) => sum + row.lineTotal, 0);
    const mode = String(body?.mode ?? "finalize") === "draft" ? "draft" : "finalize";
    const couponCode = normalizeCouponCode(body?.couponCode);
    const couponValidation = couponCode
      ? validateCouponCode(db, couponCode, subtotalAmount)
      : { valid: false, coupon: null, discountAmount: 0 };
    if (couponCode && !couponValidation.valid) {
      return NextResponse.json(
        { error: couponValidation.reason ?? "Invalid coupon" },
        { status: 400 }
      );
    }

    const pricing = computePricing(subtotalAmount, couponValidation.discountAmount, 0);
    const quantity = rows.reduce((sum, row) => sum + row.qty, 0);
    const categorySummary = Array.from(new Set(rows.map((row) => row.category))).join(", ");
    const now = new Date().toISOString();
    const adminName = String(body?.adminName ?? "admin");
    const paymentReference = String(body?.paymentReference ?? "").trim();
    const paymentMethod = String(body?.paymentMethod ?? "Offline").trim() || "Offline";
    const note = String(body?.note ?? "").trimEnd();
    const saleDate = normalizeDate(String(body?.saleDate ?? "")) ?? normalizeDate(now);
    const buyerGst = normalizeBuyerGst(body?.buyerGst);
    const requestedId = String(body?.id ?? "").trim();
    const existingDraft = requestedId ? getExistingOrder(requestedId) : undefined;

    if (requestedId && !isOfflineDraft(existingDraft)) {
      return NextResponse.json(
        { error: "Only offline drafts can be updated" },
        { status: 400 }
      );
    }

    const orderId = existingDraft?.id ?? generateOrderId("OFF");
    const invoiceNumber =
      mode === "finalize" ? buildInvoiceNumber(orderId, "offline", "sale", saleDate) : null;
    const lifecycleState = mode === "draft" ? "draft" : "finalized";
    const status = mode === "draft" ? "Awaiting Approval" : "Delivered";
    const invoiceReady = mode === "finalize" ? 1 : 0;
    const paidAt = mode === "finalize" ? now : null;

    db.transaction(() => {
      const params = {
        id: orderId,
        cake_name: rows.length === 1 ? rows[0].name : "Offline Mixed Sale",
        quantity,
        customer_name: String(body?.customerName ?? "").trim() || "Customer",
        phone: String(body?.phone ?? "").trim(),
        email: String(body?.email ?? "").trim(),
        address: String(body?.address ?? "").trim(),
        pincode: String(body?.pincode ?? "").trim(),
        sale_date: saleDate,
        delivery_date: "",
        delivery_slot: "",
        cake_message: note,
        order_items_json: JSON.stringify(rows),
        category_summary: categorySummary,
        buyer_gst_json: buyerGst ? JSON.stringify(buyerGst) : null,
        source: "offline",
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_status: "Verified",
        payment_verified_at: now,
        payment_verified_by: adminName,
        txn_id: paymentReference || "OFFLINE",
        invoice_number: invoiceNumber,
        invoice_ready: invoiceReady,
        paid_at: paidAt,
        subtotal_amount: pricing.subtotalAmount,
        delivery_fee_amount: pricing.deliveryFeeAmount,
        discount_amount: pricing.discountAmount,
        coupon_code: couponValidation.coupon?.code ?? null,
        coupon_snapshot_json: couponValidation.coupon
          ? JSON.stringify(getCouponByCode(db, couponValidation.coupon.code))
          : null,
        total_amount: pricing.totalAmount,
        order_kind: "sale",
        lifecycle_state: lifecycleState,
        parent_order_id: null,
        voided_at: null,
        voided_by: null,
        void_reason: null,
        status,
        created_at: existingDraft?.created_at ?? now,
        updated_at: now,
        status_updated_at: now,
        payment_updated_at: now,
      };

      if (existingDraft) {
        db.prepare(
          `UPDATE orders
           SET cake_name = @cake_name,
               quantity = @quantity,
               customer_name = @customer_name,
               phone = @phone,
               email = @email,
               address = @address,
               pincode = @pincode,
               sale_date = @sale_date,
               delivery_date = @delivery_date,
               delivery_slot = @delivery_slot,
               cake_message = @cake_message,
               order_items_json = @order_items_json,
               category_summary = @category_summary,
               buyer_gst_json = @buyer_gst_json,
               source = @source,
               payment_method = @payment_method,
               payment_reference = @payment_reference,
               payment_status = @payment_status,
               payment_verified_at = @payment_verified_at,
               payment_verified_by = @payment_verified_by,
               txn_id = @txn_id,
               invoice_number = @invoice_number,
               invoice_ready = @invoice_ready,
               paid_at = @paid_at,
               subtotal_amount = @subtotal_amount,
               delivery_fee_amount = @delivery_fee_amount,
               discount_amount = @discount_amount,
               coupon_code = @coupon_code,
               coupon_snapshot_json = @coupon_snapshot_json,
               total_amount = @total_amount,
               order_kind = @order_kind,
               lifecycle_state = @lifecycle_state,
               parent_order_id = @parent_order_id,
               voided_at = @voided_at,
               voided_by = @voided_by,
               void_reason = @void_reason,
               status = @status,
               updated_at = @updated_at,
               status_updated_at = @status_updated_at,
               payment_updated_at = @payment_updated_at
           WHERE id = @id`
        ).run(params);
      } else {
        db.prepare(
          `INSERT INTO orders
            (id, cake_name, quantity, customer_name, phone, email, address, pincode, delivery_date,
             sale_date, delivery_slot, cake_message, order_items_json, category_summary, buyer_gst_json, source,
             payment_method, payment_reference, payment_status, payment_verified_at, payment_verified_by,
             txn_id, invoice_number, invoice_ready, paid_at, subtotal_amount, delivery_fee_amount,
             discount_amount, coupon_code, coupon_snapshot_json, total_amount, order_kind, lifecycle_state,
             parent_order_id, voided_at, voided_by, void_reason, status, created_at, updated_at,
             status_updated_at, payment_updated_at)
           VALUES (@id, @cake_name, @quantity, @customer_name, @phone, @email, @address, @pincode, @delivery_date,
                   @sale_date, @delivery_slot, @cake_message, @order_items_json, @category_summary, @buyer_gst_json, @source,
                   @payment_method, @payment_reference, @payment_status, @payment_verified_at, @payment_verified_by,
                   @txn_id, @invoice_number, @invoice_ready, @paid_at, @subtotal_amount, @delivery_fee_amount,
                   @discount_amount, @coupon_code, @coupon_snapshot_json, @total_amount, @order_kind, @lifecycle_state,
                   @parent_order_id, @voided_at, @voided_by, @void_reason, @status, @created_at, @updated_at,
                   @status_updated_at, @payment_updated_at)`
        ).run(params);
      }

      if (mode === "finalize" && couponValidation.coupon) {
        incrementCouponUsage(db, couponValidation.coupon.code);
      }
    })();

    if (!existingDraft) {
      writeOrderEvent(orderId, "payment_verified", now, adminName, null, "Verified", {
        source: "offline",
      });
    }
    writeOrderEvent(
      orderId,
      existingDraft ? "order_updated" : "status_changed",
      now,
      adminName,
      existingDraft ? null : null,
      status,
      { source: "offline", lifecycleState }
    );
    if (mode === "finalize") {
      writeOrderEvent(orderId, "invoice_generated", now, adminName, null, buildInvoiceNumber(orderId, "offline", "sale", saleDate), {
        source: "offline",
      });
    }

    return NextResponse.json({
      ok: true,
      orderId,
      mode,
      invoiceUrl:
        mode === "finalize" ? `/api/orders/${encodeURIComponent(orderId)}/invoice` : null,
    });
  } catch (error) {
    return jsonError("Failed to create offline invoice", 500, error);
  }
}
