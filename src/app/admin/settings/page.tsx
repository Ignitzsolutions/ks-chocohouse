"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/admin-guard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_ADMIN_SETTINGS,
  type AdminSettings,
} from "@/lib/admin-settings";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setSettings((data.settings ?? DEFAULT_ADMIN_SETTINGS) as AdminSettings))
      .catch(() => setSettings(DEFAULT_ADMIN_SETTINGS));
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      const data = (await response.json()) as { error?: string; settings?: AdminSettings };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save settings");
      }
      setSettings((data.settings ?? settings) as AdminSettings);
      setMessage("Settings updated.");
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGuard>
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Badge tone="gold">Admin Settings</Badge>
              <h1 className="text-3xl">Billing Settings</h1>
              <p className="text-sm text-black/60">
                Configure the billing rows used in checkout, offline invoices, and invoice PDFs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/products"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
              >
                Products
              </Link>
              <Link
                href="/admin/invoices"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
              >
                Offline Invoice
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleSave}
            className="mt-8 grid gap-4 rounded-3xl border border-black/5 bg-white p-6 md:grid-cols-2"
          >
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-black/70 md:col-span-2">
              <input
                type="checkbox"
                checked={settings.discountEnabled}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, discountEnabled: event.target.checked }))
                }
              />
              Enable discounts
            </label>
            <label className="text-sm font-semibold text-black/70">
              <span className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.gstEnabled && settings.cgstEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      gstEnabled: event.target.checked || prev.sgstEnabled || prev.shippingIgstEnabled,
                      cgstEnabled: event.target.checked,
                    }))
                  }
                />
                CGST Rate (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.cgstRatePercent}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    cgstRatePercent: Math.max(0, Math.min(100, Number(event.target.value || 0))),
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              <span className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.gstEnabled && settings.sgstEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      gstEnabled: event.target.checked || prev.cgstEnabled || prev.shippingIgstEnabled,
                      sgstEnabled: event.target.checked,
                    }))
                  }
                />
                SGST Rate (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.sgstRatePercent}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    sgstRatePercent: Math.max(0, Math.min(100, Number(event.target.value || 0))),
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              <span className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.deliveryFeeEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, deliveryFeeEnabled: event.target.checked }))
                  }
                />
                Standard Delivery Charge (INR)
              </span>
              <input
                type="number"
                min={0}
                value={settings.deliveryFeeAmount}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    deliveryFeeAmount: Math.max(0, Number(event.target.value || 0)),
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Free Delivery Threshold (INR)
              <input
                type="number"
                min={0}
                value={settings.freeDeliveryThreshold}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    freeDeliveryThreshold: Math.max(0, Number(event.target.value || 0)),
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70 md:col-span-2">
              <span className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.gstEnabled && settings.shippingIgstEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      gstEnabled: event.target.checked || prev.cgstEnabled || prev.sgstEnabled,
                      shippingIgstEnabled: event.target.checked,
                    }))
                  }
                />
                Shipping IGST Rate (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.shippingIgstRatePercent}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    shippingIgstRatePercent: Math.max(0, Math.min(100, Number(event.target.value || 0))),
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 md:col-span-2">
                {message}
              </p>
            ) : null}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[color:var(--berry)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        </main>
        <SiteFooter />
      </div>
    </AdminGuard>
  );
}
