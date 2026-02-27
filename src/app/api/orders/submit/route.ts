import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { generateOrderId } from "@/lib/order-id";
import { recordOrderEvent } from "@/lib/admin-sales";

type NormalizedOrderItem = {
  id: string;
  name: string;
  category: string;
  qty: number;
  customizationNote?: string;
  unitPrice: number;
  lineTotal: number;
};

const VALID_PAYMENT_METHODS = new Set(["UPI QR", "UPI Transfer", "Bank Transfer"]);

export async function POST(request: Request) {
  try {
    const { amount, paymentReference, paymentMethod, orderDetails } = await request.json();

    const totalAmount = Math.round(Number(amount));
    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

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

    initDb();

    if (orderDetails?.delivery_date) {
      const blocked = getDb()
        .prepare("SELECT date FROM blackout_dates WHERE date = ?")
        .get(orderDetails.delivery_date);
      if (blocked) {
        return NextResponse.json(
          { error: "Selected date is blocked for orders" },
          { status: 400 }
        );
      }
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

    getDb()
      .prepare(
        `INSERT INTO orders
          (id, cake_name, quantity, customer_name, phone, email, address, pincode, delivery_date, delivery_slot, cake_message, order_items_json, category_summary, source, payment_method, payment_reference, payment_status, txn_id, invoice_number, invoice_ready, paid_at, total_amount, status, created_at, updated_at, status_updated_at, payment_updated_at)
          VALUES (@id, @cake_name, @quantity, @customer_name, @phone, @email, @address, @pincode, @delivery_date, @delivery_slot, @cake_message, @order_items_json, @category_summary, @source, @payment_method, @payment_reference, @payment_status, @txn_id, @invoice_number, @invoice_ready, @paid_at, @total_amount, @status, @created_at, @updated_at, @status_updated_at, @payment_updated_at)`
      )
      .run({
        id: orderId,
        cake_name: cakeName,
        quantity: quantity || 1,
        customer_name: orderDetails?.customer_name ?? "Customer",
        phone: orderDetails?.phone ?? "",
        email: orderDetails?.email ?? "",
        address: orderDetails?.address ?? "",
        pincode: orderDetails?.pincode ?? "",
        delivery_date: orderDetails?.delivery_date ?? "",
        delivery_slot: orderDetails?.delivery_slot ?? "",
        cake_message: orderDetails?.cake_message ?? "",
        order_items_json: JSON.stringify(normalizedItems),
        category_summary: categorySummary,
        source: "online",
        payment_method: normalizedMethod,
        payment_reference: normalizedReference,
        payment_status: "Verification Pending",
        txn_id: normalizedReference,
        invoice_number: null,
        invoice_ready: 0,
        paid_at: null,
        total_amount: totalAmount,
        status: "Payment Verification Pending",
        created_at: now,
        updated_at: now,
        status_updated_at: now,
        payment_updated_at: now,
      });

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
      message: "Payment reference submitted for verification",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to place order", details: String(error) },
      { status: 500 }
    );
  }
}
