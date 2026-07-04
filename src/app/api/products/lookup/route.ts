import { NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/product-store";
import { jsonError } from "@/lib/api-response";

const MAX_IDS_PER_LOOKUP = 100;

/**
 * Look up products by id list, INCLUDING unavailable ones.
 *
 * Used by the cart and checkout pages so they can distinguish between
 * "product missing from listings because it's no longer available" and
 * "product genuinely deleted". Both cases need customer-facing UI instead
 * of silently dropping the line item.
 *
 * We POST the ids in the body rather than a query string to keep long
 * URLs (with many cart items) from being truncated by proxies.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawIds = Array.isArray(body?.ids) ? body.ids : [];
    const ids = rawIds
      .map((id: unknown) => String(id ?? "").trim())
      .filter(Boolean)
      .slice(0, MAX_IDS_PER_LOOKUP);

    if (ids.length === 0) {
      return NextResponse.json({ products: [] });
    }

    return NextResponse.json({ products: getProductsByIds(ids) });
  } catch (error) {
    return jsonError("Failed to look up products", 500, error);
  }
}
