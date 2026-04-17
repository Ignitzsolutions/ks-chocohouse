import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    initDb();
    const rows = getDb()
      .prepare("SELECT date, reason FROM blackout_dates ORDER BY date ASC")
      .all();
    return NextResponse.json({ blackouts: rows });
  } catch (error) {
    return jsonError("Failed to load blackout dates", 500, error);
  }
}
