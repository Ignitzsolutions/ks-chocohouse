import { NextResponse } from "next/server";
import { getAdminSettings } from "@/lib/admin-settings";
import { jsonError } from "@/lib/api-response";
import { getDb, initDb } from "@/lib/db";

export async function GET() {
  try {
    initDb();
    return NextResponse.json({ settings: getAdminSettings(getDb()) });
  } catch (error) {
    return jsonError("Failed to load settings", 500, error);
  }
}
