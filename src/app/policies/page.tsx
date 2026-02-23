import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `Policies | ${BRAND_NAME}`,
  description:
    "Read privacy, refund, cancellation, and delivery policies for K S Choco House orders.",
  path: "/policies",
  keywords: ["bakery refund policy", "cake delivery policy", "privacy policy bakery"],
});

export default function PoliciesPage() {
  const policySchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${BRAND_NAME} Policies`,
    description:
      "Privacy, refund/cancellation, and delivery policy details for customer orders.",
  };

  return (
    <div>
      <JsonLd data={policySchema} />
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="premium-panel space-y-3 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Policies
          </p>
          <h1 className="hero-display text-5xl leading-none">Policies</h1>
          <p className="text-black/70">
            Basic placeholders. Update as needed for your business.
          </p>
        </div>

        <div className="mt-10 space-y-6">
          <section className="premium-panel rounded-3xl p-6">
            <h2 className="hero-display text-4xl leading-none">Privacy policy</h2>
            <p className="mt-2 text-sm text-black/60">
              We only use your details to confirm orders and deliveries.
            </p>
          </section>
          <section className="premium-panel rounded-3xl p-6">
            <h2 className="hero-display text-4xl leading-none">Refund / cancellation</h2>
            <p className="mt-2 text-sm text-black/60">
              As baked goods are perishable, cancellations are handled case by
              case.
            </p>
          </section>
          <section className="premium-panel rounded-3xl p-6">
            <h2 className="hero-display text-4xl leading-none">Delivery policy</h2>
            <p className="mt-2 text-sm text-black/60">
              Delivery depends on availability and area coverage.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
