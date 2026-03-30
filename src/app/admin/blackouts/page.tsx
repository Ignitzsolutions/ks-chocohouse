"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminGuard } from "@/components/admin-guard";

export default function AdminBlackoutsPage() {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [blackouts, setBlackouts] = useState<{ date: string; reason: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/blackouts");
    const data = await res.json();
    setBlackouts(data.blackouts ?? []);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      await load();
      if (!active) return;
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const addDate = async () => {
    if (!date) return;
    await fetch("/api/admin/blackouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, reason }),
    });
    setDate("");
    setReason("");
    load();
  };

  const removeDate = async (value: string) => {
    await fetch(`/api/admin/blackouts?date=${value}`, { method: "DELETE" });
    load();
  };

  return (
    <AdminGuard>
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge tone="gold">Admin Controls</Badge>
            <h1 className="text-3xl">Stop Orders on Dates</h1>
            <p className="text-sm text-black/60">
              Block deliveries on holidays or fully-booked days.
            </p>
          </div>
          <Link
            href="/admin/sales"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
          >
            Sales Dashboard
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-black/5 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_1.2fr_auto]">
            <label className="text-sm font-semibold text-black/70">
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-black/70">
              Reason (optional)
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                placeholder="Festival / Fully booked"
              />
            </label>
            <div className="flex items-end">
              <Button onClick={addDate}>Add Date</Button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-black/5 bg-white p-6">
          <h2 className="text-xl font-semibold">Blocked Dates</h2>
          <div className="mt-4 space-y-3">
            {loading && (
              <p className="text-sm text-black/50">Loading...</p>
            )}
            {!loading && blackouts.length === 0 && (
              <p className="text-sm text-black/50">No blocked dates yet.</p>
            )}
            {blackouts.map((item) => (
              <div
                key={item.date}
                className="flex items-center justify-between rounded-2xl border border-black/5 bg-[color:var(--cream)] px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold">{item.date}</p>
                  <p className="text-xs text-black/50">{item.reason}</p>
                </div>
                <button
                  className="text-xs font-semibold text-[color:var(--berry)]"
                  onClick={() => removeDate(item.date)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
    </AdminGuard>
  );
}
