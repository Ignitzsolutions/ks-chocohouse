import { NextResponse } from "next/server";
import { requireAdminApiWithRequest } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-response";
import { getDb, initDb } from "@/lib/db";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
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
    return jsonError("Failed to delete order", 500, error);
  }
}
