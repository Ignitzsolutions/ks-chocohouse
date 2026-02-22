import { NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-auth";
import { generateOrderId } from "@/lib/order-id";

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

const normalizeDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const buildInvoiceNumber = (orderId: string) => `INV-${orderId}`;

function toInt(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed);
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

    const rows = getDb().prepare(query).all(params);
    return NextResponse.json({ orders: rows });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load orders", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const { id, status, action, adminName } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Order id is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const verifiedBy = String(adminName ?? "admin");

    if (action === "verify_payment") {
      getDb()
        .prepare(
          `UPDATE orders
           SET payment_status = 'Verified',
               payment_verified_at = COALESCE(payment_verified_at, @now),
               payment_verified_by = COALESCE(payment_verified_by, @verified_by),
               status = CASE
                 WHEN status = 'Payment Verification Pending' THEN 'Awaiting Approval'
                 ELSE status
               END,
               paid_at = COALESCE(paid_at, @now),
               invoice_number = COALESCE(invoice_number, @invoice_number),
               invoice_ready = 1
           WHERE id = @id`
        )
        .run({
          id,
          now,
          verified_by: verifiedBy,
          invoice_number: buildInvoiceNumber(String(id)),
        });
      return NextResponse.json({ ok: true });
    }

    if (action === "reject_payment") {
      getDb()
        .prepare(
          `UPDATE orders
           SET payment_status = 'Rejected',
               payment_verified_at = @now,
               payment_verified_by = @verified_by,
               status = 'Payment Rejected',
               invoice_ready = 0,
               invoice_number = NULL
           WHERE id = @id`
        )
        .run({
          id,
          now,
          verified_by: verifiedBy,
        });
      return NextResponse.json({ ok: true });
    }

    if (!status) {
      return NextResponse.json(
        { error: "Status or action is required" },
        { status: 400 }
      );
    }

    getDb().prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update order", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const parsedItems: OfflineSelectedItem[] = items
      .map((item: Record<string, unknown>) => ({
        productId: String(item.productId ?? ""),
        qty: Math.max(1, toInt(item.qty, 1)),
      }))
      .filter((item: OfflineSelectedItem) => Boolean(item.productId));

    if (parsedItems.length === 0) {
      return NextResponse.json(
        { error: "Invalid product selection" },
        { status: 400 }
      );
    }

    const placeholders = parsedItems.map(() => "?").join(", ");
    const products = getDb()
      .prepare(
        `SELECT id, name, category, price_inr
         FROM products
         WHERE id IN (${placeholders})`
      )
      .all(...parsedItems.map((item: OfflineSelectedItem) => item.productId)) as ProductRow[];

    if (products.length !== parsedItems.length) {
      return NextResponse.json(
        { error: "One or more selected products were not found" },
        { status: 400 }
      );
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems: Array<OfflineOrderItem | null> = parsedItems.map(
      (item: OfflineSelectedItem) => {
      const product = productMap.get(item.productId);
      if (!product) return null;
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        qty: item.qty,
        unitPrice: toInt(product.price_inr, 0),
        lineTotal: toInt(product.price_inr, 0) * item.qty,
      };
    });

    if (normalizedItems.some((item: OfflineOrderItem | null) => item === null)) {
      return NextResponse.json(
        { error: "Failed to resolve product details" },
        { status: 400 }
      );
    }

    const rows = normalizedItems.filter((item): item is OfflineOrderItem => item !== null);
    const totalAmount = rows.reduce((sum, row) => sum + row.lineTotal, 0);
    const quantity = rows.reduce((sum, row) => sum + row.qty, 0);
    const categorySummary = Array.from(new Set(rows.map((row) => row.category))).join(", ");
    const orderId = generateOrderId("OFF");
    const now = new Date().toISOString();
    const paymentReference = String(body?.paymentReference ?? "").trim();
    const paymentMethod = String(body?.paymentMethod ?? "Offline");

    getDb()
      .prepare(
        `INSERT INTO orders
          (id, cake_name, quantity, customer_name, phone, email, address, pincode, delivery_date, delivery_slot, cake_message, order_items_json, category_summary, source, payment_method, payment_reference, payment_status, payment_verified_at, payment_verified_by, txn_id, invoice_number, invoice_ready, paid_at, total_amount, status, created_at)
          VALUES (@id, @cake_name, @quantity, @customer_name, @phone, @email, @address, @pincode, @delivery_date, @delivery_slot, @cake_message, @order_items_json, @category_summary, @source, @payment_method, @payment_reference, @payment_status, @payment_verified_at, @payment_verified_by, @txn_id, @invoice_number, @invoice_ready, @paid_at, @total_amount, @status, @created_at)`
      )
      .run({
        id: orderId,
        cake_name: rows.length === 1 ? rows[0].name : "Offline Mixed Sale",
        quantity,
        customer_name: String(body?.customerName ?? "").trim() || "Customer",
        phone: String(body?.phone ?? "").trim(),
        email: String(body?.email ?? "").trim(),
        address: String(body?.address ?? "").trim(),
        pincode: String(body?.pincode ?? "").trim(),
        delivery_date: "",
        delivery_slot: "",
        cake_message: String(body?.note ?? "").trim(),
        order_items_json: JSON.stringify(rows),
        category_summary: categorySummary,
        source: "offline",
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_status: "Verified",
        payment_verified_at: now,
        payment_verified_by: "admin",
        txn_id: paymentReference || "OFFLINE",
        invoice_number: buildInvoiceNumber(orderId),
        invoice_ready: 1,
        paid_at: now,
        total_amount: totalAmount,
        status: "Delivered",
        created_at: now,
      });

    return NextResponse.json({
      ok: true,
      orderId,
      invoiceUrl: `/api/orders/${encodeURIComponent(orderId)}/invoice`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create offline invoice", details: String(error) },
      { status: 500 }
    );
  }
}
