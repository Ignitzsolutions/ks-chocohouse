import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdminApi, requireAdminApiWithRequest } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-response";

type CategoryRow = {
  id: string;
  name: string;
  image_src: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const FALLBACK_CATEGORY_IMAGE = "/images/categories/cakes.svg";

export async function GET() {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const rows = getDb()
      .prepare(
        `SELECT id, name, image_src, sort_order, created_at, updated_at
         FROM categories
         ORDER BY sort_order ASC, name ASC`
      )
      .all() as CategoryRow[];

    return NextResponse.json({
      categories: rows.map((row) => ({
        id: row.id,
        name: row.name,
        imageSrc: row.image_src,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    return jsonError("Failed to load categories", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const imageSrc =
      String(body?.imageSrc ?? "").trim() || FALLBACK_CATEGORY_IMAGE;

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const existing = getDb()
      .prepare("SELECT id FROM categories WHERE lower(name) = lower(?) LIMIT 1")
      .get(name) as { id: string } | undefined;
    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 });
    }

    const id = slugify(name) || `category-${Date.now()}`;
    const now = new Date().toISOString();
    const countRow = getDb()
      .prepare("SELECT COUNT(*) AS count FROM categories")
      .get() as { count: number };
    const sortOrder = Number(countRow.count ?? 0) + 1;

    getDb()
      .prepare(
        `INSERT INTO categories
          (id, name, image_src, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, name, imageSrc, sortOrder, now, now);

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return jsonError("Failed to create category", 500, error);
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const id = String(body?.id ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const imageSrc = String(body?.imageSrc ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Category id is required" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const existing = getDb()
      .prepare("SELECT id, name, image_src FROM categories WHERE id = ? LIMIT 1")
      .get(id) as { id: string; name: string; image_src: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const duplicate = getDb()
      .prepare(
        "SELECT id FROM categories WHERE lower(name) = lower(?) AND id != ? LIMIT 1"
      )
      .get(name, id) as { id: string } | undefined;
    if (duplicate) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const nextImageSrc = imageSrc || existing.image_src || FALLBACK_CATEGORY_IMAGE;

    const updateCategory = getDb().prepare(
      `UPDATE categories
       SET name = ?, image_src = ?, updated_at = ?
       WHERE id = ?`
    );
    const updateProducts = getDb().prepare(
      "UPDATE products SET category = ?, updated_at = ? WHERE category = ?"
    );

    const tx = getDb().transaction(() => {
      updateCategory.run(name, nextImageSrc, now, id);
      if (existing.name !== name) {
        updateProducts.run(name, now, existing.name);
      }
    });
    tx();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Failed to update category", 500, error);
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
      return NextResponse.json({ error: "Category id is required" }, { status: 400 });
    }

    const existing = getDb()
      .prepare("SELECT id, name FROM categories WHERE id = ? LIMIT 1")
      .get(id) as { id: string; name: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const inUse = getDb()
      .prepare("SELECT COUNT(*) AS count FROM products WHERE category = ?")
      .get(existing.name) as { count: number };

    if (Number(inUse.count) > 0) {
      return NextResponse.json(
        {
          error:
            "Category is used by products. Move or update those products first, then delete category.",
        },
        { status: 409 }
      );
    }

    getDb().prepare("DELETE FROM categories WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Failed to delete category", 500, error);
  }
}
