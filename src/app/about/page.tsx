import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { BRAND_NAME, LOCATION } from "@/lib/brand";
import { buildPageMetadata } from "@/lib/seo";

const standForPoints = [
  "Made with passion and love for baking.",
  "No preservatives in our products.",
  "Made fresh to order in small batches.",
];

export const metadata: Metadata = buildPageMetadata({
  title: `About ${BRAND_NAME} | Home Bakery in Proddatur`,
  description: `${BRAND_NAME} is a home bakery in ${LOCATION} serving fresh, 100% eggless cakes and chocolates.`,
  path: "/about",
  keywords: ["about K S Choco House", "home bakery Proddatur", "eggless bakery"],
});

export default function AboutPage() {
  const aboutData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${BRAND_NAME}`,
    description: `${BRAND_NAME} is a home bakery in ${LOCATION} focused on fresh small-batch products.`,
    inLanguage: "en-IN",
  };

  return (
    <div>
      <JsonLd data={aboutData} />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="premium-panel rounded-[34px] p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">About Us</p>
          <h1 className="hero-display mt-3 text-5xl leading-[0.95] md:text-6xl">
            Home Bakery, Crafted Daily
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-black/70 md:text-lg">
            {BRAND_NAME} is a home bakery from {LOCATION}. We create cakes and chocolates in
            small batches, balancing rich flavor, clean ingredients, and handcrafted finishing for
            every order.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-black/70 md:text-lg">
            Our baking process is simple: plan carefully, prepare fresh, and deliver with
            consistency. We focus on products that taste homemade and look celebration-ready,
            whether it is a daily dessert, birthday cake, or custom chocolate gift.
          </p>
        </section>

        <section className="mt-8 premium-panel rounded-3xl p-8 md:p-10">
          <h2 className="hero-display text-4xl">What We Stand For</h2>
          <ul className="mt-5 space-y-3 text-base text-black/75">
            {standForPoints.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
