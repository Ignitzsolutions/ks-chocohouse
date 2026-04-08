function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

function parseOrderSerial(orderId: string) {
  const serialPart = orderId.split("-").at(-1) ?? "";
  const serial = Number.parseInt(serialPart, 10);
  return Number.isFinite(serial) && serial > 0 ? String(serial).padStart(3, "0") : "001";
}

function parseOrderIdDate(orderId: string) {
  const datePart = orderId.split("-")[1] ?? "";
  if (!/^\d{8}$/.test(datePart)) return null;
  return `${datePart.slice(2, 4)}${datePart.slice(4, 6)}${datePart.slice(6, 8)}`;
}

function parseReferenceDate(referenceDate?: string | null, fallbackOrderId?: string) {
  const raw = String(referenceDate ?? "").trim();
  const datePart = raw.includes("T") ? raw.slice(0, 10) : raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");
    return `${year.slice(2, 4)}${month}${day}`;
  }

  const fallback = fallbackOrderId ? parseOrderIdDate(fallbackOrderId) : null;
  if (fallback) return fallback;

  const now = new Date();
  return `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}

function resolveInvoiceType(orderId: string, source?: string | null, orderKind?: string | null) {
  if (orderKind === "return" || orderId.startsWith("RTN-")) return "RTN";
  if (source === "offline" || orderId.startsWith("OFF-")) return "OFF";
  return "WEB";
}

export function buildInvoiceNumber(
  orderId: string,
  source?: string | null,
  orderKind?: string | null,
  referenceDate?: string | null
) {
  const dateCode = parseReferenceDate(referenceDate, orderId);
  const serial = parseOrderSerial(orderId);
  return `KS-${resolveInvoiceType(orderId, source, orderKind)}-${dateCode}-${serial}`;
}

export function buildInvoiceFilename(invoiceNumber: string) {
  return `${invoiceNumber.replace(/[^A-Z0-9-]+/gi, "-")}.pdf`;
}
