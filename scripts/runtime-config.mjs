import path from "node:path";

const DEFAULT_DEV_URL = "http://localhost:3006";
const DEFAULT_DEV_DB_PATH = path.join(process.cwd(), "data", "bakery.sqlite");
const DEFAULT_DEV_UPLOADS_DIR = path.join(process.cwd(), "public", "images", "uploads");
const WEAK_PASSWORDS = new Set([
  "admin",
  "admin123",
  "password",
  "change-this-password",
  "changeme",
]);
const WEAK_SECRETS = new Set([
  "change-this-admin-secret",
  "change-this-long-random-secret",
  "secret",
]);

function normalizeUrl(value, fallback) {
  const raw = String(value ?? "").trim() || fallback;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function getRuntimeConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const siteUrl = normalizeUrl(process.env.SITE_URL, isProduction ? "" : DEFAULT_DEV_URL);
  const databasePath = path.resolve(process.env.DATABASE_PATH || DEFAULT_DEV_DB_PATH);
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || DEFAULT_DEV_UPLOADS_DIR);
  const adminUsername = String(process.env.ADMIN_USERNAME ?? "").trim() || (isProduction ? "" : "admin");
  const adminPassword =
    String(process.env.ADMIN_PASSWORD ?? "").trim() || (isProduction ? "" : "admin123");
  const adminAuthSecret =
    String(process.env.ADMIN_AUTH_SECRET ?? "").trim() ||
    (isProduction ? "" : "change-this-long-random-secret-for-dev-only");

  if (isProduction) {
    assert(Boolean(siteUrl), "SITE_URL is required in production");
    assert(Boolean(adminUsername), "ADMIN_USERNAME is required in production");
    assert(
      Boolean(adminPassword) && !WEAK_PASSWORDS.has(adminPassword.toLowerCase()),
      "ADMIN_PASSWORD is missing or too weak in production"
    );
    assert(
      adminAuthSecret.length >= 32 && !WEAK_SECRETS.has(adminAuthSecret.toLowerCase()),
      "ADMIN_AUTH_SECRET must be at least 32 characters in production"
    );
    assert(path.isAbsolute(databasePath), "DATABASE_PATH must be absolute in production");
    assert(path.isAbsolute(uploadsDir), "UPLOADS_DIR must be absolute in production");
    assert(
      !databasePath.startsWith(`${path.resolve(process.cwd())}${path.sep}`),
      "DATABASE_PATH must be outside the release directory in production"
    );
    assert(
      !uploadsDir.startsWith(`${path.resolve(process.cwd())}${path.sep}`),
      "UPLOADS_DIR must be outside the release directory in production"
    );
    assert(!databasePath.startsWith("/tmp/"), "DATABASE_PATH must not point to /tmp in production");
    assert(!uploadsDir.startsWith("/tmp/"), "UPLOADS_DIR must not point to /tmp in production");
  }

  return {
    isProduction,
    siteUrl,
    databasePath,
    uploadsDir,
  };
}
