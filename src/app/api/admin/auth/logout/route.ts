import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin-auth";
import { enforceAllowedOrigin } from "@/lib/request-guard";

export async function POST(request: Request) {
  const invalidOrigin = enforceAllowedOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
