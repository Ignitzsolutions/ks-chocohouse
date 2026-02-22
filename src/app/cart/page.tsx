"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCart,
  updateQty,
  removeItem,
  clearCart,
  setItemCustomizationNote,
  type CartItem,
} from "@/lib/cart";
import { formatInr } from "@/lib/products";
import { useProducts } from "@/lib/use-products";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>(() => getCart());
  const { productById } = useProducts();

  const detailed = useMemo(() => {
    return items
      .map((item) => {
        const product = productById.get(item.productId);
        if (!product) return null;
        return {
          ...item,
          product,
          lineTotal: item.qty * product.priceInr,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [items, productById]);

  const subtotal = detailed.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = subtotal > 0 ? 120 : 0;
  const total = subtotal + deliveryFee;

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="premium-panel flex flex-wrap items-center justify-between gap-6 rounded-3xl p-6">
          <div className="space-y-3">
            <Badge tone="rose">Cart</Badge>
            <h1 className="hero-display text-5xl leading-none">Review your items</h1>
            <p className="text-black/70">
              Update quantities or proceed directly to checkout.
            </p>
          </div>
          <Link
            href="/menu"
            className="rounded-full border border-[color:var(--line)] bg-white px-5 py-2 text-sm font-semibold shadow-sm"
          >
            Continue shopping
          </Link>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            {detailed.length === 0 && (
              <div className="premium-panel rounded-3xl p-6 text-sm text-black/60">
                Your cart is empty.
              </div>
            )}

            {detailed.map(({ product, qty, lineTotal, customizationNote }) => (
              <div
                key={product.id}
                className="premium-panel rounded-3xl p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="hero-display text-4xl leading-none">{product.name}</h3>
                    <p className="mt-1 text-sm text-black/60">{product.description}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-black/50">
                      {product.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatInr(lineTotal)}</p>
                    <p className="text-xs text-black/50">Line total</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    className="h-8 w-8 rounded-full border border-[color:var(--line)] bg-white text-sm"
                    onClick={() => setItems(updateQty(product.id, qty - 1))}
                  >
                    -
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold">{qty}</span>
                  <button
                    className="h-8 w-8 rounded-full border border-[color:var(--line)] bg-white text-sm"
                    onClick={() => setItems(updateQty(product.id, qty + 1))}
                  >
                    +
                  </button>
                  <button
                    className="ml-3 rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold"
                    onClick={() => setItems(removeItem(product.id))}
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-black/55">
                    Customization Note
                  </label>
                  <textarea
                    value={customizationNote ?? ""}
                    onChange={(event) =>
                      setItems(
                        setItemCustomizationNote(product.id, event.target.value)
                      )
                    }
                    rows={2}
                    maxLength={240}
                    placeholder="Example: Name on cake, color theme, topper style, less sweet..."
                    className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-6">
            <div className="premium-panel rounded-3xl p-6">
              <h3 className="hero-display text-4xl leading-none">Order total</h3>
              <div className="mt-4 space-y-3 text-sm text-black/70">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatInr(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery fee</span>
                  <span>{formatInr(deliveryFee)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-black">
                  <span>Total due now</span>
                  <span>{formatInr(total)}</span>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <Link href="/billing" className="block">
                  <Button className="w-full" disabled={detailed.length === 0}>
                    Proceed to checkout
                  </Button>
                </Link>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    clearCart();
                    setItems([]);
                  }}
                  disabled={detailed.length === 0}
                >
                  Clear cart
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
