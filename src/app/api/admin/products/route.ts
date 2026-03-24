import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-auth";

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
  created_at: string;
  updated_at: string;
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

function normalizeSizeOptions(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toApiProduct(row: ProductRow) {
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
        `SELECT id, name, description, category, sub_category, price_inr, image_src, size_options_json, eggless, available, created_at, updated_at
         FROM products
         ORDER BY category ASC, name ASC`
      )
      .all() as ProductRow[];

    return NextResponse.json({ products: rows.map(toApiProduct) });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load products", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();

    const name = String(body?.name ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const category = ensureCategory(body?.category);
    const subCategory = String(body?.subCategory ?? "").trim() || "General";
    const imageSrc = String(body?.imageSrc ?? "").trim();
    const sizeOptions = normalizeSizeOptions(body?.sizeOptions);
    const priceInr = Number(body?.priceInr ?? 0);
    const eggless = body?.eggless !== false;
    const available = body?.available !== false;

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

    getDb()
      .prepare(
        `INSERT INTO products
          (id, name, description, category, sub_category, price_inr, image_src, size_options_json, eggless, available, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        name,
        description,
        category,
        subCategory,
        Math.round(priceInr),
        imageSrc,
        JSON.stringify(sizeOptions),
        eggless ? 1 : 0,
        available ? 1 : 0,
        now,
        now
      );

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create product", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const id = String(body?.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    const fields: string[] = [];
    const values: Array<string | number> = [];

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
    if (body?.priceInr !== undefined) {
      const value = Number(body.priceInr);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: "Invalid price" }, { status: 400 });
      }
      fields.push("price_inr = ?");
      values.push(Math.round(value));
    }
    if (body?.imageSrc !== undefined) {
      fields.push("image_src = ?");
      values.push(String(body.imageSrc).trim());
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

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    getDb()
      .prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update product", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const id = String(body?.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete product", details: String(error) },
      { status: 500 }
    );
  }
}
