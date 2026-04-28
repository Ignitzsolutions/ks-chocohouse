"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { formatInr } from "@/lib/products";
import { SalesBulkActions } from "@/components/admin/sales-bulk-actions";
import { SalesFilterBar } from "@/components/admin/sales-filter-bar";
import { SalesKpiCards } from "@/components/admin/sales-kpi-cards";
import { SalesOrderDetailDrawer } from "@/components/admin/sales-order-detail-drawer";
import { SalesOrdersTable } from "@/components/admin/sales-orders-table";
import { SalesTablePagination } from "@/components/admin/sales-table-pagination";
import type {
  CategoryAnalyticsResponse,
  OrderEvent,
  ProductAnalyticsResponse,
  SalesOrderDetail,
  SalesOrderFilters,
  SalesOrderListResponse,
  SalesSummaryResponse,
} from "@/types/admin-sales";

const INITIAL_FILTERS: SalesOrderFilters = {
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

type QuickPreset =
  | "needs_payment_review"
  | "awaiting_approval"
  | "today_deliveries"
  | "delivered_today"
  | "all";

type SalesTab = "summary" | "products" | "categories";

function todayIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildQueryString(filters: SalesOrderFilters) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  params.set("sortBy", filters.sortBy);
  params.set("sortDir", filters.sortDir);

  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.paymentStatus !== "all") params.set("paymentStatus", filters.paymentStatus);
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.deliveryDate) params.set("deliveryDate", filters.deliveryDate);
  if (filters.deliveryDateFrom) params.set("deliveryDateFrom", filters.deliveryDateFrom);
  if (filters.deliveryDateTo) params.set("deliveryDateTo", filters.deliveryDateTo);
  if (filters.slot !== "all") params.set("slot", filters.slot);
  if (filters.invoiceReady !== "all") params.set("invoiceReady", filters.invoiceReady);
  if (filters.amountMin !== null) params.set("amountMin", String(filters.amountMin));
  if (filters.amountMax !== null) params.set("amountMax", String(filters.amountMax));

  return params.toString();
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function parseItemSummary(orderItemsJson?: string | null) {
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

export function SalesDashboardShell() {
  const [activeTab, setActiveTab] = useState<SalesTab>("summary");
  const [filters, setFilters] = useState<SalesOrderFilters>(INITIAL_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState(INITIAL_FILTERS.q);
  const [list, setList] = useState<SalesOrderListResponse | null>(null);
  const [summary, setSummary] = useState<SalesSummaryResponse | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalyticsResponse | null>(
    null
  );
  const [categoryAnalytics, setCategoryAnalytics] =
    useState<CategoryAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<SalesOrderDetail | null>(null);
  const [detailEvents, setDetailEvents] = useState<OrderEvent[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.q);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.q]);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      q: debouncedSearch,
    }),
    [debouncedSearch, filters]
  );

  const queryString = useMemo(() => buildQueryString(effectiveFilters), [effectiveFilters]);
  const rows = useMemo(() => list?.rows ?? [], [list]);
  const selectedCount = useMemo(
    () => rows.filter((row) => selectedIds[row.id]).length,
    [rows, selectedIds]
  );

  const loadDashboardData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [ordersRes, summaryRes] = await Promise.all([
          fetch(`/api/admin/sales/orders?${queryString}`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch(`/api/admin/sales/summary?${queryString}`, {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        const ordersData = (await ordersRes.json()) as SalesOrderListResponse & { error?: string };
        const summaryData = (await summaryRes.json()) as SalesSummaryResponse & { error?: string };
        if (!ordersRes.ok) throw new Error(ordersData.error ?? "Failed to load sales orders");
        if (!summaryRes.ok) throw new Error(summaryData.error ?? "Failed to load sales summary");

        setList(ordersData);
        setSummary(summaryData);
        setSelectedIds((prev) => {
          const next: Record<string, boolean> = {};
          (ordersData.rows ?? []).forEach((row) => {
            if (prev[row.id]) next[row.id] = true;
          });
          return next;
        });
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [queryString]
  );

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const loadAnalytics = useCallback(
    async (tab: SalesTab) => {
      if (tab === "summary") return;
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        if (tab === "products") {
          const response = await fetch(`/api/admin/sales/analytics/products?${queryString}`, {
            cache: "no-store",
            credentials: "include",
          });
          const data = (await response.json()) as ProductAnalyticsResponse & { error?: string };
          if (!response.ok) throw new Error(data.error ?? "Failed to load product analytics");
          setProductAnalytics(data);
        } else if (tab === "categories") {
          const response = await fetch(`/api/admin/sales/analytics/categories?${queryString}`, {
            cache: "no-store",
            credentials: "include",
          });
          const data = (await response.json()) as CategoryAnalyticsResponse & { error?: string };
          if (!response.ok) throw new Error(data.error ?? "Failed to load category analytics");
          setCategoryAnalytics(data);
        }
      } catch (err) {
        setAnalyticsError(String(err));
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [queryString]
  );

  useEffect(() => {
    void loadAnalytics(activeTab);
  }, [activeTab, loadAnalytics]);

  const loadOrderDetail = useCallback(async (orderId: string) => {
    setActiveOrderId(orderId);
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetailOrder(null);
    setDetailEvents([]);
    try {
      const response = await fetch(`/api/admin/sales/orders/${encodeURIComponent(orderId)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await response.json()) as {
        order?: SalesOrderDetail;
        events?: OrderEvent[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Failed to load order details");
      setDetailOrder(data.order ?? null);
      setDetailEvents(data.events ?? []);
    } catch (err) {
      setError(String(err));
      setDetailOrder(null);
      setDetailEvents([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const updateFilter = useCallback(
    <K extends keyof SalesOrderFilters>(key: K, value: SalesOrderFilters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        page: key === "page" ? (value as number) : key === "pageSize" ? 1 : 1,
      }));
    },
    []
  );

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setDebouncedSearch("");
  }, []);

  const applyQuickFilter = useCallback((preset: QuickPreset) => {
    const today = todayIst();
    setDebouncedSearch("");
    if (preset === "all") {
      setFilters(INITIAL_FILTERS);
      return;
    }
    setFilters((prev) => {
      const base: SalesOrderFilters = {
        ...INITIAL_FILTERS,
        pageSize: prev.pageSize,
        sortBy: prev.sortBy,
        sortDir: prev.sortDir,
      };
      if (preset === "needs_payment_review") {
        return { ...base, paymentStatus: "Verification Pending" };
      }
      if (preset === "awaiting_approval") {
        return { ...base, status: "Awaiting Approval" };
      }
      if (preset === "today_deliveries") {
        return { ...base, deliveryDate: today };
      }
      return {
        ...base,
        deliveryDate: today,
        status: "Delivered",
      };
    });
  }, []);

  const sortTable = useCallback((nextSortBy: SalesOrderFilters["sortBy"]) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: nextSortBy,
      sortDir: prev.sortBy === nextSortBy && prev.sortDir === "desc" ? "asc" : "desc",
      page: 1,
    }));
  }, []);

  const runOrderMutation = useCallback(
    async (payload: Record<string, unknown>) => {
      const orderId = String(payload.id ?? "");
      if (!orderId) return;
      setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
      setError(null);
      setMessage(null);
      try {
        const response = await fetch("/api/admin/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to update order");
        setMessage(`Updated ${orderId}`);
        await loadDashboardData("refresh");
        if (activeOrderId === orderId) {
          await loadOrderDetail(orderId);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
      }
    },
    [activeOrderId, loadDashboardData, loadOrderDetail]
  );

  const handleStatusUpdate = useCallback(
    async (orderId: string, status: string) => {
      await runOrderMutation({
        id: orderId,
        status,
        adminName: "admin",
      });
    },
    [runOrderMutation]
  );

  const handleVerifyPayment = useCallback(
    async (orderId: string) => {
      await runOrderMutation({
        id: orderId,
        action: "verify_payment",
        adminName: "admin",
      });
    },
    [runOrderMutation]
  );

  const handleRejectPayment = useCallback(
    async (orderId: string) => {
      const ok = window.confirm("Reject payment for this order?");
      if (!ok) return;
      await runOrderMutation({
        id: orderId,
        action: "reject_payment",
        adminName: "admin",
      });
    },
    [runOrderMutation]
  );

  const handleDeleteOrder = useCallback(
    async (orderId: string) => {
      const ok = window.confirm(
        "This permanently deletes the order and its events. This cannot be undone."
      );
      if (!ok) return;
      setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
      setError(null);
      setMessage(null);
      try {
        const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to delete order");
        setMessage(`Deleted ${orderId}`);
        await loadDashboardData("refresh");
        if (activeOrderId === orderId) {
          setDrawerOpen(false);
          setActiveOrderId(null);
          setDetailOrder(null);
          setDetailEvents([]);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
      }
    },
    [activeOrderId, loadDashboardData]
  );

  const handleFinalizeDraft = useCallback(
    async (orderId: string) => {
      await runOrderMutation({
        id: orderId,
        action: "finalize_offline_draft",
        adminName: "admin",
      });
    },
    [runOrderMutation]
  );

  const handleVoidInvoice = useCallback(
    async (orderId: string) => {
      const ok = window.confirm("Void this offline invoice?");
      if (!ok) return;
      await runOrderMutation({
        id: orderId,
        action: "void_offline_invoice",
        adminName: "admin",
      });
    },
    [runOrderMutation]
  );

  const handleCreateReturn = useCallback(
    async (orderId: string) => {
      const ok = window.confirm("Create a return entry for this invoice?");
      if (!ok) return;
      await runOrderMutation({
        id: orderId,
        action: "create_offline_return",
        adminName: "admin",
      });
    },
    [runOrderMutation]
  );

  const exportFilteredCsv = useCallback(() => {
    const url = `/api/admin/sales/export?${queryString}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [queryString]);

  const exportSelectedCsv = useCallback(() => {
    const selectedRows = rows.filter((row) => selectedIds[row.id]);
    if (selectedRows.length === 0) return;
    const lines = [
      [
        "Order ID",
        "Customer",
        "Phone",
        "Email",
        "Items",
        "Qty",
        "Amount",
        "Source",
        "Payment Status",
        "Status",
        "Delivery Date",
      ].join(","),
      ...selectedRows.map((row) =>
        [
          row.id,
          row.customer_name,
          row.phone ?? "",
          row.email ?? "",
          parseItemSummary(row.order_items_json) || row.cake_name,
          row.quantity,
          row.total_amount,
          row.source ?? "",
          row.payment_status ?? "",
          row.status,
          row.delivery_date ?? "",
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `selected-sales-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(href);
  }, [rows, selectedIds]);

  const applyBulkStatus = useCallback(
    async (status: string) => {
      const ids = rows.filter((row) => selectedIds[row.id]).map((row) => row.id);
      if (ids.length === 0) return;
      const ok = window.confirm(`Update ${ids.length} orders to "${status}"?`);
      if (!ok) return;

      setBulkBusy(true);
      setError(null);
      setMessage(null);
      try {
        for (const id of ids) {
          const response = await fetch("/api/admin/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status, adminName: "admin" }),
          });
          const data = (await response.json()) as { error?: string };
          if (!response.ok) throw new Error(data.error ?? `Failed to update ${id}`);
        }
        setMessage(`Updated ${ids.length} orders to ${status}`);
        setSelectedIds({});
        await loadDashboardData("refresh");
        if (activeOrderId && ids.includes(activeOrderId)) {
          await loadOrderDetail(activeOrderId);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setBulkBusy(false);
      }
    },
    [activeOrderId, loadDashboardData, loadOrderDetail, rows, selectedIds]
  );

  return (
    <AdminGuard>
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-[1520px] px-4 py-8 md:px-6 xl:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Badge tone="gold">Sales Dashboard</Badge>
              <h1 className="text-3xl">Sales & Orders</h1>
              <p className="text-sm text-black/60">
                Shopify-style order operations view for payment verification, delivery flow, and invoices.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportFilteredCsv}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => void loadDashboardData("refresh")}
                disabled={refreshing}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <Link
                href="/admin/invoices"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
              >
                Create Offline Sale
              </Link>
              <Link
                href="/admin/coupons"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
              >
                Coupons
              </Link>
              <Link
                href="/admin/orders"
                className="rounded-full bg-[color:var(--berry)] px-4 py-2 text-sm font-semibold text-white"
              >
                Legacy Orders
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {(["summary", "products", "categories"] as SalesTab[]).map((tab) => {
              const label =
                tab === "summary"
                  ? "Sales Summary"
                  : tab === "products"
                    ? "Product Analytics"
                    : "Category Analytics";
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                    active
                      ? "border-black bg-[color:var(--ink)] text-white"
                      : "border-black/10 bg-white text-black/60"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {activeTab === "summary" ? (
            <div className="mt-6">
              <SalesKpiCards summary={summary} loading={loading || refreshing} />
            </div>
          ) : null}

          <div className="mt-5">
            <SalesFilterBar
              filters={filters}
              onChange={updateFilter}
              onReset={resetFilters}
              onQuickFilter={applyQuickFilter}
            />
          </div>

          {activeTab === "summary" ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-black/55">
                {list ? `${list.totalRows} orders • ${formatInr(summary?.totals.filteredRevenue ?? 0)}` : "Loading..."}
              </div>
              <SalesBulkActions
                selectedCount={selectedCount}
                busy={bulkBusy}
                onClear={() => setSelectedIds({})}
                onExportSelected={exportSelectedCsv}
                onApplyStatus={(status) => void applyBulkStatus(status)}
              />
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {analyticsError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {analyticsError}
            </div>
          ) : null}
          {message ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          {activeTab === "summary" ? (
            <>
              <div className="mt-4">
                <SalesOrdersTable
                  rows={rows}
                  loading={loading}
                  selectedIds={selectedIds}
                  updatingIds={updatingIds}
                  sortBy={filters.sortBy}
                  sortDir={filters.sortDir}
                  onSort={sortTable}
                  onToggleSelect={(orderId, checked) =>
                    setSelectedIds((prev) => ({ ...prev, [orderId]: checked }))
                  }
                  onToggleSelectAll={(checked) => {
                    if (!checked) {
                      setSelectedIds({});
                      return;
                    }
                    setSelectedIds(
                      rows.reduce<Record<string, boolean>>((acc, row) => {
                        acc[row.id] = true;
                        return acc;
                      }, {})
                    );
                  }}
                  onOpenOrder={(orderId) => void loadOrderDetail(orderId)}
                  onStatusUpdate={handleStatusUpdate}
                  onVerifyPayment={handleVerifyPayment}
                  onRejectPayment={handleRejectPayment}
                  onFinalizeDraft={handleFinalizeDraft}
                  onVoidInvoice={handleVoidInvoice}
                  onCreateReturn={handleCreateReturn}
                  onDeleteOrder={handleDeleteOrder}
                />
              </div>

              <div className="mt-2">
                <SalesTablePagination
                  page={list?.page ?? filters.page}
                  pageSize={list?.pageSize ?? filters.pageSize}
                  totalRows={list?.totalRows ?? 0}
                  totalPages={list?.totalPages ?? 1}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-black/5 bg-white">
              <div className="overflow-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-[color:var(--cream)]">
                    <tr className="border-b border-black/5 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                      {activeTab === "products" ? <th className="px-4 py-3">Product</th> : null}
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Orders</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {analyticsLoading ? (
                      <tr>
                        <td
                          colSpan={activeTab === "products" ? 5 : 4}
                          className="px-4 py-8 text-center text-black/50"
                        >
                          Loading analytics...
                        </td>
                      </tr>
                    ) : activeTab === "products" ? (
                      (productAnalytics?.rows ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-black/50">
                            No product analytics data for the current filters.
                          </td>
                        </tr>
                      ) : (
                        productAnalytics?.rows.map((row) => (
                          <tr key={row.productId}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[color:var(--ink)]">{row.name}</p>
                              <p className="text-xs text-black/45">{row.productId}</p>
                            </td>
                            <td className="px-4 py-3">{row.category}</td>
                            <td className="px-4 py-3">{row.orders}</td>
                            <td className="px-4 py-3">{row.quantity}</td>
                            <td className="px-4 py-3 font-semibold">{formatInr(row.revenue)}</td>
                          </tr>
                        ))
                      )
                    ) : (categoryAnalytics?.rows ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-black/50">
                          No category analytics data for the current filters.
                        </td>
                      </tr>
                    ) : (
                      categoryAnalytics?.rows.map((row) => (
                        <tr key={row.category}>
                          <td className="px-4 py-3 font-semibold">{row.category}</td>
                          <td className="px-4 py-3">{row.orders}</td>
                          <td className="px-4 py-3">{row.quantity}</td>
                          <td className="px-4 py-3 font-semibold">{formatInr(row.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
        <SiteFooter />

        <SalesOrderDetailDrawer
          key={`${detailOrder?.id ?? "none"}-${detailOrder?.status ?? "none"}`}
          open={drawerOpen}
          order={detailOrder}
          events={detailEvents}
          loading={detailLoading}
          busy={Boolean(activeOrderId && updatingIds[activeOrderId]) || bulkBusy}
          onClose={() => {
            setDrawerOpen(false);
            setActiveOrderId(null);
            setDetailOrder(null);
            setDetailEvents([]);
          }}
          onStatusUpdate={handleStatusUpdate}
          onVerifyPayment={handleVerifyPayment}
          onRejectPayment={handleRejectPayment}
          onFinalizeDraft={handleFinalizeDraft}
          onVoidInvoice={handleVoidInvoice}
          onCreateReturn={handleCreateReturn}
          onDeleteOrder={handleDeleteOrder}
        />
      </div>
    </AdminGuard>
  );
}
