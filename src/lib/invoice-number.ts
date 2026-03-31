function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

function parseInvoiceSuffix(orderId: string) {
  const [, datePart = "", serialPart = ""] = orderId.split("-");
  const year = /^\d{8}$/.test(datePart)
    ? datePart.slice(2, 4)
    : pad(new Date().getFullYear() % 100);
  const serial = Number.parseInt(serialPart, 10);
  const sequence = Number.isFinite(serial) && serial > 0 ? String(serial).padStart(2, "0") : "01";
  return `${year}${sequence}`;
}

function resolveInvoiceType(orderId: string, source?: string | null, orderKind?: string | null) {
  if (orderKind === "return" || orderId.startsWith("RTN-")) return "RTN";
  if (source === "offline" || orderId.startsWith("OFF-")) return "OFF";
  return "ONL";
}

export function buildInvoiceNumber(
  orderId: string,
  source?: string | null,
  orderKind?: string | null
) {
  return `KSCH-${resolveInvoiceType(orderId, source, orderKind)}-${parseInvoiceSuffix(orderId)}`;
}

export function buildInvoiceFilename(invoiceNumber: string) {
  return `${invoiceNumber.replace(/[^A-Z0-9-]+/gi, "-")}.pdf`;
}
