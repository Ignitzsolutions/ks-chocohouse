import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET() {
  try {
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
