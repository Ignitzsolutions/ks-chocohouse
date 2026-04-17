import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getProductAnalytics, parseSalesFilters } from "@/lib/admin-sales";
import { jsonError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const filters = parseSalesFilters(searchParams);
    return NextResponse.json(getProductAnalytics(filters));
  } catch (error) {
    return jsonError("Failed to load product analytics", 500, error);
  }
}
