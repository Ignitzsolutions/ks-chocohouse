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
  const [uploadingSplash, setUploadingSplash] = useState(false);
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

  const handleSplashUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingSplash(true);
    setError("");
    setMessage("");
    try {
      const payload = new FormData();
      payload.append("files", file);
      const response = await fetch("/api/admin/products/upload", {
        method: "POST",
        credentials: "include",
        body: payload,
      });
      const data = (await response.json()) as { error?: string; imageSrc?: string };
      if (!response.ok || !data.imageSrc) {
        throw new Error(data.error ?? "Splash image upload failed");
      }
      setSettings((prev) => ({
        ...prev,
        splashImageSrc: data.imageSrc ?? "",
      }));
      setMessage("Splash image uploaded. Save settings to publish it.");
    } catch (err) {
      setError(String(err));
    } finally {
      setUploadingSplash(false);
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
                step="0.01"
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
                step="0.01"
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
                step="0.01"
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
                step="0.01"
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
                  checked={settings.shippingIgstEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      shippingIgstEnabled: event.target.checked,
                    }))
                  }
                />
                IGST Amount (INR)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={settings.shippingIgstAmount}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    shippingIgstAmount: Math.max(0, Number(event.target.value || 0)),
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>

            <section className="grid gap-4 rounded-3xl border border-black/10 bg-[color:var(--cream)] p-5 md:col-span-2 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-semibold text-black/75">Homepage Splash Screen</p>
                <p className="text-xs text-black/55">
                  Shows once per browser session on the homepage only. Users can click the image or close button to enter.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-black/70 md:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.splashEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, splashEnabled: event.target.checked }))
                  }
                />
                Enable homepage splash
              </label>
              <label className="text-sm font-semibold text-black/70">
                Splash Image URL
                <input
                  value={settings.splashImageSrc}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, splashImageSrc: event.target.value.trim() }))
                  }
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                  placeholder="/images/uploads/splash.jpg"
                />
              </label>
              <label className="text-sm font-semibold text-black/70">
                Upload Splash Image
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingSplash}
                  onChange={(event) => {
                    void handleSplashUpload(event.target.files);
                    event.currentTarget.value = "";
                  }}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
                {uploadingSplash ? (
                  <p className="mt-1 text-xs font-normal text-black/55">Uploading...</p>
                ) : null}
              </label>
              {settings.splashImageSrc ? (
                <div className="md:col-span-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                    Preview
                  </p>
                  <div className="overflow-hidden rounded-3xl border border-black/10 bg-white p-3">
                    <img
                      src={settings.splashImageSrc}
                      alt="Homepage splash preview"
                      className="max-h-[360px] w-full object-contain"
                    />
                  </div>
                </div>
              ) : null}
            </section>

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
