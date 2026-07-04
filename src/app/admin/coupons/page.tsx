"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";

type Coupon = {
  code: string;
  label: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  active: number;
};

type CouponForm = {
  code: string;
  label: string;
  discountType: "flat" | "percent";
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  active: boolean;
};

const EMPTY_FORM: CouponForm = {
  code: "",
  label: "",
  discountType: "flat",
  discountValue: "",
  minOrderAmount: "0",
  maxDiscountAmount: "",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  active: true,
};

/** Convert a stored ISO string to the value format used by <input type="datetime-local">. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = parsed.getFullYear();
  const month = pad(parsed.getMonth() + 1);
  const day = pad(parsed.getDate());
  const hours = pad(parsed.getHours());
  const minutes = pad(parsed.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/coupons", { cache: "no-store" });
      const data = (await response.json()) as { coupons?: Coupon[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load coupons");
      setCoupons(data.coupons ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCoupons();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingCode(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        discountValue: Number(form.discountValue || 0),
        minOrderAmount: Number(form.minOrderAmount || 0),
      };
      const response = await fetch("/api/admin/coupons", {
        method: editingCode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to save coupon");
      setMessage(editingCode ? "Coupon updated." : "Coupon created.");
      resetForm();
      await loadCoupons();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCode(coupon.code);
    setForm({
      code: coupon.code,
      label: coupon.label,
      discountType: coupon.discount_type,
      discountValue: String(coupon.discount_value),
      minOrderAmount: String(coupon.min_order_amount),
      maxDiscountAmount: coupon.max_discount_amount == null ? "" : String(coupon.max_discount_amount),
      startsAt: isoToLocalInput(coupon.starts_at),
      expiresAt: isoToLocalInput(coupon.expires_at),
      usageLimit: coupon.usage_limit == null ? "" : String(coupon.usage_limit),
      active: coupon.active === 1,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (code: string) => {
    const ok = window.confirm(`Delete coupon ${code}?`);
    if (!ok) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete coupon");
      setMessage("Coupon deleted.");
      if (editingCode === code) resetForm();
      await loadCoupons();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <AdminGuard>
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge tone="gold">Admin Coupons</Badge>
              <h1 className="mt-2 text-3xl">Coupons</h1>
              <p className="mt-1 text-sm text-black/60">
                Create and manage basic checkout discounts.
              </p>
            </div>
            <Link
              href="/admin/sales"
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
            >
              Back to Sales
            </Link>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-4 rounded-3xl border border-black/5 bg-white p-6 md:grid-cols-2"
          >
            <h2 className="md:col-span-2 text-2xl">{editingCode ? "Edit Coupon" : "Create Coupon"}</h2>
            <label className="text-sm font-semibold text-black/70">
              Code
              <input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                disabled={Boolean(editingCode)}
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm uppercase"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Label
              <input
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Discount Type
              <select
                value={form.discountType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discountType: event.target.value as "flat" | "percent" }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              >
                <option value="flat">Flat</option>
                <option value="percent">Percent</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-black/70">
              Discount Value
              <input
                type="number"
                min={1}
                step="0.01"
                value={form.discountValue}
                onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Min Order Amount
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.minOrderAmount}
                onChange={(event) => setForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Max Discount Amount
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.maxDiscountAmount}
                onChange={(event) => setForm((prev) => ({ ...prev, maxDiscountAmount: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Starts At
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
              <span className="mt-1 block text-[11px] font-normal text-black/50">
                Optional. Leave empty to activate immediately.
              </span>
            </label>
            <label className="text-sm font-semibold text-black/70">
              Expires At
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
              <span className="mt-1 block text-[11px] font-normal text-black/50">
                Optional. Leave empty for no expiry.
              </span>
            </label>
            <label className="text-sm font-semibold text-black/70">
              Usage Limit
              <input
                type="number"
                min={0}
                value={form.usageLimit}
                onChange={(event) => setForm((prev) => ({ ...prev, usageLimit: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-black/70">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              />
              Active
            </label>

            {(error || message) && (
              <div
                className={`md:col-span-2 rounded-2xl px-4 py-3 text-sm ${
                  error
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {error || message}
              </div>
            )}

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[color:var(--berry)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : editingCode ? "Update Coupon" : "Create Coupon"}
              </button>
              {editingCode ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <section className="mt-8 overflow-hidden rounded-3xl border border-black/5 bg-white">
            <div className="grid grid-cols-[1fr_1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-black/5 bg-[color:var(--cream)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
              <span>Code</span>
              <span>Label</span>
              <span>Discount</span>
              <span>Usage</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            <div className="divide-y divide-black/5">
              {loading ? (
                <div className="px-6 py-6 text-sm text-black/55">Loading coupons...</div>
              ) : coupons.length === 0 ? (
                <div className="px-6 py-6 text-sm text-black/55">No coupons created yet.</div>
              ) : (
                coupons.map((coupon) => (
                  <div
                    key={coupon.code}
                    className="grid grid-cols-[1fr_1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 px-6 py-4 text-sm"
                  >
                    <div className="font-semibold">{coupon.code}</div>
                    <div>{coupon.label}</div>
                    <div>
                      {coupon.discount_type === "percent"
                        ? `${coupon.discount_value}%`
                        : `₹${coupon.discount_value}`}
                    </div>
                    <div>
                      {coupon.used_count}
                      {coupon.usage_limit != null ? ` / ${coupon.usage_limit}` : ""}
                    </div>
                    <div>{coupon.active === 1 ? "Active" : "Inactive"}</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(coupon)}
                        className="rounded-lg border border-black/10 bg-white px-3 py-1 text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(coupon.code)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </AdminGuard>
  );
}
