import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getSalesOrderDetail } from "@/lib/admin-sales";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    const { orderId } = await context.params;
    const result = getSalesOrderDetail(decodeURIComponent(orderId));
    if (!result.order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load order details", details: String(error) },
      { status: 500 }
    );
  }
}

