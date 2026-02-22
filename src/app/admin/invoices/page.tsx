"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { formatInr } from "@/lib/products";
import { useProducts } from "@/lib/use-products";

type OfflineItem = {
  productId: string;
  qty: number;
};

const emptyItem = (): OfflineItem => ({ productId: "", qty: 1 });

export default function AdminInvoicesPage() {
  const { products } = useProducts();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<OfflineItem[]>([emptyItem()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ orderId: string; invoiceUrl: string } | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<string, { name: string; priceInr: number }>();
    products.forEach((product) => {
      map.set(product.id, { name: product.name, priceInr: product.priceInr });
    });
    return map;
  }, [products]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const product = productMap.get(item.productId);
        if (!product) return acc;
        const lineTotal = product.priceInr * Math.max(1, Number(item.qty || 1));
        return {
          qty: acc.qty + Math.max(1, Number(item.qty || 1)),
          amount: acc.amount + lineTotal,
        };
      },
      { qty: 0, amount: 0 }
    );
  }, [items, productMap]);

  const canGenerate =
    items.length > 0 &&
    items.every((item) => item.productId && item.qty > 0) &&
    totals.amount > 0 &&
    !loading;

  const updateItem = (index: number, next: Partial<OfflineItem>) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item))
    );
  };

  const addItemRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItemRow = (index: number) =>
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));

  const generateInvoice = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          paymentMethod,
          paymentReference,
          note,
          items: items.map((item) => ({
            productId: item.productId,
            qty: Math.max(1, Number(item.qty || 1)),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to generate offline invoice");
      }

      setResult({
        orderId: String(data.orderId ?? ""),
        invoiceUrl: String(data.invoiceUrl ?? ""),
      });
      setItems([emptyItem()]);
      setPhone("");
      setPaymentReference("");
      setNote("");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminGuard>
      <div>
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge tone="gold">Admin Invoices</Badge>
              <h1 className="mt-2 text-3xl">Generate Offline Invoice</h1>
              <p className="mt-1 text-sm text-black/60">
                Record walk-in sales in the same system used for online orders.
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
            >
              Back to Orders
            </Link>
          </div>

          <section className="premium-panel mt-8 rounded-3xl p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-black/70">
                Customer Name
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                  placeholder="Enter customer name"
                />
              </label>
              <label className="text-sm font-semibold text-black/70">
                Phone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                  placeholder="Optional"
                />
              </label>
              <label className="text-sm font-semibold text-black/70">
                Payment Method
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-black/70">
                Payment Reference
                <input
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                  placeholder="Optional UTR / reference"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold text-black/70">
              Note
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                placeholder="Optional note for invoice"
              />
            </label>

            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-black/50">
                Products
              </p>
              {items.map((item, index) => {
                const selected = productMap.get(item.productId);
                return (
                  <div key={`${index}-${item.productId}`} className="grid gap-3 md:grid-cols-[1.5fr_0.6fr_auto]">
                    <select
                      value={item.productId}
                      onChange={(event) => updateItem(index, { productId: event.target.value })}
                      className="w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({formatInr(product.priceInr)})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(event) =>
                        updateItem(index, {
                          qty: Math.max(1, Number(event.target.value || 1)),
                        })
                      }
                      className="w-full rounded-2xl border border-black/10 bg-[color:var(--cream)] px-4 py-3 text-sm"
                    />

                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-xs font-semibold"
                      disabled={items.length === 1}
                    >
                      Remove
                    </button>

                    <div className="md:col-span-3 text-xs text-black/55">
                      {selected
                        ? `Line total: ${formatInr(selected.priceInr * Math.max(1, item.qty || 1))}`
                        : "Select a product"}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addItemRow}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold"
              >
                Add Product Row
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm">
              <p>Total Quantity: {totals.qty}</p>
              <p className="font-semibold">Grand Total: {formatInr(totals.amount)}</p>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Invoice created for order {result.orderId}.{" "}
                <a
                  href={result.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline"
                >
                  Download PDF
                </a>
              </div>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={generateInvoice}
                disabled={!canGenerate}
                className="rounded-full bg-[color:var(--berry)] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate Invoice"}
              </button>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </AdminGuard>
  );
}
