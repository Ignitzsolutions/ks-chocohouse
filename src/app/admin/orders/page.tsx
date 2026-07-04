"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { AdminGuard } from "@/components/admin-guard";

const statusOptions = [
  "All",
  "Payment Verification Pending",
  "Awaiting Approval",
  "Baking",
  "Out for Delivery",
  "Delivered",
  "Payment Rejected",
  "Cancelled",
];

const slotOptions = [
  "All",
  "10:00 AM - 11:30 AM",
  "12:00 PM - 1:30 PM",
  "3:00 PM - 4:30 PM",
  "5:00 PM - 6:30 PM",
];

type OrderRow = {
  id: string;
  cake_name: string;
  quantity: number;
  customer_name: string;
  phone: string;
  sale_date?: string | null;
  delivery_date: string;
  delivery_slot: string;
  status: string;
  total_amount: number;
  order_items_json?: string | null;
  category_summary?: string | null;
  payment_reference?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  source?: string | null;
  invoice_number?: string | null;
  invoice_ready?: number;
};

function formatRupee(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("All");
  const [slot, setSlot] = useState("All");
  const [date, setDate] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>({});
  const [codPhones, setCodPhones] = useState<Record<string, string>>({});
  const [verifyTarget, setVerifyTarget] = useState<OrderRow | null>(null);
  const [verifyInput, setVerifyInput] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "All") params.set("status", status);
    if (slot !== "All") params.set("slot", slot);
    if (date) params.set("date", date);
    return params.toString();
  }, [status, slot, date]);

  const loadOrders = useCallback(async () => {
    const res = await fetch(`/api/admin/orders?${query}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOrders();
  }, [loadOrders]);

  const updateOrder = async (payload: Record<string, unknown>) => {
    const id = String(payload.id ?? "");
    setUpdating((prev) => ({ ...prev, [id]: true }));
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setUpdating((prev) => ({ ...prev, [id]: false }));
    await loadOrders();
  };

  return (
    <AdminGuard>
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <Badge tone="gold">Admin Dashboard</Badge>
              <h1 className="text-3xl">Order Queue</h1>
              <p className="text-sm text-black/60">
                Verify payment references, approve orders, and manage delivery status.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/sales"
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
              >
                Sales Dashboard
              </Link>
              <Link
                href="/admin/products"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
              >
                Manage Products
              </Link>
              <Link
                href="/admin/invoices"
                className="rounded-full bg-[color:var(--berry)] px-4 py-2 text-sm font-semibold text-white"
              >
                Offline Invoice
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
              >
                Settings
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 rounded-3xl border border-black/5 bg-white p-6 md:grid-cols-3">
            <label className="text-sm font-semibold text-black/70">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-black/70">
              Delivery Slot
              <select
                value={slot}
                onChange={(event) => setSlot(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              >
                {slotOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-black/70">
              Delivery Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-black/5 bg-white">
            <div className="grid grid-cols-[1.1fr_1.2fr_1fr_1.2fr_1.2fr] gap-3 border-b border-black/5 bg-[color:var(--cream)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
              <span>Order</span>
              <span>Customer</span>
              <span>Delivery</span>
              <span>Status</span>
              <span>Payment / Invoice</span>
            </div>
            <div className="divide-y divide-black/5">
              {loading && <div className="px-6 py-6 text-sm text-black/50">Loading orders...</div>}
              {!loading && orders.length === 0 && (
                <div className="px-6 py-6 text-sm text-black/50">
                  No orders for the selected filters.
                </div>
              )}
              {orders.map((order) => {
                const paymentPending = (order.payment_status ?? "Verification Pending") === "Verification Pending";
                const invoiceReady =
                  Number(order.invoice_ready ?? 0) === 1 && Boolean(order.invoice_number);

                return (
                  <div
                    key={order.id}
                    className="grid grid-cols-[1.1fr_1.2fr_1fr_1.2fr_1.2fr] gap-3 px-6 py-4 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-black">{order.cake_name}</p>
                      <p className="text-xs text-black/50">{order.id}</p>
                      {order.category_summary && (
                        <p className="mt-1 text-xs text-black/50">{order.category_summary}</p>
                      )}
                      <p className="mt-1 text-xs text-black/40">{parseItemSummary(order.order_items_json)}</p>
                      <p className="mt-1 text-xs text-black/45">
                        Source: {order.source ?? "online"} • {formatRupee(Number(order.total_amount))}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold">{order.customer_name}</p>
                      <p className="text-xs text-black/50">{order.phone || "-"}</p>
                      <p className="mt-1 text-xs text-black/55">
                        Payment: {order.payment_method || "-"}
                      </p>
                      <p className="text-xs text-black/55">
                        Ref: {order.payment_reference || "-"}
                      </p>
                    </div>

                    <div>
                      <p>
                        {order.source === "offline"
                          ? order.sale_date || "-"
                          : order.delivery_date || "-"}
                      </p>
                      <p className="text-xs text-black/50">{order.delivery_slot || "-"}</p>
                    </div>

                    <div>
                      <div className="space-y-2">
                        <p className="text-xs text-black/55">
                          Payment status: {order.payment_status ?? "Verification Pending"}
                        </p>
                        <select
                          value={draftStatus[order.id] ?? order.status}
                          onChange={(event) =>
                            setDraftStatus((prev) => ({
                              ...prev,
                              [order.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-full border border-black/10 bg-[color:var(--cream)] px-3 py-1 text-xs font-semibold"
                        >
                          {statusOptions
                            .filter((option) => option !== "All")
                            .map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                        </select>
                        <button
                          className="text-xs font-semibold text-[color:var(--berry)]"
                          onClick={() =>
                            updateOrder({
                              id: order.id,
                              status: draftStatus[order.id] ?? order.status,
                            })
                          }
                          disabled={updating[order.id]}
                        >
                          {updating[order.id] ? "Updating..." : "Update"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {invoiceReady ? (
                        <div className="space-y-2">
                          <a
                            href={`/api/orders/${order.id}/invoice`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--berry)]"
                          >
                            Download Invoice PDF
                          </a>
                          <a
                            href={`/api/orders/${order.id}/barcode`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--berry)]"
                          >
                            Open Barcode
                          </a>
                          <a
                            href={`/api/orders/${order.id}/barcode?download=1`}
                            className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--berry)]"
                          >
                            Download Barcode
                          </a>
                          <a
                            href={`/admin/labels/${encodeURIComponent(order.id)}?autoprint=1`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--berry)]"
                          >
                            Print Label
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-black/55">
                          Invoice available after payment verification.
                        </p>
                      )}

                      {paymentPending && order.source !== "offline" && (
                        <div className="space-y-2">
                          <button
                            className="w-full rounded-full bg-[color:var(--berry)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                            onClick={() => {
                              setVerifyTarget(order);
                              setVerifyInput("");
                            }}
                            disabled={updating[order.id]}
                          >
                            Verify Payment & Accept
                          </button>
                          <button
                            className="w-full rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                            onClick={() =>
                              updateOrder({
                                id: order.id,
                                action: "reject_payment",
                                adminName: "admin",
                              })
                            }
                            disabled={updating[order.id]}
                          >
                            Reject Payment
                          </button>
                        </div>
                      )}

                      <input
                        value={codPhones[order.id] ?? ""}
                        onChange={(event) =>
                          setCodPhones((prev) => ({
                            ...prev,
                            [order.id]: event.target.value,
                          }))
                        }
                        placeholder="Enter phone to confirm COD"
                        className="w-full rounded-full border border-black/10 bg-[color:var(--cream)] px-3 py-2 text-xs"
                      />
                      <button
                        className="w-full rounded-full bg-[color:var(--berry)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        onClick={() =>
                          updateOrder({
                            id: order.id,
                            status: "Delivered",
                          })
                        }
                        disabled={
                          updating[order.id] ||
                          !order.phone ||
                          (codPhones[order.id] ?? "") !== order.phone
                        }
                      >
                        Complete COD
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
        <SiteFooter />
        {verifyTarget && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={() => {
              if (!updating[verifyTarget.id]) {
                setVerifyTarget(null);
                setVerifyInput("");
              }
            }}
          >
            <div
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="text-lg font-semibold">Confirm payment verification</h2>
              <p className="mt-2 text-sm text-black/70">
                You are about to mark this order as paid. This action is logged and
                cannot be silently undone.
              </p>
              <dl className="mt-4 space-y-2 rounded-2xl bg-black/5 p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="font-semibold text-black/60">Order</dt>
                  <dd className="font-mono">{verifyTarget.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold text-black/60">Amount</dt>
                  <dd className="font-semibold">
                    {formatRupee(Number(verifyTarget.total_amount))}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-semibold text-black/60">Payment ref</dt>
                  <dd className="break-all font-mono text-right">
                    {verifyTarget.payment_reference ?? "—"}
                  </dd>
                </div>
              </dl>
              <label className="mt-4 block text-sm font-semibold text-black/70">
                Type the last 4 characters of the payment reference to confirm
                <input
                  autoFocus
                  value={verifyInput}
                  onChange={(event) => setVerifyInput(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-2 font-mono text-base uppercase tracking-widest"
                  maxLength={8}
                />
              </label>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold"
                  onClick={() => {
                    setVerifyTarget(null);
                    setVerifyInput("");
                  }}
                  disabled={updating[verifyTarget.id]}
                >
                  Cancel
                </button>
                <button
                  className="rounded-full bg-[color:var(--berry)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={
                    updating[verifyTarget.id] ||
                    !verifyTarget.payment_reference ||
                    verifyInput.trim().toUpperCase() !==
                      String(verifyTarget.payment_reference).slice(-4).toUpperCase()
                  }
                  onClick={async () => {
                    const target = verifyTarget;
                    await updateOrder({
                      id: target.id,
                      action: "verify_payment",
                      adminName: "admin",
                    });
                    setVerifyTarget(null);
                    setVerifyInput("");
                  }}
                >
                  {updating[verifyTarget.id] ? "Verifying…" : "Confirm & Verify"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
