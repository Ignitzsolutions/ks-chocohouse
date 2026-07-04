"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_ADMIN_SETTINGS,
  type AdminSettings,
} from "@/lib/admin-settings";
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
import { computePricing } from "@/lib/pricing";
import { formatInr, getPriceDisplayMeta, getProductOptionLabel, type Product } from "@/lib/products";
import { useCartProductLookup } from "@/lib/use-cart-product-lookup";

type CartRow = {
  key: string;
  cartItem: CartItem;
  product: Product | null;
  status: "ok" | "unavailable" | "missing";
  unitPrice: number;
  lineTotal: number;
};

export default function CartPage() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const cartSnapshot = useSyncExternalStore(subscribeCart, getCartStorageSnapshot, () => "[]");
  const items = useMemo<CartItem[]>(
    () => parseCartStorageSnapshot(cartSnapshot),
    [cartSnapshot]
  );
  const cartIds = useMemo(() => items.map((item) => item.productId), [items]);
  const { productById, loading: lookupLoading } = useCartProductLookup(cartIds);

  useEffect(() => {
    let active = true;
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (active) setSettings((data.settings ?? DEFAULT_ADMIN_SETTINGS) as AdminSettings);
      })
      .catch(() => {
        if (active) setSettings(DEFAULT_ADMIN_SETTINGS);
      });
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo<CartRow[]>(() => {
    return items.map((item) => {
      const product = productById.get(item.productId) ?? null;
      const status: CartRow["status"] = !product
        ? "missing"
        : !product.available
        ? "unavailable"
        : "ok";
      const unitPrice = product
        ? getPriceDisplayMeta(product, item.sizeLabel).finalPrice
        : 0;
      return {
        key: getCartItemKey(item.productId, item.sizeLabel),
        cartItem: item,
        product,
        status,
        unitPrice,
        lineTotal: item.qty * unitPrice,
      };
    });
  }, [items, productById]);

  const availableRows = rows.filter((row) => row.status === "ok");
  const blockedRows = rows.filter((row) => row.status !== "ok");
  const subtotal = availableRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const pricing = useMemo(() => computePricing(subtotal, 0, settings), [settings, subtotal]);
  const hasBlockedItems = blockedRows.length > 0;
  const canProceed = availableRows.length > 0 && !hasBlockedItems && !lookupLoading;

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
            {rows.length === 0 && (
              <div className="premium-panel rounded-3xl p-6 text-sm text-black/60">
                {lookupLoading ? "Loading your cart..." : "Your cart is empty."}
              </div>
            )}

            {hasBlockedItems && (
              <div
                role="alert"
                className="rounded-3xl border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-800"
              >
                <p className="font-semibold">Some items in your cart cannot be ordered.</p>
                <p className="mt-1">
                  Please remove the highlighted items below before you can proceed to checkout.
                </p>
              </div>
            )}

            {rows.map((row) => {
              const { cartItem, product, status, unitPrice, lineTotal } = row;
              const isBlocked = status !== "ok";
              const displayName =
                product?.name ??
                (cartItem.sizeLabel
                  ? `Removed product (${cartItem.sizeLabel})`
                  : "Removed product");
              const displayCategory = product?.category ?? "Unknown category";
              const optionLabel = product ? getProductOptionLabel(product) : "Option";

              return (
                <div
                  key={row.key}
                  className={`premium-panel rounded-3xl p-6 ${
                    isBlocked ? "border-2 border-red-300 bg-red-50/40" : ""
                  }`}
                >
                  {isBlocked && (
                    <div className="mb-4 rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm text-red-800">
                      <p className="font-semibold">
                        {status === "missing"
                          ? "This product is no longer available"
                          : "This product is currently unavailable"}
                      </p>
                      <p className="mt-1 text-xs text-red-700">
                        Please remove it from your cart to continue to checkout.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="hero-display text-4xl leading-none">{displayName}</h3>
                      {product?.description ? (
                        <p className="mt-1 text-sm text-black/60">{product.description}</p>
                      ) : null}
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-black/50">
                        {displayCategory}
                      </p>
                      {cartItem.sizeLabel ? (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--berry)]">
                          {optionLabel}: {cartItem.sizeLabel}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {isBlocked ? "—" : formatInr(lineTotal)}
                      </p>
                      <p className="text-xs text-black/50">
                        {isBlocked ? "not counted" : `${formatInr(unitPrice)} each`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/50">
                      Quantity
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        className="h-8 w-8 rounded-full border border-[color:var(--line)] bg-white text-sm disabled:opacity-40"
                        onClick={() =>
                          updateQty(cartItem.productId, cartItem.qty - 1, cartItem.sizeLabel)
                        }
                        disabled={isBlocked}
                      >
                        -
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold">
                        {cartItem.qty}
                      </span>
                      <button
                        className="h-8 w-8 rounded-full border border-[color:var(--line)] bg-white text-sm disabled:opacity-40"
                        onClick={() =>
                          updateQty(cartItem.productId, cartItem.qty + 1, cartItem.sizeLabel)
                        }
                        disabled={isBlocked}
                      >
                        +
                      </button>
                      <button
                        className={`ml-3 rounded-full border px-3 py-1 text-xs font-semibold ${
                          isBlocked
                            ? "border-red-300 bg-red-100 text-red-800"
                            : "border-[color:var(--line)] bg-white"
                        }`}
                        onClick={() => removeItem(cartItem.productId, cartItem.sizeLabel)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {cartItem.customizationNote ? (
                    <div className="mt-5 border border-[color:var(--line)] bg-[color:var(--cream)] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/55">
                        Message Note
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-black/80">
                        {cartItem.customizationNote}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <aside className="space-y-6">
            <div className="premium-panel rounded-3xl p-6">
              <h3 className="hero-display text-4xl leading-none">Order total</h3>
              <div className="mt-4 space-y-3 text-sm text-black/70">
                {pricing.billingLines
                  .filter((line) => line.key === "total" || Number(line.amount) !== 0)
                  .map((line) => (
                    <div
                      key={line.key}
                      className={`flex items-center justify-between ${
                        line.key === "total" ? "font-semibold text-black" : ""
                      }`}
                    >
                      <span>{line.key === "total" ? "Total due now" : line.label}</span>
                      <span>
                        {line.kind === "discount" ? "- " : ""}
                        {formatInr(line.amount)}
                      </span>
                    </div>
                  ))}
                {pricing.freeDeliveryApplied ? (
                  <p className="text-xs text-emerald-700">
                    Delivery charge waived for orders above {formatInr(settings.freeDeliveryThreshold)}.
                  </p>
                ) : null}
              </div>
              <div className="mt-6 space-y-3">
                <Link href="/billing" className={canProceed ? "block" : "pointer-events-none block"}>
                  <Button className="w-full" disabled={!canProceed}>
                    Proceed to checkout
                  </Button>
                </Link>
                {hasBlockedItems && (
                  <p className="text-xs text-red-700">
                    Remove unavailable items above to continue.
                  </p>
                )}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    if (window.confirm("Remove all items from your cart?")) {
                      clearCart();
                    }
                  }}
                  disabled={rows.length === 0}
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
