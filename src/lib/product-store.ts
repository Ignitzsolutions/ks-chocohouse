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
  hsn_code?: string | null;
  base_price_per_kg_inr?: number | null;
  piece_label?: string | null;
  image_src: string;
  image_gallery_json?: string | null;
  size_options_json: string;
  flavor_selection_enabled?: number | null;
  flavor_names_csv?: string | null;
  eggless: number;
  available: number;
};

function parseCsvList(value: string | null | undefined) {
  return String(value ?? "")
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean);
}

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
    hsnCode: String(row.hsn_code ?? "").trim(),
    basePricePerKgInr:
      row.base_price_per_kg_inr === null || row.base_price_per_kg_inr === undefined
        ? null
        : Number(row.base_price_per_kg_inr),
    pieceLabel: row.piece_label ?? undefined,
    imageSrc: row.image_src,
    imageGallery: parseImageGallery(row.image_gallery_json, row.image_src),
    sizeOptions: parseSizeOptions(row.size_options_json),
    flavorSelectionEnabled: Number(row.flavor_selection_enabled ?? 0) === 1,
    flavors: parseCsvList(row.flavor_names_csv),
    eggless: row.eggless === 1,
    available: row.available === 1,
  };
}

function queryAvailableProductById(id: string) {
  try {
    initDb();
    const row = getDb()
      .prepare(
        `SELECT p.id, p.name, p.description, p.category, p.sub_category, p.sub_category_id, p.pricing_mode, p.price_inr, p.hsn_code, p.base_price_per_kg_inr, p.piece_label, p.image_src, p.image_gallery_json, p.size_options_json, p.flavor_selection_enabled, p.eggless, p.available,
                (SELECT GROUP_CONCAT(f.name, '||') FROM product_flavors pf JOIN flavors f ON f.id = pf.flavor_id WHERE pf.product_id = p.id) AS flavor_names_csv
         FROM products p
         WHERE p.id = ? AND p.available = 1
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
        `SELECT p.id, p.name, p.description, p.category, p.sub_category, p.sub_category_id, p.pricing_mode, p.price_inr, p.hsn_code, p.base_price_per_kg_inr, p.piece_label, p.image_src, p.image_gallery_json, p.size_options_json, p.flavor_selection_enabled, p.eggless, p.available,
                (SELECT GROUP_CONCAT(f.name, '||') FROM product_flavors pf JOIN flavors f ON f.id = pf.flavor_id WHERE pf.product_id = p.id) AS flavor_names_csv
         FROM products p
         WHERE p.available = 1
         ORDER BY p.category ASC, p.name ASC`
      )
      .all() as ProductRow[];

    return rows.map(toProduct);
  } catch {
    return getFallbackProducts().filter((product) => product.available);
  }
}
