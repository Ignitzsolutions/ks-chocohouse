import type Database from "better-sqlite3";

function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

export function toDateCode(date: Date) {
  return `${pad(date.getDate())}${pad(date.getMonth() + 1)}${pad(date.getFullYear() % 100)}`;
}

export function parseOrderIdDate(orderId: string) {
  const datePart = orderId.split("-")[1] ?? "";
  if (/^\d{6}$/.test(datePart)) {
    return datePart;
  }
  if (/^\d{8}$/.test(datePart)) {
    return `${datePart.slice(6, 8)}${datePart.slice(4, 6)}${datePart.slice(2, 4)}`;
  }
  return null;
}

function parseInvoiceNumberDateCode(invoiceNumber?: string | null) {
  const raw = String(invoiceNumber ?? "").trim();
  if (!raw) return null;

  const saleMatch = raw.match(/^KS-(?:WEB|OFF)-(\d{6})-\d+$/i);
  if (saleMatch) return saleMatch[1];

  const returnMatch = raw.match(/^KSC-RTN-\d+-(\d{6})$/i);
  if (returnMatch) return returnMatch[1];

  return null;
}

export function formatDateCode(dateCode?: string | null) {
  const raw = String(dateCode ?? "").trim();
  if (!/^\d{6}$/.test(raw)) return "-";
  const day = raw.slice(0, 2);
  const month = raw.slice(2, 4);
  const year = `20${raw.slice(4, 6)}`;
  return `${day}-${month}-${year}`;
}

function normalizeReferenceDate(referenceDate?: string | null, fallbackOrderId?: string) {
  const raw = String(referenceDate ?? "").trim();
  if (raw) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return toDateCode(date);
    }

    const datePart = raw.includes("T") ? raw.slice(0, 10) : raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [year, month, day] = datePart.split("-");
      return `${day}${month}${year.slice(2, 4)}`;
    }
  }

  const fallback = fallbackOrderId ? parseOrderIdDate(fallbackOrderId) : null;
  if (fallback) return fallback;

  return toDateCode(new Date());
}

function resolveInvoiceDateCode(
  orderId: string,
  source?: string | null,
  orderKind?: string | null,
  referenceDate?: string | null
) {
  if (source === "offline" && orderKind !== "return") {
    return normalizeReferenceDate(referenceDate, orderId);
  }

  if (orderKind !== "return") {
    const fromOrderId = parseOrderIdDate(orderId);
    if (fromOrderId) return fromOrderId;
  }

  return normalizeReferenceDate(referenceDate, orderId);
}

export function resolveInvoiceType(
  orderId: string,
  source?: string | null,
  orderKind?: string | null
) {
  if (orderKind === "return" || orderId.startsWith("RTN-")) return "RTN";
  if (source === "offline" || orderId.startsWith("OFF-")) return "OFF";
  return "WEB";
}

export function buildInvoiceNumberForSequence(
  type: string,
  dateCode: string,
  sequence: number
) {
  const serial = String(Math.max(1, sequence)).padStart(3, "0");
  if (type === "RTN") {
    return `KSC-${type}-${serial}-${dateCode}`;
  }
  return `KS-${type}-${dateCode}-${serial}`;
}

export function getInvoiceSeries(
  orderId: string,
  source?: string | null,
  orderKind?: string | null,
  referenceDate?: string | null
) {
  const type = resolveInvoiceType(orderId, source, orderKind);
  const dateCode = resolveInvoiceDateCode(orderId, source, orderKind, referenceDate);
  return {
    type,
    dateCode,
    prefix: type === "RTN" ? `KSC-${type}-` : `KS-${type}-${dateCode}-`,
  };
}

function parseSequenceFromInvoiceNumber(invoiceNumber: string, prefix: string) {
  if (!invoiceNumber.startsWith(prefix)) return null;
  const remainder = invoiceNumber.slice(prefix.length);
  const [serial] = remainder.split("-");
  if (!/^\d+$/.test(serial ?? "")) return null;
  const parsed = Number.parseInt(serial, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function buildInvoiceNumber(
  orderId: string,
  source?: string | null,
  orderKind?: string | null,
  referenceDate?: string | null,
  sequence = 1
) {
  const { type, dateCode } = getInvoiceSeries(orderId, source, orderKind, referenceDate);
  return buildInvoiceNumberForSequence(type, dateCode, sequence);
}

export function allocateNextInvoiceNumber(
  db: Database.Database,
  orderId: string,
  source?: string | null,
  orderKind?: string | null,
  referenceDate?: string | null
) {
  const { prefix, type, dateCode } = getInvoiceSeries(orderId, source, orderKind, referenceDate);
  const rows = db
    .prepare(
      `SELECT invoice_number
       FROM orders
       WHERE invoice_number LIKE @pattern`
    )
    .all({
      pattern: type === "RTN" ? `${prefix}%-${dateCode}` : `${prefix}%`,
    }) as Array<{ invoice_number: string | null }>;

  let nextSequence = 1;
  for (const row of rows) {
    const invoiceNumber = String(row.invoice_number ?? "");
    const parsed = parseSequenceFromInvoiceNumber(invoiceNumber, prefix);
    if (parsed && parsed >= nextSequence) {
      nextSequence = parsed + 1;
    }
  }

  return buildInvoiceNumberForSequence(type, dateCode, nextSequence);
}

type PersistedInvoiceRow = {
  id: string;
  source: string | null;
  order_kind: string | null;
  sale_date: string | null;
  paid_at: string | null;
  created_at: string | null;
  invoice_number: string | null;
  invoice_ready: number | null;
};

function getReferenceTimestamp(row: PersistedInvoiceRow) {
  const rawReferenceDate =
    row.source === "offline" ? row.sale_date : row.paid_at || row.created_at;
  const parsed = rawReferenceDate ? new Date(rawReferenceDate).getTime() : Number.NaN;
  if (!Number.isNaN(parsed)) return parsed;

  const createdAt = row.created_at ? new Date(row.created_at).getTime() : Number.NaN;
  if (!Number.isNaN(createdAt)) return createdAt;

  return 0;
}

export function resequenceInvoiceNumbers(rows: PersistedInvoiceRow[]) {
  const relevantRows = rows
    .filter((row) => row.invoice_number || Number(row.invoice_ready ?? 0) === 1)
    .map((row) => {
      const referenceDate =
        row.source === "offline" ? row.sale_date : row.paid_at || row.created_at;
      const series = getInvoiceSeries(row.id, row.source, row.order_kind, referenceDate);
      return {
        row,
        series,
        referenceTimestamp: getReferenceTimestamp(row),
        createdAt: row.created_at ?? "",
      };
    })
    .sort((left, right) => {
      if (left.series.type !== right.series.type) {
        return left.series.type.localeCompare(right.series.type);
      }
      if (left.series.dateCode !== right.series.dateCode) {
        return left.series.dateCode.localeCompare(right.series.dateCode);
      }
      if (left.referenceTimestamp !== right.referenceTimestamp) {
        return left.referenceTimestamp - right.referenceTimestamp;
      }
      if (left.createdAt !== right.createdAt) {
        return left.createdAt.localeCompare(right.createdAt);
      }
      return left.row.id.localeCompare(right.row.id);
    });

  const counters = new Map<string, number>();

  return relevantRows.map(({ row, series }) => {
    const counterKey = `${series.type}:${series.dateCode}`;
    const nextSequence = (counters.get(counterKey) ?? 0) + 1;
    counters.set(counterKey, nextSequence);

    return {
      id: row.id,
      invoice_number: buildInvoiceNumberForSequence(
        series.type,
        series.dateCode,
        nextSequence
      ),
    };
  });
}

export function buildInvoiceFilename(invoiceNumber: string) {
  return `${invoiceNumber.replace(/[^A-Z0-9-]+/gi, "-")}.pdf`;
}

export function resolveInvoiceDisplayDate(
  orderId: string,
  source?: string | null,
  orderKind?: string | null,
  referenceDate?: string | null,
  invoiceNumber?: string | null
) {
  const dateCode =
    parseInvoiceNumberDateCode(invoiceNumber) ??
    getInvoiceSeries(orderId, source, orderKind, referenceDate).dateCode;

  return formatDateCode(dateCode);
}
