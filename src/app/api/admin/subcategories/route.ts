import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-auth";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const rows = getDb()
      .prepare(
        `SELECT id, category_name, name, sort_order, active, created_at, updated_at
         FROM product_subcategories
         ORDER BY category_name ASC, sort_order ASC, name ASC`
      )
      .all() as Array<{
      id: string;
      category_name: string;
      name: string;
      sort_order: number;
      active: number;
      created_at: string;
      updated_at: string;
    }>;

    return NextResponse.json({
      subcategories: rows.map((row) => ({
        id: row.id,
        categoryName: row.category_name,
        name: row.name,
        sortOrder: row.sort_order,
        active: row.active === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load subcategories", details: String(error) },
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
    const categoryName = String(body?.categoryName ?? "").trim();
    const name = String(body?.name ?? "").trim();
    if (!categoryName || !name) {
      return NextResponse.json(
        { error: "Category and subcategory name are required" },
        { status: 400 }
      );
    }

    const existing = getDb()
      .prepare(
        "SELECT id FROM product_subcategories WHERE category_name = ? AND lower(name) = lower(?) LIMIT 1"
      )
      .get(categoryName, name) as { id: string } | undefined;
    if (existing) {
      return NextResponse.json({ error: "Subcategory already exists" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const countRow = getDb()
      .prepare("SELECT COUNT(*) AS count FROM product_subcategories WHERE category_name = ?")
      .get(categoryName) as { count: number };
    const id = `${slugify(categoryName)}-${slugify(name) || Date.now()}`;

    getDb()
      .prepare(
        `INSERT INTO product_subcategories
          (id, category_name, name, sort_order, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, ?)`
      )
      .run(id, categoryName, name, Number(countRow.count ?? 0) + 1, now, now);

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create subcategory", details: String(error) },
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
    const categoryName = String(body?.categoryName ?? "").trim();
    const name = String(body?.name ?? "").trim();
    if (!id || !categoryName || !name) {
      return NextResponse.json(
        { error: "Subcategory id, category, and name are required" },
        { status: 400 }
      );
    }

    const existing = getDb()
      .prepare("SELECT id, category_name, name FROM product_subcategories WHERE id = ? LIMIT 1")
      .get(id) as { id: string; category_name: string; name: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    }

    const duplicate = getDb()
      .prepare(
        "SELECT id FROM product_subcategories WHERE category_name = ? AND lower(name) = lower(?) AND id != ? LIMIT 1"
      )
      .get(categoryName, name, id) as { id: string } | undefined;
    if (duplicate) {
      return NextResponse.json({ error: "Subcategory already exists" }, { status: 400 });
    }

    const now = new Date().toISOString();
    getDb()
      .prepare(
        `UPDATE product_subcategories
         SET category_name = ?, name = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(categoryName, name, now, id);

    getDb()
      .prepare(
        `UPDATE products
         SET category = ?, sub_category = ?, updated_at = ?
         WHERE sub_category_id = ?`
      )
      .run(categoryName, name, now, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update subcategory", details: String(error) },
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
      return NextResponse.json({ error: "Subcategory id is required" }, { status: 400 });
    }

    const inUse = getDb()
      .prepare("SELECT COUNT(*) AS count FROM products WHERE sub_category_id = ?")
      .get(id) as { count: number };
    if (Number(inUse.count) > 0) {
      return NextResponse.json(
        { error: "Subcategory is used by products. Update those products first." },
        { status: 409 }
      );
    }

    getDb().prepare("DELETE FROM product_subcategories WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete subcategory", details: String(error) },
      { status: 500 }
    );
  }
}
