"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { AdminGuard } from "@/components/admin-guard";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type LabelOrder = {
  id: string;
  customer_name?: string | null;
  invoice_number?: string | null;
};

export default function AdminOrderLabelPage() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const orderId = useMemo(() => decodeURIComponent(params.orderId ?? "").trim(), [params.orderId]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<LabelOrder | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!orderId) {
        setError("Order id is required");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/sales/orders/${encodeURIComponent(orderId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await response.json()) as {
          order?: LabelOrder;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load order");
        }
        if (!cancelled) {
          setOrder(data.order ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setOrder(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!order || loading) return;
    if (searchParams.get("autoprint") === "1") {
      const timer = window.setTimeout(() => window.print(), 250);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [loading, order, searchParams]);

  return (
    <AdminGuard>
      <div>
        <div className="print:hidden">
          <SiteHeader />
        </div>
        <main className="mx-auto max-w-3xl px-6 py-8 print:max-w-none print:px-3 print:py-3">
          <div className="print:hidden">
            <Link
              href="/admin/sales"
              className="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold"
            >
              Back to Sales
            </Link>
          </div>

          <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6 print:mt-0 print:border-black print:p-4">
            {loading ? (
              <p className="text-sm text-black/60">Loading label...</p>
            ) : error ? (
              <p className="text-sm text-red-700">{error}</p>
            ) : !order ? (
              <p className="text-sm text-black/60">Order not found.</p>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/50">
                  Shipping / Billing Label
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{order.id}</h1>
                <p className="mt-1 text-sm text-black/65">Customer: {order.customer_name || "-"}</p>
                <p className="text-sm text-black/65">Invoice: {order.invoice_number || "-"}</p>

                <div className="mt-5 rounded-xl border border-black/10 bg-white p-3">
                  <Image
                    src={`/api/orders/${encodeURIComponent(order.id)}/barcode`}
                    alt={`Barcode for ${order.id}`}
                    width={720}
                    height={220}
                    unoptimized
                    className="h-auto w-full"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                  <a
                    href={`/api/orders/${encodeURIComponent(order.id)}/barcode?download=1`}
                    className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold"
                  >
                    Download Barcode
                  </a>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-full bg-[color:var(--berry)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Print
                  </button>
                </div>
              </>
            )}
          </section>
        </main>
        <div className="print:hidden">
          <SiteFooter />
        </div>
      </div>
    </AdminGuard>
  );
}
