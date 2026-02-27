import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { buildSalesOrdersCsv, parseSalesFilters } from "@/lib/admin-sales";

export async function GET(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const filters = parseSalesFilters(searchParams);
    const { csv } = buildSalesOrdersCsv(filters);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sales-orders-${timestamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = String(error);
    return NextResponse.json(
      { error: "Failed to export sales CSV", details: message },
      { status: message.includes("Export limit exceeded") ? 400 : 500 }
    );
  }
}

