"use client";

import { formatInr } from "@/lib/products";
import type { SalesOrderFilters, SalesOrderRow } from "@/types/admin-sales";
import { SalesOrderRowActions } from "@/components/admin/sales-order-row-actions";

type Props = {
  rows: SalesOrderRow[];
  loading?: boolean;
  selectedIds: Record<string, boolean>;
  updatingIds?: Record<string, boolean>;
  sortBy: SalesOrderFilters["sortBy"];
  sortDir: SalesOrderFilters["sortDir"];
  onSort: (sortBy: SalesOrderFilters["sortBy"]) => void;
  onToggleSelect: (orderId: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onOpenOrder: (orderId: string) => void;
  onStatusUpdate: (orderId: string, status: string) => Promise<void> | void;
  onVerifyPayment: (orderId: string) => Promise<void> | void;
  onRejectPayment: (orderId: string) => Promise<void> | void;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function parseItemSummary(orderItemsJson?: string | null) {
  if (!orderItemsJson) return "";
  try {
    const parsed = JSON.parse(orderItemsJson) as Array<{ name?: string; qty?: number }>;
    return parsed
      .slice(0, 3)
      .map((item) => `${item.name ?? "Item"} x${item.qty ?? 0}`)
      .join(" | ");
  } catch {
    return "";
  }
}

function headerLabel(sortBy: SalesOrderFilters["sortBy"], currentBy: string, currentDir: string) {
  if (currentBy !== sortBy) return "";
  return currentDir === "asc" ? " ↑" : " ↓";
}

export function SalesOrdersTable({
  rows,
  loading = false,
  selectedIds,
  updatingIds = {},
  sortBy,
  sortDir,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onOpenOrder,
  onStatusUpdate,
  onVerifyPayment,
  onRejectPayment,
}: Props) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds[row.id]);

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
      <div className="overflow-auto">
        <table className="min-w-[1320px] w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[color:var(--cream)]">
            <tr className="border-b border-black/5 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => onToggleSelectAll(event.target.checked)}
                  aria-label="Select all rows"
                />
              </th>
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("created_at")} className="font-semibold">
                  Order{headerLabel("created_at", sortBy, sortDir)}
                </button>
              </th>
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Items</th>
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("total_amount")} className="font-semibold">
                  Amount{headerLabel("total_amount", sortBy, sortDir)}
                </button>
              </th>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("payment_status")} className="font-semibold">
                  Payment{headerLabel("payment_status", sortBy, sortDir)}
                </button>
              </th>
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("delivery_date")} className="font-semibold">
                  Delivery{headerLabel("delivery_date", sortBy, sortDir)}
                </button>
              </th>
              <th className="px-3 py-3">
                <button type="button" onClick={() => onSort("status")} className="font-semibold">
                  Status{headerLabel("status", sortBy, sortDir)}
                </button>
              </th>
              <th className="px-3 py-3">Invoice</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-black/50">
                  Loading sales orders...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-black/50">
                  No orders match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const itemSummary = parseItemSummary(row.order_items_json);
                const invoiceReady =
                  Number(row.invoice_ready ?? 0) === 1 || Boolean(row.invoice_number);
                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer align-top hover:bg-[color:var(--cream)]/55"
                    onClick={() => onOpenOrder(row.id)}
                  >
                    <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedIds[row.id])}
                        onChange={(event) => onToggleSelect(row.id, event.target.checked)}
                        aria-label={`Select ${row.id}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-[color:var(--ink)]">{row.id}</p>
                      <p className="text-xs text-black/50">{formatDateTime(row.created_at)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold">{row.customer_name || "Customer"}</p>
                      <p className="text-xs text-black/50">{row.phone || "-"}</p>
                      {row.email ? <p className="text-xs text-black/45">{row.email}</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{row.cake_name}</p>
                      {row.category_summary ? (
                        <p className="text-xs text-black/50">{row.category_summary}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-black/45">
                        {itemSummary || "No item summary"} • Qty {row.quantity}
                      </p>
                    </td>
                    <td className="px-3 py-3 font-semibold">{formatInr(Number(row.total_amount))}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-black/10 bg-[color:var(--cream)] px-2 py-1 text-xs font-semibold uppercase">
                        {row.source ?? "online"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{row.payment_status ?? "Verification Pending"}</p>
                      <p className="text-xs text-black/50">{row.payment_method || "-"}</p>
                      <p className="text-xs text-black/45">{row.payment_reference || "-"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p>{row.delivery_date || "-"}</p>
                      <p className="text-xs text-black/50">{row.delivery_slot || "-"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-xs font-semibold">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {invoiceReady ? (
                        <a
                          href={`/api/orders/${row.id}/invoice`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-[color:var(--berry)]"
                        >
                          PDF
                        </a>
                      ) : (
                        <span className="text-xs text-black/45">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                      <SalesOrderRowActions
                        key={`${row.id}-${row.status}-${row.payment_status ?? ""}`}
                        order={row}
                        busy={Boolean(updatingIds[row.id])}
                        onStatusUpdate={onStatusUpdate}
                        onVerifyPayment={onVerifyPayment}
                        onRejectPayment={onRejectPayment}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
