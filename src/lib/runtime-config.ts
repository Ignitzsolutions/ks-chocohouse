import "server-only";

import path from "node:path";

const DEFAULT_DEV_URL = "http://localhost:3006";
const DEFAULT_DEV_DB_PATH = path.join(process.cwd(), "data", "bakery.sqlite");
const DEFAULT_DEV_UPLOADS_DIR = path.join(process.cwd(), "public", "images", "uploads");
const DEFAULT_PUBLIC_UPLOADS_BASE_URL = "/images/uploads";
const DEFAULT_ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;
const WEAK_ADMIN_PASSWORDS = new Set([
  "admin",
  "admin123",
  "password",
  "change-this-password",
  "changeme",
]);
const WEAK_ADMIN_SECRETS = new Set([
  "change-this-admin-secret",
  "change-this-long-random-secret",
  "secret",
]);

type RuntimeConfig = {
  isProduction: boolean;
  appPort: number;
  siteUrl: string;
  publicSiteUrl: string;
  databasePath: string;
  uploadsDir: string;
  publicUploadsBaseUrl: string;
  adminUsername: string;
  adminPassword: string;
  adminAuthSecret: string;
  adminSessionTtlSeconds: number;
  chromeExecutablePath?: string;
  trustProxy: boolean;
};

let cachedConfig: RuntimeConfig | null = null;

function normalizeBoolean(value: string | undefined, fallback = false) {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function normalizeUrl(value: string | undefined, fallback: string) {
  const raw = String(value ?? "").trim() || fallback;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function requireAbsolutePathInProduction(name: string, value: string, isProduction: boolean) {
  if (!isProduction) return;
  if (!path.isAbsolute(value)) {
    throw new Error(`${name} must be an absolute path in production`);
  }
}

function assertPathIsProductionSafe(name: string, value: string, isProduction: boolean) {
  if (!isProduction) return;

  const resolved = path.resolve(value);
  const projectRoot = path.resolve(process.cwd());

  if (resolved === projectRoot || resolved.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`${name} must live outside the application release directory in production`);
  }

  if (resolved === "/tmp" || resolved.startsWith("/tmp/")) {
    throw new Error(`${name} must not point to /tmp in production`);
  }
}

function assertStrongProductionSecrets(config: RuntimeConfig) {
  if (!config.isProduction || process.env.SKIP_RUNTIME_VALIDATION === "true") return;

  if (!config.siteUrl) {
    throw new Error("SITE_URL is required in production");
  }

  if (!config.adminUsername.trim()) {
    throw new Error("ADMIN_USERNAME is required in production");
  }

  const normalizedPassword = config.adminPassword.trim();
  if (!normalizedPassword || WEAK_ADMIN_PASSWORDS.has(normalizedPassword.toLowerCase())) {
    throw new Error("ADMIN_PASSWORD is missing or too weak for production");
  }

  const normalizedSecret = config.adminAuthSecret.trim();
  if (
    normalizedSecret.length < 32 ||
    WEAK_ADMIN_SECRETS.has(normalizedSecret.toLowerCase())
  ) {
    throw new Error("ADMIN_AUTH_SECRET must be at least 32 characters in production");
  }

  requireAbsolutePathInProduction("DATABASE_PATH", config.databasePath, config.isProduction);
  requireAbsolutePathInProduction("UPLOADS_DIR", config.uploadsDir, config.isProduction);
  assertPathIsProductionSafe("DATABASE_PATH", config.databasePath, config.isProduction);
  assertPathIsProductionSafe("UPLOADS_DIR", config.uploadsDir, config.isProduction);
}

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const isProduction = process.env.NODE_ENV === "production";
  const appPort = Math.max(
    1,
    Number.parseInt(process.env.APP_PORT || process.env.PORT || "3000", 10) || 3000
  );
  const siteUrl = normalizeUrl(process.env.SITE_URL, isProduction ? "" : DEFAULT_DEV_URL);
  const publicSiteUrl = normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL,
    siteUrl || DEFAULT_DEV_URL
  );
  const databasePath = String(process.env.DATABASE_PATH ?? "").trim() || DEFAULT_DEV_DB_PATH;
  const uploadsDir = String(process.env.UPLOADS_DIR ?? "").trim() || DEFAULT_DEV_UPLOADS_DIR;
  const publicUploadsBaseUrl =
    String(process.env.PUBLIC_UPLOADS_BASE_URL ?? "").trim() || DEFAULT_PUBLIC_UPLOADS_BASE_URL;
  const adminUsername = String(process.env.ADMIN_USERNAME ?? "").trim() || (isProduction ? "" : "admin");
  const adminPassword =
    String(process.env.ADMIN_PASSWORD ?? "").trim() || (isProduction ? "" : "admin123");
  const adminAuthSecret =
    String(process.env.ADMIN_AUTH_SECRET ?? "").trim() ||
    (isProduction ? "" : "change-this-long-random-secret-for-dev-only");
  const adminSessionTtlSeconds = Math.max(
    60,
    Number.parseInt(
      process.env.ADMIN_SESSION_TTL_SECONDS || String(DEFAULT_ADMIN_SESSION_TTL_SECONDS),
      10
    ) || DEFAULT_ADMIN_SESSION_TTL_SECONDS
  );
  const chromeExecutablePath =
    String(
      process.env.PUPPETEER_EXECUTABLE_PATH ?? process.env.CHROME_EXECUTABLE_PATH ?? ""
    ).trim() || undefined;
  const trustProxy = normalizeBoolean(process.env.TRUST_PROXY, isProduction);

  const config: RuntimeConfig = {
    isProduction,
    appPort,
    siteUrl,
    publicSiteUrl,
    databasePath: path.resolve(databasePath),
    uploadsDir: path.resolve(uploadsDir),
    publicUploadsBaseUrl: publicUploadsBaseUrl.startsWith("/")
      ? publicUploadsBaseUrl.replace(/\/+$/, "")
      : `${DEFAULT_PUBLIC_UPLOADS_BASE_URL}`,
    adminUsername,
    adminPassword,
    adminAuthSecret,
    adminSessionTtlSeconds,
    chromeExecutablePath,
    trustProxy,
  };

  assertStrongProductionSecrets(config);
  cachedConfig = config;
  return config;
}

export function getSiteUrl() {
  return getRuntimeConfig().publicSiteUrl || DEFAULT_DEV_URL;
}

export function getCanonicalSiteUrl() {
  return getRuntimeConfig().siteUrl || getRuntimeConfig().publicSiteUrl || DEFAULT_DEV_URL;
}

export function isProductionEnvironment() {
  return getRuntimeConfig().isProduction;
}
