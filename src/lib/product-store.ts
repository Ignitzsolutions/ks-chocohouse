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

function toProduct(row: ProductRow): Product {
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

function queryAvailableProductById(id: string) {
  try {
    initDb();
    const row = getDb()
      .prepare(
        `SELECT id, name, description, category, sub_category, sub_category_id, pricing_mode, price_inr, base_price_per_kg_inr, piece_label, image_src, image_gallery_json, size_options_json, eggless, available
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
        `SELECT id, name, description, category, sub_category, sub_category_id, pricing_mode, price_inr, base_price_per_kg_inr, piece_label, image_src, image_gallery_json, size_options_json, eggless, available
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
