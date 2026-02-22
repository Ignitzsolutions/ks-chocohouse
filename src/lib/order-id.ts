import { getDb } from "@/lib/db";

function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

export function generateOrderId(prefix = "KSC", now = new Date()) {
  const key = dateKey(now);
  const base = `${prefix}-${key}`;
  const likePattern = `${base}-%`;

  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM orders WHERE id LIKE ?")
    .get(likePattern) as { count: number };

  for (let bump = 0; bump < 20; bump += 1) {
    const serial = String(row.count + 1 + bump).padStart(3, "0");
    const candidate = `${base}-${serial}`;
    const exists = getDb()
      .prepare("SELECT 1 AS ok FROM orders WHERE id = ? LIMIT 1")
      .get(candidate) as { ok?: number } | undefined;
    if (!exists) return candidate;
  }

  return `${base}-${Date.now().toString().slice(-4)}`;
}
