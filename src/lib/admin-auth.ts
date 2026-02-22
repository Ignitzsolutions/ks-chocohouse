import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "ks_admin_session";

type AdminSessionPayload = {
  username: string;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function timingSafeEquals(a: string, b: string) {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function getAdminConfig() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
    secret: process.env.ADMIN_AUTH_SECRET || "change-this-admin-secret",
    ttlSeconds: Math.max(60, Number(process.env.ADMIN_SESSION_TTL_SECONDS || 60 * 60 * 12)),
  };
}

function sign(payloadBase64: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

function createToken(payload: AdminSessionPayload, secret: string) {
  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadBase64, secret);
  return `${payloadBase64}.${signature}`;
}

function parseToken(token: string, secret: string): AdminSessionPayload | null {
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return null;

  const expectedSignature = sign(payloadBase64, secret);
  if (!timingSafeEquals(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payloadBase64)) as AdminSessionPayload;
    if (!parsed?.username || !parsed?.exp) return null;
    if (Date.now() >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function validateAdminCredentials(username: string, password: string) {
  const config = getAdminConfig();
  return (
    timingSafeEquals(username.trim(), config.username) &&
    timingSafeEquals(password, config.password)
  );
}

export async function createAdminSession(username: string) {
  const config = getAdminConfig();
  const exp = Date.now() + config.ttlSeconds * 1000;
  const token = createToken({ username, exp }, config.secret);
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: config.ttlSeconds,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const parsed = parseToken(token, getAdminConfig().secret);
  if (!parsed) return null;
  return { username: parsed.username };
}

export async function requireAdminApi() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
