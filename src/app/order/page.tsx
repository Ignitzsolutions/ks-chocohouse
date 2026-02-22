import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND_NAME } from "@/lib/brand";

export default function OrderPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="premium-panel space-y-3 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Order
          </p>
          <h1 className="hero-display text-5xl leading-none">Place your order in-app</h1>
          <p className="text-black/70">
            Choose products, review cart, pay via UPI QR, and submit your payment
            reference directly on {BRAND_NAME}.
          </p>
        </div>

        <div className="premium-panel mt-8 grid gap-4 rounded-3xl p-6 sm:grid-cols-3">
          <Link
            href="/menu"
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-6 py-3 text-sm font-semibold shadow-sm"
          >
            Browse Menu
          </Link>
          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-6 py-3 text-sm font-semibold shadow-sm"
          >
            View Cart
          </Link>
          <Link
            href="/billing"
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--berry)] px-6 py-3 text-sm font-semibold text-white"
          >
            Go to Checkout
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
