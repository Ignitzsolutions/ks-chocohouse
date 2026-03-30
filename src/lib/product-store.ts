import { getDb, initDb } from "@/lib/db";
import {
  getProductById as getFallbackProductById,
  getProductIdFromSlug,
  getProducts as getFallbackProducts,
  type Product,
} from "@/lib/products";

type ProductRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  sub_category: string;
  price_inr: number;
  image_src: string;
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

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    subCategory: row.sub_category,
    priceInr: Number(row.price_inr),
    imageSrc: row.image_src,
    sizeOptions: parseSizeOptions(row.size_options_json),
    eggless: row.eggless === 1,
    available: row.available === 1,
  };
}

function queryAvailableProductById(id: string) {
  try {
    initDb();
    const row = getDb()
      .prepare(
        `SELECT id, name, description, category, sub_category, price_inr, image_src, size_options_json, eggless, available
         FROM products
         WHERE id = ? AND available = 1
         LIMIT 1`
      )
      .get(id) as ProductRow | undefined;

    return row ? toProduct(row) : null;
  } catch {
    return null;
  }
}

export function getProductBySlug(slug: string) {
  const productId = getProductIdFromSlug(slug);
  const fromDb = queryAvailableProductById(productId);
  if (fromDb) return fromDb;

  const fallback = getFallbackProductById(productId);
  return fallback?.available ? fallback : undefined;
}

export function getAllAvailableProducts() {
  try {
    initDb();
    const rows = getDb()
      .prepare(
        `SELECT id, name, description, category, sub_category, price_inr, image_src, size_options_json, eggless, available
         FROM products
         WHERE available = 1
         ORDER BY category ASC, name ASC`
      )
      .all() as ProductRow[];

    return rows.map(toProduct);
  } catch {
    return getFallbackProducts().filter((product) => product.available);
  }
}
