import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { DEFAULT_CATEGORY_CARDS } from "@/lib/default-categories";
import { jsonError } from "@/lib/api-response";

type CategoryRow = {
  id: string;
  name: string;
  image_src: string;
  sort_order: number;
};

export async function GET() {
  try {
    initDb();
    const rows = getDb()
      .prepare(
        `SELECT id, name, image_src, sort_order
         FROM categories
         ORDER BY sort_order ASC, name ASC`
      )
      .all() as CategoryRow[];

    const categories = rows.map((row) => ({
      id: row.id,
      label: row.name,
      category: row.name,
      imageSrc: row.image_src,
      alt: `${row.name} category image`,
      sortOrder: row.sort_order,
    }));

    if (categories.length > 0) {
      return NextResponse.json({ categories });
    }

    return NextResponse.json({ categories: DEFAULT_CATEGORY_CARDS });
  } catch (error) {
    return jsonError("Failed to load categories", 500, error);
  }
}
