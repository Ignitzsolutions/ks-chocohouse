import { randomUUID } from "node:crypto";
import { getDb, initDb } from "@/lib/db";
import type {
  OrderEvent,
  CategoryAnalyticsResponse,
  CategoryAnalyticsRow,
  ProductAnalyticsResponse,
  ProductAnalyticsRow,
  SalesOrderDetail,
  SalesOrderFilters,
  SalesOrderListResponse,
  SalesOrderRow,
  SalesSummaryResponse,
} from "@/types/admin-sales";

type SqlParams = Record<string, string | number>;

type EventInput = {
  orderId: string;
  eventType: string;
  fromValue?: string | null;
  toValue?: string | null;
  actor?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: string;
};

type AnalyticsOrderRow = {
  id: string;
  order_kind?: string | null;
  lifecycle_state?: string | null;
  order_items_json?: string | null;
};

type AnalyticsItemRow = {
  id?: string;
  name?: string;
  category?: string;
  qty?: number;
  lineTotal?: number;
};

const DEFAULT_FILTERS: SalesOrderFilters = {
  page: 1,
  pageSize: 25,
  q: "",
  status: "all",
  paymentStatus: "all",
  source: "all",
  deliveryDate: "",
  deliveryDateFrom: "",
  deliveryDateTo: "",
  slot: "all",
  invoiceReady: "all",
  amountMin: null,
  amountMax: null,
  sortBy: "created_at",
  sortDir: "desc",
};

const ORDER_DATE_ONLY_EXPR =
  "CASE WHEN source = 'offline' AND COALESCE(NULLIF(sale_date, ''), '') <> '' THEN sale_date ELSE date(datetime(created_at), '+330 minutes') END";
const ORDER_DATE_SORT_EXPR =
  "CASE WHEN source = 'offline' AND COALESCE(NULLIF(sale_date, ''), '') <> '' THEN sale_date || ' 00:00:00' ELSE datetime(created_at, '+330 minutes') END";

const SORT_COLUMN_MAP: Record<SalesOrderFilters["sortBy"], string> = {
  created_at: ORDER_DATE_SORT_EXPR,
  delivery_date: "delivery_date",
  total_amount: "total_amount",
  status: "status",
  payment_status: "payment_status",
};

function safeInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDateInput(value: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function normalizeEnum(value: string | null, fallback = "all") {
  const raw = String(value ?? "").trim();
  return raw ? raw : fallback;
}

function getTodayIst() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function parseSalesFilters(searchParams: URLSearchParams): SalesOrderFilters {
  const page = Math.max(1, safeInt(searchParams.get("page"), DEFAULT_FILTERS.page));
  const pageSize = Math.min(
    100,
    Math.max(1, safeInt(searchParams.get("pageSize"), DEFAULT_FILTERS.pageSize))
  );
  const sortByRaw = normalizeEnum(searchParams.get("sortBy"), DEFAULT_FILTERS.sortBy);
  const sortBy = (Object.keys(SORT_COLUMN_MAP) as Array<SalesOrderFilters["sortBy"]>).includes(
    sortByRaw as SalesOrderFilters["sortBy"]
  )
    ? (sortByRaw as SalesOrderFilters["sortBy"])
    : DEFAULT_FILTERS.sortBy;
  const sortDir =
    String(searchParams.get("sortDir") ?? "").toLowerCase() === "asc" ? "asc" : "desc";

  const invoiceReadyRaw = String(searchParams.get("invoiceReady") ?? "all").toLowerCase();
  const invoiceReady: SalesOrderFilters["invoiceReady"] =
    invoiceReadyRaw === "yes" || invoiceReadyRaw === "no" ? invoiceReadyRaw : "all";

  return {
    page,
    pageSize,
    q: String(searchParams.get("q") ?? "").trim(),
    status: normalizeEnum(searchParams.get("status")),
    paymentStatus: normalizeEnum(searchParams.get("paymentStatus")),
    source: normalizeEnum(searchParams.get("source")),
    deliveryDate: normalizeDateInput(searchParams.get("deliveryDate")),
    deliveryDateFrom: normalizeDateInput(searchParams.get("deliveryDateFrom")),
    deliveryDateTo: normalizeDateInput(searchParams.get("deliveryDateTo")),
    slot: normalizeEnum(searchParams.get("slot")),
    invoiceReady,
    amountMin: safeNumber(searchParams.get("amountMin")),
    amountMax: safeNumber(searchParams.get("amountMax")),
    sortBy,
    sortDir,
  };
}

function buildWhere(filters: SalesOrderFilters) {
  const clauses: string[] = [];
  const params: SqlParams = {};

  if (filters.status && filters.status.toLowerCase() !== "all") {
    clauses.push("status = @status");
    params.status = filters.status;
  }

  if (filters.paymentStatus && filters.paymentStatus.toLowerCase() !== "all") {
    clauses.push("payment_status = @paymentStatus");
    params.paymentStatus = filters.paymentStatus;
  }

  if (filters.source && filters.source.toLowerCase() !== "all") {
    clauses.push("source = @source");
    params.source = filters.source;
  }

  if (filters.slot && filters.slot.toLowerCase() !== "all") {
    clauses.push("delivery_slot = @slot");
    params.slot = filters.slot;
  }

  if (filters.deliveryDate) {
    clauses.push("delivery_date = @deliveryDate");
    params.deliveryDate = filters.deliveryDate;
  } else {
    if (filters.deliveryDateFrom) {
      clauses.push("delivery_date >= @deliveryDateFrom");
      params.deliveryDateFrom = filters.deliveryDateFrom;
    }
    if (filters.deliveryDateTo) {
      clauses.push("delivery_date <= @deliveryDateTo");
      params.deliveryDateTo = filters.deliveryDateTo;
    }
  }

  if (filters.invoiceReady === "yes") {
    clauses.push("COALESCE(invoice_ready, 0) = 1");
  }
  if (filters.invoiceReady === "no") {
    clauses.push("COALESCE(invoice_ready, 0) = 0");
  }

  if (filters.amountMin !== null) {
    clauses.push("total_amount >= @amountMin");
    params.amountMin = Math.round(filters.amountMin);
  }
  if (filters.amountMax !== null) {
    clauses.push("total_amount <= @amountMax");
    params.amountMax = Math.round(filters.amountMax);
  }

  if (filters.q) {
    clauses.push(
      "(id LIKE @q ESCAPE '\\' OR customer_name LIKE @q ESCAPE '\\' OR phone LIKE @q ESCAPE '\\' OR payment_reference LIKE @q ESCAPE '\\' OR invoice_number LIKE @q ESCAPE '\\')"
    );
    const escaped = filters.q.replace(/[\\%_]/g, "\\$&");
    params.q = `%${escaped}%`;
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { whereSql, params };
}

function buildAnalyticsWhere(filters: SalesOrderFilters) {
  const { whereSql, params } = buildWhere(filters);
  const voidClause = "COALESCE(lifecycle_state, 'finalized') <> 'void'";
  if (!whereSql) {
    return { whereSql: `WHERE ${voidClause}`, params };
  }
  return { whereSql: `${whereSql} AND ${voidClause}`, params };
}

function appliedFilters(filters: SalesOrderFilters): Record<string, string | number | boolean | null> {
  return {
    q: filters.q || null,
    status: filters.status === "all" ? null : filters.status,
    paymentStatus: filters.paymentStatus === "all" ? null : filters.paymentStatus,
    source: filters.source === "all" ? null : filters.source,
    deliveryDate: filters.deliveryDate || null,
    deliveryDateFrom: filters.deliveryDateFrom || null,
    deliveryDateTo: filters.deliveryDateTo || null,
    slot: filters.slot === "all" ? null : filters.slot,
    invoiceReady:
      filters.invoiceReady === "all"
        ? null
        : filters.invoiceReady === "yes"
          ? true
          : false,
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  };
}

function selectOrderColumns() {
  return `id, cake_name, quantity, customer_name, phone, email, address, pincode,
    sale_date, delivery_date, delivery_slot, cake_message, order_items_json, category_summary, buyer_gst_json, source,
    payment_method, payment_reference, payment_status, payment_verified_at, payment_verified_by,
    txn_id, invoice_number, invoice_ready, paid_at, subtotal_amount, delivery_fee_amount,
    discount_amount, gst_enabled, gst_rate_percent, gst_amount, coupon_code, coupon_snapshot_json, total_amount, order_kind, lifecycle_state,
    parent_order_id, voided_at, voided_by, void_reason, status, created_at, updated_at,
    status_updated_at, payment_updated_at`;
}

export function listSalesOrders(filters: SalesOrderFilters): SalesOrderListResponse {
  initDb();
  const db = getDb();
  const { whereSql, params } = buildWhere(filters);
  const sortColumn = SORT_COLUMN_MAP[filters.sortBy] ?? SORT_COLUMN_MAP.created_at;
  const offset = (filters.page - 1) * filters.pageSize;

  const countRow = db
    .prepare(`SELECT COUNT(*) AS count FROM orders ${whereSql}`)
    .get(params) as { count: number };

  const rows = db
    .prepare(
      `SELECT ${selectOrderColumns()}
       FROM orders
       ${whereSql}
       ORDER BY ${sortColumn} ${filters.sortDir.toUpperCase()}, created_at DESC
       LIMIT @limit OFFSET @offset`
    )
    .all({
      ...params,
      limit: filters.pageSize,
      offset,
    }) as SalesOrderRow[];

  const totalRows = Number(countRow.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / filters.pageSize));

  return {
    rows,
    page: filters.page,
    pageSize: filters.pageSize,
    totalRows,
    totalPages,
    appliedFilters: appliedFilters(filters),
  };
}

export function getSalesSummary(filters: SalesOrderFilters): SalesSummaryResponse {
  initDb();
  const db = getDb();
  const { whereSql, params } = buildWhere(filters);
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS filteredCount,
              COALESCE(SUM(CASE WHEN COALESCE(lifecycle_state, 'finalized') <> 'void' THEN total_amount ELSE 0 END), 0) AS filteredRevenue
       FROM orders
       ${whereSql}`
    )
    .get(params) as { filteredCount: number; filteredRevenue: number };

  const todayIst = getTodayIst();
  const cards = {
    todayOrders:
      (
        db
          .prepare(
            `SELECT COUNT(*) AS count
             FROM orders
             WHERE ${ORDER_DATE_ONLY_EXPR} = ?`
          )
          .get(todayIst) as { count: number }
      )?.count ?? 0,
    todayRevenue:
      Number(
        (
          db
            .prepare(
              `SELECT COALESCE(SUM(total_amount), 0) AS amount
               FROM orders
               WHERE ${ORDER_DATE_ONLY_EXPR} = ?
                 AND COALESCE(payment_status, 'Verification Pending') = 'Verified'
                 AND COALESCE(lifecycle_state, 'finalized') <> 'void'`
            )
            .get(todayIst) as { amount: number }
        )?.amount ?? 0
      ) ?? 0,
    pendingPaymentCount:
      (
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM orders WHERE COALESCE(payment_status, 'Verification Pending') = 'Verification Pending'"
          )
          .get() as { count: number }
      )?.count ?? 0,
    awaitingApprovalCount:
      (
        db
          .prepare("SELECT COUNT(*) AS count FROM orders WHERE status = 'Awaiting Approval'")
          .get() as { count: number }
      )?.count ?? 0,
    todayDeliveriesCount:
      (
        db
          .prepare("SELECT COUNT(*) AS count FROM orders WHERE delivery_date = ?")
          .get(todayIst) as { count: number }
      )?.count ?? 0,
  };

  return {
    cards,
    totals: {
      filteredCount: Number(totals.filteredCount ?? 0),
      filteredRevenue: Number(totals.filteredRevenue ?? 0),
    },
  };
}

export function getSalesOrderDetail(orderId: string): {
  order: SalesOrderDetail | null;
  events: OrderEvent[];
} {
  initDb();
  const db = getDb();
  const order = db
    .prepare(`SELECT ${selectOrderColumns()} FROM orders WHERE id = ? LIMIT 1`)
    .get(orderId) as SalesOrderDetail | undefined;

  const events = db
    .prepare(
      `SELECT id, order_id, event_type, from_value, to_value, actor, meta_json, created_at
       FROM order_events
       WHERE order_id = ?
       ORDER BY created_at DESC`
    )
    .all(orderId) as OrderEvent[];

  return {
    order: order ?? null,
    events,
  };
}

export function getProductAnalytics(filters: SalesOrderFilters): ProductAnalyticsResponse {
  initDb();
  const db = getDb();
  const { whereSql, params } = buildAnalyticsWhere(filters);
  const rows = db
    .prepare(
      `SELECT id, order_kind, lifecycle_state, order_items_json
       FROM orders
       ${whereSql}`
    )
    .all(params) as AnalyticsOrderRow[];

  const map = new Map<string, ProductAnalyticsRow>();

  rows.forEach((order) => {
    const items = (() => {
      try {
        const parsed = JSON.parse(order.order_items_json ?? "[]") as AnalyticsItemRow[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    if (items.length === 0) return;

    const isReturn = order.order_kind === "return";
    const seenInOrder = new Set<string>();
    items.forEach((item) => {
      const productId = String(item.id ?? "").trim();
      if (!productId) return;
      const name = String(item.name ?? "").trim() || productId;
      const category = String(item.category ?? "").trim() || "Uncategorized";
      const qty = Number(item.qty ?? 0);
      const lineTotal = Number(item.lineTotal ?? 0);
      const effectiveQty = isReturn ? -Math.abs(qty) : qty;
      const effectiveRevenue = isReturn ? -Math.abs(lineTotal) : lineTotal;

      if (!map.has(productId)) {
        map.set(productId, {
          productId,
          name,
          category,
          orders: 0,
          quantity: 0,
          revenue: 0,
        });
      }

      const entry = map.get(productId);
      if (!entry) return;
      entry.quantity += effectiveQty;
      entry.revenue += effectiveRevenue;

      if (!seenInOrder.has(productId)) {
        entry.orders += isReturn ? -1 : 1;
        seenInOrder.add(productId);
      }
    });
  });

  const rowsOut = Array.from(map.values()).sort(
    (a, b) => Math.abs(b.revenue) - Math.abs(a.revenue)
  );

  return { rows: rowsOut };
}

export function getCategoryAnalytics(filters: SalesOrderFilters): CategoryAnalyticsResponse {
  initDb();
  const db = getDb();
  const { whereSql, params } = buildAnalyticsWhere(filters);
  const rows = db
    .prepare(
      `SELECT id, order_kind, lifecycle_state, order_items_json
       FROM orders
       ${whereSql}`
    )
    .all(params) as AnalyticsOrderRow[];

  const map = new Map<string, CategoryAnalyticsRow>();

  rows.forEach((order) => {
    const items = (() => {
      try {
        const parsed = JSON.parse(order.order_items_json ?? "[]") as AnalyticsItemRow[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    if (items.length === 0) return;

    const isReturn = order.order_kind === "return";
    const seenInOrder = new Set<string>();
    items.forEach((item) => {
      const category = String(item.category ?? "").trim() || "Uncategorized";
      const qty = Number(item.qty ?? 0);
      const lineTotal = Number(item.lineTotal ?? 0);
      const effectiveQty = isReturn ? -Math.abs(qty) : qty;
      const effectiveRevenue = isReturn ? -Math.abs(lineTotal) : lineTotal;

      if (!map.has(category)) {
        map.set(category, {
          category,
          orders: 0,
          quantity: 0,
          revenue: 0,
        });
      }

      const entry = map.get(category);
      if (!entry) return;
      entry.quantity += effectiveQty;
      entry.revenue += effectiveRevenue;

      if (!seenInOrder.has(category)) {
        entry.orders += isReturn ? -1 : 1;
        seenInOrder.add(category);
      }
    });
  });

  const rowsOut = Array.from(map.values()).sort(
    (a, b) => Math.abs(b.revenue) - Math.abs(a.revenue)
  );

  return { rows: rowsOut };
}

export function parseOrderItemsSummary(orderItemsJson?: string | null) {
  if (!orderItemsJson) return "";
  try {
    const parsed = JSON.parse(orderItemsJson) as Array<{ name?: string; qty?: number }>;
    return parsed
      .slice(0, 4)
      .map((item) => `${item.name ?? "Item"} x${item.qty ?? 0}`)
      .join(" | ");
  } catch {
    return "";
  }
}

export function buildSalesOrdersCsv(filters: SalesOrderFilters) {
  initDb();
  const db = getDb();
  const { whereSql, params } = buildWhere(filters);
  const countRow = db
    .prepare(`SELECT COUNT(*) AS count FROM orders ${whereSql}`)
    .get(params) as { count: number };
  const totalCount = Number(countRow.count ?? 0);

  if (totalCount > 5000) {
    throw new Error("Export limit exceeded (max 5000 rows). Refine filters and try again.");
  }

  const rows = db
    .prepare(
      `SELECT ${selectOrderColumns()}
       FROM orders
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT 5000`
    )
    .all(params) as SalesOrderRow[];

  const headers = [
    "Order ID",
    "Created At",
    "Customer",
    "Phone",
    "Email",
    "Items",
    "Quantity",
    "Amount",
    "Discount",
    "Coupon",
    "Source",
    "Lifecycle",
    "Order Kind",
    "Payment Method",
    "Payment Status",
    "Payment Reference",
    "Delivery Date",
    "Delivery Slot",
    "Status",
    "Invoice Number",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.source === "offline" && row.sale_date ? row.sale_date : row.created_at,
        row.customer_name ?? "",
        row.phone ?? "",
        row.email ?? "",
        parseOrderItemsSummary(row.order_items_json) || row.cake_name,
        row.quantity,
        row.total_amount,
        row.discount_amount ?? 0,
        row.coupon_code ?? "",
        row.source ?? "",
        row.lifecycle_state ?? "finalized",
        row.order_kind ?? "sale",
        row.payment_method ?? "",
        row.payment_status ?? "",
        row.payment_reference ?? "",
        row.delivery_date ?? "",
        row.delivery_slot ?? "",
        row.status ?? "",
        row.invoice_number ?? "",
      ]
        .map(escapeCsv)
        .join(",")
    ),
  ];

  return {
    csv: csvRows.join("\n"),
    totalCount,
  };
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function recordOrderEvent(input: EventInput) {
  initDb();
  const db = getDb();
  db.prepare(
    `INSERT INTO order_events
      (id, order_id, event_type, from_value, to_value, actor, meta_json, created_at)
      VALUES (@id, @order_id, @event_type, @from_value, @to_value, @actor, @meta_json, @created_at)`
  ).run({
    id: randomUUID(),
    order_id: input.orderId,
    event_type: input.eventType,
    from_value: input.fromValue ?? null,
    to_value: input.toValue ?? null,
    actor: input.actor ?? null,
    meta_json: input.meta ? JSON.stringify(input.meta) : null,
    created_at: input.createdAt ?? new Date().toISOString(),
  });
}
