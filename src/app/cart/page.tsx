"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCartItemKey,
  getCartStorageSnapshot,
  parseCartStorageSnapshot,
  updateQty,
  removeItem,
  clearCart,
  subscribeCart,
  type CartItem,
} from "@/lib/cart";
import { formatInr, getPriceDisplayMeta, getProductOptionLabel } from "@/lib/products";
import { useProducts } from "@/lib/use-products";

export default function CartPage() {
  const { productById } = useProducts();
  const cartSnapshot = useSyncExternalStore(subscribeCart, getCartStorageSnapshot, () => "[]");
  const items = useMemo<CartItem[]>(
    () => parseCartStorageSnapshot(cartSnapshot),
    [cartSnapshot]
  );

  const detailed = useMemo(() => {
    return items
      .map((item) => {
        const product = productById.get(item.productId);
        if (!product) return null;
        const unitPrice = getPriceDisplayMeta(product, item.sizeLabel).finalPrice;
        return {
          ...item,
          product,
          sizeLabel: item.sizeLabel,
          unitPrice,
          lineTotal: item.qty * unitPrice,
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
      <main className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="premium-panel flex flex-wrap items-center justify-between gap-6 rounded-3xl p-6">
          <div className="space-y-3">
            <Badge tone="rose">Cart</Badge>
            <h1 className="hero-display text-5xl leading-none">Review your items</h1>
            <p className="text-black/70">
              Update quantities or proceed directly to checkout.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
              <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-black/65">
                No returns or refunds after confirmation
              </span>
              <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-black/65">
                Customer details are used only for order, billing, and delivery
              </span>
            </div>
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

            {detailed.map(({ product, qty, lineTotal, customizationNote, sizeLabel, unitPrice }) => (
              <div
                key={getCartItemKey(product.id, sizeLabel)}
                className="premium-panel rounded-3xl p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="hero-display text-4xl leading-none">{product.name}</h3>
                    <p className="mt-1 text-sm text-black/60">{product.description}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-black/50">
                      {product.category}
                    </p>
                    {sizeLabel ? (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--berry)]">
                        {getProductOptionLabel(product)}: {sizeLabel}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatInr(lineTotal)}</p>
                    <p className="text-xs text-black/50">
                      {formatInr(unitPrice)} each
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/50">
                    Quantity
                  </p>
                  <div className="flex items-center gap-2">
                  <button
                    className="h-8 w-8 rounded-full border border-[color:var(--line)] bg-white text-sm"
                    onClick={() => updateQty(product.id, qty - 1, sizeLabel)}
                  >
                    -
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold">{qty}</span>
                  <button
                    className="h-8 w-8 rounded-full border border-[color:var(--line)] bg-white text-sm"
                    onClick={() => updateQty(product.id, qty + 1, sizeLabel)}
                  >
                    +
                  </button>
                  <button
                    className="ml-3 rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold"
                    onClick={() => removeItem(product.id, sizeLabel)}
                  >
                    Remove
                  </button>
                </div>
                </div>

                {customizationNote ? (
                  <div className="mt-5 border border-[color:var(--line)] bg-[color:var(--cream)] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/55">
                      Message Note
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-black/80">
                      {customizationNote}
                    </p>
                  </div>
                ) : null}
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
                  onClick={() => clearCart()}
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
