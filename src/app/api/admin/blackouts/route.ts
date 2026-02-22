import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-auth";

export async function GET() {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const rows = getDb()
      .prepare("SELECT date, reason FROM blackout_dates ORDER BY date ASC")
      .all();
    return NextResponse.json({ blackouts: rows });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load blackout dates", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const { date, reason } = await request.json();

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    const stmt = getDb().prepare(
      `INSERT OR REPLACE INTO blackout_dates (date, reason) VALUES (@date, @reason)`
    );
    stmt.run({ date, reason: reason ?? "" });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save blackout date", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = await requireAdminApi();
    if (unauthorized) return unauthorized;

    initDb();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    getDb().prepare("DELETE FROM blackout_dates WHERE date = ?").run(date);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete blackout date", details: String(error) },
      { status: 500 }
    );
  }
}
