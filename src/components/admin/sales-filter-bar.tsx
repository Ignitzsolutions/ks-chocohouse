"use client";

import type { SalesOrderFilters } from "@/types/admin-sales";

const STATUS_OPTIONS = [
  "all",
  "Payment Verification Pending",
  "Awaiting Approval",
  "Baking",
  "Out for Delivery",
  "Delivered",
  "Payment Rejected",
  "Cancelled",
];

const PAYMENT_STATUS_OPTIONS = ["all", "Verification Pending", "Verified", "Rejected"];
const SOURCE_OPTIONS = ["all", "online", "offline"];
const SLOT_OPTIONS = [
  "all",
  "10:00 AM - 11:30 AM",
  "12:00 PM - 1:30 PM",
  "3:00 PM - 4:30 PM",
  "5:00 PM - 6:30 PM",
];

type Props = {
  filters: SalesOrderFilters;
  onChange: <K extends keyof SalesOrderFilters>(key: K, value: SalesOrderFilters[K]) => void;
  onReset: () => void;
  onQuickFilter: (
    preset: "needs_payment_review" | "awaiting_approval" | "today_deliveries" | "delivered_today" | "all"
  ) => void;
};

function titleLabel(value: string) {
  if (value === "all") return "All";
  if (value === "online") return "Online";
  if (value === "offline") return "Offline";
  return value;
}

export function SalesFilterBar({ filters, onChange, onReset, onQuickFilter }: Props) {
  return (
    <section className="premium-panel sticky top-2 z-20 rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onQuickFilter("needs_payment_review")}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold"
        >
          Needs Payment Review
        </button>
        <button
          type="button"
          onClick={() => onQuickFilter("awaiting_approval")}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold"
        >
          Awaiting Approval
        </button>
        <button
          type="button"
          onClick={() => onQuickFilter("today_deliveries")}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold"
        >
          Today Deliveries
        </button>
        <button
          type="button"
          onClick={() => onQuickFilter("delivered_today")}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold"
        >
          Delivered Today
        </button>
        <button
          type="button"
          onClick={() => onQuickFilter("all")}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-black/55"
        >
          All Orders
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50 md:col-span-2">
          Search
          <input
            value={filters.q}
            onChange={(event) => onChange("q", event.target.value)}
            placeholder="Order ID, customer, phone, payment ref, invoice"
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm normal-case tracking-normal"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
          Status
          <select
            value={filters.status}
            onChange={(event) => onChange("status", event.target.value)}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm normal-case tracking-normal"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {titleLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
          Payment
          <select
            value={filters.paymentStatus}
            onChange={(event) => onChange("paymentStatus", event.target.value)}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm normal-case tracking-normal"
          >
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {titleLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
          Source
          <select
            value={filters.source}
            onChange={(event) => onChange("source", event.target.value)}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm normal-case tracking-normal"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {titleLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
          Delivery Date
          <input
            type="date"
            value={filters.deliveryDate}
            onChange={(event) => onChange("deliveryDate", event.target.value)}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm normal-case tracking-normal"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
          Slot
          <select
            value={filters.slot}
            onChange={(event) => onChange("slot", event.target.value)}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm normal-case tracking-normal"
          >
            {SLOT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {titleLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
          Invoice
          <select
            value={filters.invoiceReady}
            onChange={(event) =>
              onChange("invoiceReady", event.target.value as SalesOrderFilters["invoiceReady"])
            }
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm normal-case tracking-normal"
          >
            <option value="all">All</option>
            <option value="yes">Ready</option>
            <option value="no">Not Ready</option>
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
          Amount Min
          <input
            type="number"
            min={0}
            value={filters.amountMin ?? ""}
            onChange={(event) =>
              onChange(
                "amountMin",
                event.target.value === "" ? null : Number(event.target.value)
              )
            }
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm normal-case tracking-normal"
            placeholder="0"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
          Amount Max
          <input
            type="number"
            min={0}
            value={filters.amountMax ?? ""}
            onChange={(event) =>
              onChange(
                "amountMax",
                event.target.value === "" ? null : Number(event.target.value)
              )
            }
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm normal-case tracking-normal"
            placeholder="5000"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </section>
  );
}

