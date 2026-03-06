import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

type ProductRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  sub_category: string;
  price_inr: number;
  image_src: string;
  eggless: number;
  available: number;
};

function toApiProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    subCategory: row.sub_category,
    priceInr: Number(row.price_inr),
    imageSrc: row.image_src,
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
      `SELECT id, name, description, category, sub_category, price_inr, image_src, eggless, available
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
