"use client";

import { useState } from "react";
import type { SalesOrderRow } from "@/types/admin-sales";

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
  order: SalesOrderRow;
  busy?: boolean;
  onStatusUpdate: (orderId: string, status: string) => Promise<void> | void;
  onVerifyPayment: (orderId: string) => Promise<void> | void;
  onRejectPayment: (orderId: string) => Promise<void> | void;
  onFinalizeDraft?: (orderId: string) => Promise<void> | void;
  onVoidInvoice?: (orderId: string) => Promise<void> | void;
  onCreateReturn?: (orderId: string) => Promise<void> | void;
};

export function SalesOrderRowActions({
  order,
  busy = false,
  onStatusUpdate,
  onVerifyPayment,
  onRejectPayment,
  onFinalizeDraft,
  onVoidInvoice,
  onCreateReturn,
}: Props) {
  const [draftStatus, setDraftStatus] = useState(order.status);

  const paymentPending =
    (order.payment_status ?? "Verification Pending") === "Verification Pending" &&
    order.source !== "offline";
  const isOfflineDraft =
    order.source === "offline" && (order.lifecycle_state ?? "finalized") === "draft";
  const isOfflineFinalized =
    order.source === "offline" && (order.lifecycle_state ?? "finalized") === "finalized";

  return (
    <div className="flex min-w-[170px] flex-col gap-2">
      <select
        value={draftStatus}
        onChange={(event) => setDraftStatus(event.target.value)}
        disabled={busy}
        className="w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold"
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
        className="rounded-lg border border-black/10 bg-[color:var(--cream)] px-2 py-1.5 text-xs font-semibold disabled:opacity-40"
      >
        {busy ? "Working..." : "Update Status"}
      </button>
      {paymentPending ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onVerifyPayment(order.id)}
            disabled={busy}
            className="rounded-lg bg-[color:var(--berry)] px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Verify
          </button>
          <button
            type="button"
            onClick={() => onRejectPayment(order.id)}
            disabled={busy}
            className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      ) : null}
      {isOfflineDraft && onFinalizeDraft ? (
        <button
          type="button"
          onClick={() => onFinalizeDraft(order.id)}
          disabled={busy}
          className="rounded-lg bg-[color:var(--berry)] px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          Finalize Draft
        </button>
      ) : null}
      {isOfflineFinalized && onVoidInvoice ? (
        <button
          type="button"
          onClick={() => onVoidInvoice(order.id)}
          disabled={busy}
          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"
        >
          Void Invoice
        </button>
      ) : null}
      {isOfflineFinalized && onCreateReturn ? (
        <button
          type="button"
          onClick={() => onCreateReturn(order.id)}
          disabled={busy}
          className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold disabled:opacity-40"
        >
          Create Return
        </button>
      ) : null}
    </div>
  );
}
