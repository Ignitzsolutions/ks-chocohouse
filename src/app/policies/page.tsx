import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `Policies | ${BRAND_NAME}`,
  description:
    "Read privacy, no-return, no-refund, cancellation, and delivery policies for K S Choco House orders.",
  path: "/policies",
  keywords: ["bakery refund policy", "cake delivery policy", "privacy policy bakery"],
});

export default function PoliciesPage() {
  const policySchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${BRAND_NAME} Policies`,
    description:
      "Privacy, no-return/no-refund, cancellation, and delivery policy details for customer orders.",
  };

  return (
    <div>
      <JsonLd data={policySchema} />
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="premium-panel space-y-3 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Policies
          </p>
          <h1 className="hero-display text-5xl leading-none">Policies</h1>
          <p className="text-black/70">
            Please review these terms before placing an order with {BRAND_NAME}.
          </p>
        </div>

        <div className="mt-10 space-y-6">
          <section className="premium-panel rounded-3xl p-6">
            <h2 className="hero-display text-4xl leading-none">Privacy policy</h2>
            <p className="mt-2 text-sm text-black/60">
              We collect customer details such as name, phone number, delivery
              address, order notes, payment reference, and optional GST billing
              information only to confirm, prepare, deliver, and support orders.
              Customer information is not sold or shared for marketing by third
              parties. Access is limited to order handling, billing, delivery,
              support, legal compliance, and business record keeping.
            </p>
          </section>
          <section className="premium-panel rounded-3xl p-6">
            <h2 className="hero-display text-4xl leading-none">No return / no refund</h2>
            <p className="mt-2 text-sm text-black/60">
              Cakes, chocolates, and custom bakery products are perishable and
              often made to order. Confirmed orders cannot be returned or
              refunded once preparation has started or the product has been
              delivered. If there is a genuine issue with an order, contact us
              immediately with the order details so we can review it.
            </p>
          </section>
          <section className="premium-panel rounded-3xl p-6">
            <h2 className="hero-display text-4xl leading-none">Delivery policy</h2>
            <p className="mt-2 text-sm text-black/60">
              Delivery availability, timing, and charges depend on order value,
              location, schedule, and operational capacity. Delivery charges and
              applicable taxes are shown during checkout or invoice creation
              before the order is confirmed.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
