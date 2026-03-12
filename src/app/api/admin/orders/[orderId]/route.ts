import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getDb, initDb } from "@/lib/db";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    const { orderId: rawOrderId } = await context.params;
    const orderId = decodeURIComponent(rawOrderId ?? "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "Order id is required" }, { status: 400 });
    }

    initDb();
    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM orders WHERE id = ?")
      .get(orderId) as { id: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    db.transaction(() => {
      db.prepare("DELETE FROM order_events WHERE order_id = ?").run(orderId);
      db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
    })();

    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete order", details: String(error) },
      { status: 500 }
    );
  }
}
