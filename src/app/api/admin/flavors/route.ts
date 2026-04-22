import { NextResponse } from "next/server";
import { requireAdminApi, requireAdminApiWithRequest } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-response";
import { getDb, initDb } from "@/lib/db";

type FlavorRow = {
  id: string;
  name: string;
  active: number;
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

function toFlavor(row: FlavorRow) {
  return {
    id: row.id,
    name: row.name,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const rows = getDb()
      .prepare(
        `SELECT id, name, active, created_at, updated_at
         FROM flavors
         ORDER BY active DESC, name ASC`
      )
      .all() as FlavorRow[];

    return NextResponse.json({ flavors: rows.map(toFlavor) });
  } catch (error) {
    return jsonError("Failed to load flavors", 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminApiWithRequest(request);
    if (unauthorized) return unauthorized;

    initDb();
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Flavor name is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id = `${slugify(name) || "flavor"}-${Date.now()}`;
    getDb()
      .prepare(
        `INSERT INTO flavors (id, name, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, name, body?.active === false ? 0 : 1, now, now);

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return jsonError("Failed to create flavor", 500, error);
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
      return NextResponse.json({ error: "Flavor id is required" }, { status: 400 });
    }

    const fields: string[] = [];
    const params: Array<string | number> = [];
    if (body?.name !== undefined) {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return NextResponse.json({ error: "Flavor name is required" }, { status: 400 });
      }
      fields.push("name = ?");
      params.push(name);
    }
    if (body?.active !== undefined) {
      fields.push("active = ?");
      params.push(body.active ? 1 : 0);
    }
    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push("updated_at = ?");
    params.push(new Date().toISOString());
    params.push(id);

    getDb()
      .prepare(`UPDATE flavors SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Failed to update flavor", 500, error);
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
      return NextResponse.json({ error: "Flavor id is required" }, { status: 400 });
    }

    getDb().transaction(() => {
      getDb().prepare("DELETE FROM product_flavors WHERE flavor_id = ?").run(id);
      getDb().prepare("DELETE FROM flavors WHERE id = ?").run(id);
    })();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Failed to delete flavor", 500, error);
  }
}
