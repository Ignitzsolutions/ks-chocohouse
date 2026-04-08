import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

type ProductRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  sub_category: string;
  sub_category_id?: string | null;
  pricing_mode?: string | null;
  price_inr: number;
  base_price_per_kg_inr?: number | null;
  piece_label?: string | null;
  image_src: string;
  image_gallery_json?: string | null;
  size_options_json: string;
  eggless: number;
  available: number;
};

function parseSizeOptions(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function parseImageGallery(value: string | null | undefined, imageSrc: string) {
  try {
    const parsed = JSON.parse(value ?? "[]") as unknown;
    const gallery = Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean)
      : [];
    return Array.from(new Set([imageSrc, ...gallery].filter(Boolean)));
  } catch {
    return [imageSrc].filter(Boolean);
  }
}

function toApiProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    subCategory: row.sub_category,
    subCategoryId: row.sub_category_id ?? undefined,
    pricingMode: String(row.pricing_mode ?? "").trim().toLowerCase() === "pcs" ? "pcs" : "kg",
    priceInr: Number(row.price_inr),
    basePricePerKgInr:
      row.base_price_per_kg_inr === null || row.base_price_per_kg_inr === undefined
        ? null
        : Number(row.base_price_per_kg_inr),
    pieceLabel: row.piece_label ?? undefined,
    imageSrc: row.image_src,
    imageGallery: parseImageGallery(row.image_gallery_json, row.image_src),
    sizeOptions: parseSizeOptions(row.size_options_json),
    eggless: row.eggless === 1,
    available: row.available === 1,
  };
}

export async function GET(request: Request) {
  try {
    initDb();
    const { searchParams } = new URL(request.url);
    const category = String(searchParams.get("category") ?? "").trim();
    const subCategory = String(searchParams.get("subCategory") ?? "").trim();

    let query =
      `SELECT id, name, description, category, sub_category, sub_category_id, pricing_mode, price_inr, base_price_per_kg_inr, piece_label, image_src, image_gallery_json, size_options_json, eggless, available
       FROM products
       WHERE available = 1`;
    const params: Record<string, string> = {};
    if (category) {
      query += " AND category = @category";
      params.category = category;
    }
    if (subCategory) {
      query += " AND sub_category = @subCategory";
      params.subCategory = subCategory;
    }
    query += " ORDER BY category ASC, name ASC";

    const rows = getDb().prepare(query).all(params) as ProductRow[];

    return NextResponse.json({
      products: rows.map(toApiProduct),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load products", details: String(error) },
      { status: 500 }
    );
  }
}
