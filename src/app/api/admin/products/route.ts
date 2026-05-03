import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdminApi, requireAdminApiWithRequest } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-response";

type ProductRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  sub_category: string;
  sub_category_id: string | null;
  pricing_mode: string | null;
  price_inr: number;
  hsn_code?: string | null;
  base_price_per_kg_inr: number | null;
  piece_label: string | null;
  image_src: string;
  image_gallery_json: string | null;
  size_options_json: string;
  flavor_selection_enabled: number;
  flavor_ids_csv?: string | null;
  flavor_names_csv?: string | null;
  eggless: number;
  available: number;
  created_at: string;
  updated_at: string;
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

function toMoney(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Number(parsed.toFixed(2))) : 0;
}

function normalizeSizeOptions(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
    subCategoryId: row.sub_category_id,
    pricingMode: String(row.pricing_mode ?? "").trim().toLowerCase() === "pcs" ? "pcs" : "kg",
    priceInr: Number(row.price_inr),
    hsnCode: String(row.hsn_code ?? "").trim(),
    basePricePerKgInr:
      row.base_price_per_kg_inr === null || row.base_price_per_kg_inr === undefined
        ? null
        : Number(row.base_price_per_kg_inr),
    pieceLabel: row.piece_label,
    imageSrc: row.image_src,
    imageGallery: parseImageGallery(row.image_gallery_json, row.image_src),
    sizeOptions: parseSizeOptions(row.size_options_json),
    flavorSelectionEnabled: row.flavor_selection_enabled === 1,
    flavorIds: parseCsvList(row.flavor_ids_csv),
    flavors: parseCsvList(row.flavor_names_csv),
    eggless: row.eggless === 1,
    available: row.available === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureCategory(category: unknown) {
  const value = String(category ?? "").trim();
  if (!value) {
    throw new Error("Category is required");
  }
  return value;
}

function normalizeFlavorIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
}

function syncProductFlavors(productId: string, flavorIds: string[]) {
  const db = getDb();
  db.prepare("DELETE FROM product_flavors WHERE product_id = ?").run(productId);
  if (flavorIds.length === 0) return;

  const placeholders = flavorIds.map(() => "?").join(", ");
  const existing = db
    .prepare(`SELECT id FROM flavors WHERE id IN (${placeholders})`)
    .all(...flavorIds) as Array<{ id: string }>;
  if (existing.length !== flavorIds.length) {
    throw new Error("One or more selected flavors are invalid");
  }

  const insert = db.prepare(
    `INSERT INTO product_flavors (product_id, flavor_id, created_at) VALUES (?, ?, ?)`
  );
  const now = new Date().toISOString();
  for (const flavorId of flavorIds) {
    insert.run(productId, flavorId, now);
  }
}

function ensureCategoryRow(name: string, imageSrc: string) {
  const now = new Date().toISOString();
  const found = getDb()
    .prepare("SELECT id FROM categories WHERE lower(name) = lower(?) LIMIT 1")
    .get(name) as { id: string } | undefined;
  if (found) return;

  const countRow = getDb()
    .prepare("SELECT COUNT(*) AS count FROM categories")
    .get() as { count: number };

  const id = slugify(name) || `category-${Date.now()}`;
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO categories
        (id, name, image_src, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      name,
      imageSrc || "/images/categories/cakes.svg",
      Number(countRow.count ?? 0) + 1,
      now,
      now
    );
}

export async function GET() {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const rows = getDb()
      .prepare(
        `SELECT p.id, p.name, p.description, p.category, p.sub_category, p.sub_category_id, p.pricing_mode, p.price_inr, p.hsn_code, p.base_price_per_kg_inr, p.piece_label, p.image_src, p.image_gallery_json, p.size_options_json, p.flavor_selection_enabled, p.eggless, p.available, p.created_at, p.updated_at,
                (SELECT GROUP_CONCAT(flavor_id, '||') FROM product_flavors WHERE product_id = p.id) AS flavor_ids_csv,
                (SELECT GROUP_CONCAT(f.name, '||') FROM product_flavors pf JOIN flavors f ON f.id = pf.flavor_id WHERE pf.product_id = p.id) AS flavor_names_csv
         FROM products p
         ORDER BY p.category ASC, p.name ASC`
      )
      .all() as ProductRow[];

    return NextResponse.json({ products: rows.map(toApiProduct) });
  } catch (error) {
    return jsonError("Failed to load products", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();

    const name = String(body?.name ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const category = ensureCategory(body?.category);
    const subCategory = String(body?.subCategory ?? "").trim() || "General";
    const subCategoryId = String(body?.subCategoryId ?? "").trim() || null;
    const pricingMode = String(body?.pricingMode ?? "").trim().toLowerCase() === "pcs" ? "pcs" : "kg";
    const hsnCode = String(body?.hsnCode ?? "").trim();
    const imageSrc = String(body?.imageSrc ?? "").trim();
    const imageGallery = Array.isArray(body?.imageGallery)
      ? body.imageGallery.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];
    const sizeOptions = normalizeSizeOptions(body?.sizeOptions);
    const priceInr = Number(body?.priceInr ?? 0);
    const basePricePerKgInr =
      pricingMode === "kg"
        ? Number(body?.basePricePerKgInr ?? priceInr)
        : null;
    const pieceLabel =
      pricingMode === "pcs" ? String(body?.pieceLabel ?? "").trim() || "pieces" : null;
    const eggless = body?.eggless !== false;
    const available = body?.available !== false;
    const flavorSelectionEnabled = body?.flavorSelectionEnabled === true;
    const flavorIds = normalizeFlavorIds(body?.flavorIds);

    if (!name || !description || !imageSrc || !Number.isFinite(priceInr) || priceInr < 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    const baseId = String(body?.id ?? "").trim() || slugify(name);
    const id = baseId ? `${baseId}-${Date.now()}` : `product-${Date.now()}`;
    const now = new Date().toISOString();
    ensureCategoryRow(category, imageSrc);

    getDb().transaction(() => {
      getDb()
        .prepare(
          `INSERT INTO products
            (id, name, description, category, sub_category, sub_category_id, pricing_mode, price_inr, hsn_code, base_price_per_kg_inr, piece_label, image_src, image_gallery_json, size_options_json, flavor_selection_enabled, eggless, available, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          name,
          description,
          category,
          subCategory,
          subCategoryId,
          pricingMode,
          toMoney(priceInr),
          hsnCode || null,
          pricingMode === "kg" && typeof basePricePerKgInr === "number" && Number.isFinite(basePricePerKgInr)
            ? toMoney(basePricePerKgInr)
            : null,
          pieceLabel,
          imageSrc,
          JSON.stringify(Array.from(new Set([imageSrc, ...imageGallery].filter(Boolean)))),
          JSON.stringify(sizeOptions),
          flavorSelectionEnabled ? 1 : 0,
          eggless ? 1 : 0,
          available ? 1 : 0,
          now,
          now
        );
      syncProductFlavors(id, flavorIds);
    })();

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return jsonError("Failed to create product", 500, error);
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const id = String(body?.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    const existing = getDb()
      .prepare("SELECT image_src, image_gallery_json FROM products WHERE id = ? LIMIT 1")
      .get(id) as { image_src: string; image_gallery_json: string | null } | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (body?.name !== undefined) {
      fields.push("name = ?");
      values.push(String(body.name).trim());
    }
    if (body?.description !== undefined) {
      fields.push("description = ?");
      values.push(String(body.description).trim());
    }
    if (body?.category !== undefined) {
      fields.push("category = ?");
      const categoryValue = ensureCategory(body.category);
      values.push(categoryValue);
      const imageForCategory =
        body?.imageSrc !== undefined ? String(body.imageSrc).trim() : "";
      ensureCategoryRow(categoryValue, imageForCategory);
    }
    if (body?.subCategory !== undefined) {
      fields.push("sub_category = ?");
      values.push(String(body.subCategory).trim() || "General");
    }
    if (body?.subCategoryId !== undefined) {
      fields.push("sub_category_id = ?");
      values.push(String(body.subCategoryId).trim() || null);
    }
    if (body?.pricingMode !== undefined) {
      fields.push("pricing_mode = ?");
      values.push(String(body.pricingMode).trim().toLowerCase() === "pcs" ? "pcs" : "kg");
    }
    if (body?.priceInr !== undefined) {
      const value = Number(body.priceInr);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: "Invalid price" }, { status: 400 });
      }
      fields.push("price_inr = ?");
      values.push(toMoney(value));
    }
    if (body?.hsnCode !== undefined) {
      fields.push("hsn_code = ?");
      values.push(String(body.hsnCode ?? "").trim() || null);
    }
    if (body?.imageSrc !== undefined) {
      fields.push("image_src = ?");
      values.push(String(body.imageSrc).trim());
    }
    if (body?.imageGallery !== undefined) {
      const gallery = Array.isArray(body.imageGallery)
        ? body.imageGallery.map((item: unknown) => String(item).trim()).filter(Boolean)
        : [];
      const primaryImageSrc =
        body?.imageSrc !== undefined ? String(body.imageSrc).trim() : existing.image_src;
      const existingGallery = parseImageGallery(existing.image_gallery_json, existing.image_src);
      fields.push("image_gallery_json = ?");
      values.push(
        JSON.stringify(
          Array.from(new Set([primaryImageSrc, ...gallery, ...existingGallery].filter(Boolean)))
        )
      );
    }
    if (body?.basePricePerKgInr !== undefined) {
      const value = Number(body.basePricePerKgInr);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: "Invalid base price per kg" }, { status: 400 });
      }
      fields.push("base_price_per_kg_inr = ?");
      values.push(toMoney(value));
    }
    if (body?.pieceLabel !== undefined) {
      fields.push("piece_label = ?");
      values.push(String(body.pieceLabel).trim() || null);
    }
    if (body?.sizeOptions !== undefined) {
      fields.push("size_options_json = ?");
      values.push(JSON.stringify(normalizeSizeOptions(body.sizeOptions)));
    }
    if (body?.eggless !== undefined) {
      fields.push("eggless = ?");
      values.push(body.eggless ? 1 : 0);
    }
    if (body?.available !== undefined) {
      fields.push("available = ?");
      values.push(body.available ? 1 : 0);
    }
    if (body?.flavorSelectionEnabled !== undefined) {
      fields.push("flavor_selection_enabled = ?");
      values.push(body.flavorSelectionEnabled ? 1 : 0);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    getDb().transaction(() => {
      getDb()
        .prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`)
        .run(...values);

      if (body?.flavorIds !== undefined) {
        syncProductFlavors(id, normalizeFlavorIds(body.flavorIds));
      }
    })();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Failed to update product", 500, error);
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const id = String(body?.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    getDb().transaction(() => {
      getDb().prepare("DELETE FROM product_flavors WHERE product_id = ?").run(id);
      getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
    })();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Failed to delete product", 500, error);
  }
}
