import fs from "node:fs/promises";

const outputPath = process.argv[2];

if (!outputPath) {
  process.stderr.write("Usage: node scripts/render-production-env.mjs <output-path>\n");
  process.exit(1);
}

const requiredKeys = [
  "NODE_ENV",
  "APP_PORT",
  "PORT",
  "SITE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "TRUST_PROXY",
  "DATABASE_PATH",
  "UPLOADS_DIR",
  "PUBLIC_UPLOADS_BASE_URL",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_AUTH_SECRET",
  "ADMIN_SESSION_TTL_SECONDS",
  "CHROME_EXECUTABLE_PATH",
];

const optionalKeys = [
  "NEXT_PUBLIC_UPI_QR_IMAGE",
  "NEXT_PUBLIC_UPI_LABEL",
  "BACKUP_DIR",
  "DAILY_RETENTION",
  "WEEKLY_RETENTION",
  "MONTHLY_RETENTION",
  "BACKUP_OFFSITE_ENABLED",
  "BACKUP_OFFSITE_TOOL",
  "BACKUP_OFFSITE_REMOTE",
  "BACKUP_ALERT_WEBHOOK_URL",
];

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function getRequiredValue(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required production env key: ${key}`);
  }
  return value;
}

const lines = requiredKeys.map((key) => `${key}=${shellQuote(getRequiredValue(key))}`);

for (const key of optionalKeys) {
  const value = process.env[key];
  if (value) {
    lines.push(`${key}=${shellQuote(value)}`);
  }
}

await fs.writeFile(outputPath, `${lines.join("\n")}\n`, {
  encoding: "utf8",
  mode: 0o600,
});

process.stdout.write(`Wrote production env to ${outputPath}\n`);
