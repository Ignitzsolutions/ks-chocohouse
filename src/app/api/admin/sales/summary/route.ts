import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getSalesSummary, parseSalesFilters } from "@/lib/admin-sales";
import { jsonError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const filters = parseSalesFilters(searchParams);
    const result = getSalesSummary(filters);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError("Failed to load sales summary", 500, error);
  }
}
