"use client";

import { useMemo, useState } from "react";
import { formatInr } from "@/lib/products";
import type { OrderEvent, SalesOrderDetail } from "@/types/admin-sales";

const STATUS_OPTIONS = [
  "Payment Verification Pending",
  "Awaiting Approval",
  "Baking",
  "Out for Delivery",
  "Delivered",
  "Payment Rejected",
  "Cancelled",
];

type Props = {
  open: boolean;
  order: SalesOrderDetail | null;
  events: OrderEvent[];
  loading?: boolean;
  busy?: boolean;
  onClose: () => void;
  onStatusUpdate: (orderId: string, status: string) => Promise<void> | void;
  onVerifyPayment: (orderId: string) => Promise<void> | void;
  onRejectPayment: (orderId: string) => Promise<void> | void;
  onFinalizeDraft?: (orderId: string) => Promise<void> | void;
  onVoidInvoice?: (orderId: string) => Promise<void> | void;
  onCreateReturn?: (orderId: string) => Promise<void> | void;
  onDeleteOrder?: (orderId: string) => Promise<void> | void;
};

function parseBuyerGst(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as {
      businessName?: string;
      gstin?: string;
      billingAddress?: string;
    };
    if (!parsed.businessName && !parsed.gstin && !parsed.billingAddress) return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function parseItems(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as Array<{
      name?: string;
      qty?: number;
      unitPrice?: number;
      lineTotal?: number;
      customizationNote?: string;
    }>;
    return parsed;
  } catch {
    return [];
  }
}

export function SalesOrderDetailDrawer({
  open,
  order,
  events,
  loading = false,
  busy = false,
  onClose,
  onStatusUpdate,
  onVerifyPayment,
  onRejectPayment,
  onFinalizeDraft,
  onVoidInvoice,
  onCreateReturn,
  onDeleteOrder,
}: Props) {
  const [draftStatus, setDraftStatus] = useState(order?.status ?? "Awaiting Approval");
  const [copied, setCopied] = useState("");

  const items = useMemo(() => parseItems(order?.order_items_json), [order?.order_items_json]);
  const paymentPending =
    order &&
    (order.payment_status ?? "Verification Pending") === "Verification Pending" &&
    order.source !== "offline";
  const buyerGst = parseBuyerGst(order?.buyer_gst_json);
  const isOfflineDraft =
    order?.source === "offline" && (order.lifecycle_state ?? "finalized") === "draft";
  const isOfflineFinalized =
    order?.source === "offline" && (order.lifecycle_state ?? "finalized") === "finalized";
  const invoiceReady =
    Number(order?.invoice_ready ?? 0) === 1 && Boolean(order?.invoice_number);

  if (!open) return null;

  const copyText = async (label: string, value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/25">
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-black/10 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-black/5 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
                Order Details
              </p>
              <h2 className="mt-1 text-xl font-semibold">{order?.id ?? "Loading..."}</h2>
              {order ? (
                <p className="text-sm text-black/55">{formatDateTime(order.created_at)}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>

        {loading && !order ? (
          <div className="px-5 py-8 text-sm text-black/55">Loading order details...</div>
        ) : !order ? (
          <div className="px-5 py-8 text-sm text-black/55">Order not found.</div>
        ) : (
          <div className="space-y-5 px-5 py-5">
            <section className="soft-card rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                    Customer
                  </p>
                  <p className="mt-1 text-lg font-semibold">{order.customer_name || "Customer"}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyText("Order ID", order.id)}
                    className="rounded-lg border border-black/10 px-2 py-1 text-xs font-semibold"
                  >
                    Copy Order ID
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText("Phone", order.phone)}
                    disabled={!order.phone}
                    className="rounded-lg border border-black/10 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                  >
                    Copy Phone
                  </button>
                </div>
              </div>
              {copied ? <p className="mt-2 text-xs text-emerald-700">{copied} copied</p> : null}
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <p>Phone: {order.phone || "-"}</p>
                <p>Email: {order.email || "-"}</p>
                <p>Pincode: {order.pincode || "-"}</p>
                <p>Source: {order.source || "online"}</p>
                <p>Order Kind: {order.order_kind ?? "sale"}</p>
                <p>Lifecycle: {order.lifecycle_state ?? "finalized"}</p>
                <p className="md:col-span-2">Address: {order.address || "-"}</p>
                {buyerGst?.businessName ? (
                  <p className="md:col-span-2">Buyer GST Name: {buyerGst.businessName}</p>
                ) : null}
                {buyerGst?.gstin ? <p>Buyer GSTIN: {buyerGst.gstin}</p> : null}
                {buyerGst?.billingAddress ? (
                  <p className="md:col-span-2">Buyer GST Address: {buyerGst.billingAddress}</p>
                ) : null}
              </div>
            </section>

            <section className="soft-card rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                Items & Amount
              </p>
              <p className="mt-2 text-lg font-semibold">{formatInr(Number(order.total_amount))}</p>
              <p className="text-sm text-black/60">
                {order.cake_name} • Qty {order.quantity}
              </p>
              <div className="mt-2 grid gap-1 text-xs text-black/55 md:grid-cols-2">
                <p>Subtotal: {formatInr(Number(order.subtotal_amount ?? order.total_amount))}</p>
                <p>Delivery: {formatInr(Number(order.delivery_fee_amount ?? 0))}</p>
                <p>Discount: {formatInr(Number(order.discount_amount ?? 0))}</p>
                <p>GST: {formatInr(Number(order.gst_amount ?? 0))}</p>
                <p>Coupon: {order.coupon_code || "-"}</p>
              </div>
              {order.category_summary ? (
                <p className="text-sm text-black/55">{order.category_summary}</p>
              ) : null}
              {order.cake_message ? (
                <p className="mt-2 whitespace-pre-wrap rounded-lg border border-black/10 bg-[color:var(--cream)] px-3 py-2 text-sm">
                  Note: {order.cake_message}
                </p>
              ) : null}
              <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-black/50">No item breakdown available.</p>
                ) : (
                  items.map((item, index) => (
                    <div key={`${item.name ?? "item"}-${index}`} className="rounded-xl border border-black/5 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{item.name ?? "Item"}</p>
                        <p className="text-sm font-semibold">
                          {item.lineTotal != null
                            ? formatInr(Number(item.lineTotal))
                            : item.unitPrice != null
                              ? formatInr(Number(item.unitPrice) * Number(item.qty ?? 1))
                              : "-"}
                        </p>
                      </div>
                      <p className="text-xs text-black/55">
                        Qty {item.qty ?? 0}
                        {item.unitPrice != null ? ` • ${formatInr(Number(item.unitPrice))} each` : ""}
                      </p>
                      {item.customizationNote ? (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-black/55">
                          {item.customizationNote}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="soft-card rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                Payment & Invoice
              </p>
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <p>Payment Status: {order.payment_status ?? "Verification Pending"}</p>
                <p>Method: {order.payment_method || "-"}</p>
                <p>Reference: {order.payment_reference || "-"}</p>
                <p>Verified By: {order.payment_verified_by || "-"}</p>
                <p>Paid At: {formatDateTime(order.paid_at)}</p>
                <p>Invoice: {order.invoice_number || "Not ready"}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {invoiceReady && (
                  <a
                    href={`/api/orders/${order.id}/invoice`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--berry)]"
                  >
                    Open Invoice PDF
                  </a>
                )}
                {invoiceReady && (
                  <a
                    href={`/api/orders/${order.id}/barcode`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--berry)]"
                  >
                    Open Barcode
                  </a>
                )}
                {invoiceReady && (
                  <a
                    href={`/api/orders/${order.id}/barcode?download=1`}
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--berry)]"
                  >
                    Download Barcode
                  </a>
                )}
                {invoiceReady && (
                  <a
                    href={`/admin/labels/${encodeURIComponent(order.id)}?autoprint=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--berry)]"
                  >
                    Print Label
                  </a>
                )}
                {paymentPending ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onVerifyPayment(order.id)}
                      disabled={busy}
                      className="rounded-lg bg-[color:var(--berry)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Verify Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectPayment(order.id)}
                      disabled={busy}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"
                    >
                      Reject Payment
                    </button>
                  </>
                ) : null}
                {isOfflineDraft && onFinalizeDraft ? (
                  <button
                    type="button"
                    onClick={() => onFinalizeDraft(order.id)}
                    disabled={busy}
                    className="rounded-lg bg-[color:var(--berry)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Finalize Draft
                  </button>
                ) : null}
                {isOfflineFinalized && onVoidInvoice ? (
                  <button
                    type="button"
                    onClick={() => onVoidInvoice(order.id)}
                    disabled={busy}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"
                  >
                    Void Invoice
                  </button>
                ) : null}
                {isOfflineFinalized && onCreateReturn ? (
                  <button
                    type="button"
                    onClick={() => onCreateReturn(order.id)}
                    disabled={busy}
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Create Return
                  </button>
                ) : null}
                {onDeleteOrder ? (
                  <button
                    type="button"
                    onClick={() => onDeleteOrder(order.id)}
                    disabled={busy}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"
                  >
                    Delete Order
                  </button>
                ) : null}
              </div>
            </section>

            <section className="soft-card rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                Status Action
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={draftStatus}
                  onChange={(event) => setDraftStatus(event.target.value)}
                  disabled={busy}
                  className="min-w-[220px] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onStatusUpdate(order.id, draftStatus)}
                  disabled={busy || draftStatus === order.status}
                  className="rounded-xl border border-black/10 bg-[color:var(--cream)] px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  {busy ? "Updating..." : "Apply Status"}
                </button>
                <span className="text-sm text-black/55">Current: {order.status}</span>
              </div>
            </section>

            <section className="soft-card rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                Activity Timeline
              </p>
              <div className="mt-3 space-y-2">
                {events.length === 0 ? (
                  <p className="text-sm text-black/50">No events recorded yet for this order.</p>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="rounded-xl border border-black/5 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold capitalize">
                          {event.event_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-black/50">{formatDateTime(event.created_at)}</p>
                      </div>
                      <p className="text-xs text-black/55">
                        {event.from_value ? `${event.from_value} → ` : ""}
                        {event.to_value || "-"}
                        {event.actor ? ` • by ${event.actor}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
