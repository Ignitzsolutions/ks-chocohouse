import { NextResponse } from "next/server";
import { createAdminSession, validateAdminCredentials } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-response";
import { enforceAllowedOrigin, enforceRateLimit } from "@/lib/request-guard";

export async function POST(request: Request) {
  try {
    const invalidOrigin = enforceAllowedOrigin(request);
    if (invalidOrigin) return invalidOrigin;

    const rateLimited = enforceRateLimit(request, {
      key: "admin-login",
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const username = String(body?.username ?? "");
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    if (!validateAdminCredentials(username, password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createAdminSession(username.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError("Login failed", 500, error);
  }
}
