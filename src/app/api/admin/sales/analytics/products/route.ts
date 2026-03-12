import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getProductAnalytics, parseSalesFilters } from "@/lib/admin-sales";

export async function GET(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const filters = parseSalesFilters(searchParams);
    return NextResponse.json(getProductAnalytics(filters));
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load product analytics", details: String(error) },
      { status: 500 }
    );
  }
}
