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
  "Built with care, consistency, and an entrepreneurial mindset.",
];

export const metadata: Metadata = buildPageMetadata({
  title: `About ${BRAND_NAME} | Home Bakery in Proddatur`,
  description: `Read the founder story behind ${BRAND_NAME}, a home bakery in ${LOCATION} built from a woman's passion for baking and entrepreneurial spirit.`,
  path: "/about",
  keywords: [
    "about K S Choco House",
    "home bakery Proddatur",
    "woman entrepreneur bakery story",
    "eggless bakery founder story",
  ],
});

export default function AboutPage() {
  const aboutData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${BRAND_NAME}`,
    description: `${BRAND_NAME} is a home bakery in ${LOCATION} shaped by a woman's love for baking and her entrepreneurial drive.`,
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
            The Story Behind {BRAND_NAME}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-black/70 md:text-lg">
            {BRAND_NAME} began with a woman who loved the comfort of home baking and believed
            that handmade cakes and chocolates could carry both emotion and quality. What started
            as a personal passion in {LOCATION} slowly became a serious commitment to creating
            celebration-ready desserts that felt thoughtful, fresh, and deeply personal.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-black/70 md:text-lg">
            She is not just a homemaker. She is also a passionate entrepreneur who turned her
            creativity, discipline, and love for baking into a growing home bakery. With every
            custom cake, chocolate box, brownie batch, and dessert order, she built trust one
            customer at a time by focusing on freshness, consistency, and presentation that feels
            made with heart.
          </p>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <article className="premium-panel rounded-3xl p-8 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
              Founder Journey
            </p>
            <h2 className="hero-display mt-3 text-4xl">From Passion to Purpose</h2>
            <p className="mt-4 text-base leading-relaxed text-black/72">
              The journey of {BRAND_NAME} is rooted in everyday life: caring for home, nurturing
              family, and still choosing to build something meaningful through skill and effort.
              Baking was never treated like a passing hobby. It became a craft to study, improve,
              and present with pride.
            </p>
            <p className="mt-4 text-base leading-relaxed text-black/72">
              That entrepreneurial spirit is what gave the bakery its identity. Instead of staying
              small in ambition, the vision expanded into custom celebration cakes, curated
              chocolate gifting, and a trusted eggless menu people can confidently order for
              birthdays, family functions, and everyday cravings.
            </p>
            <p className="mt-4 text-base leading-relaxed text-black/72">
              Today, the brand reflects both sides of that story: the warmth of home and the
              discipline of a business built with intent.
            </p>
          </article>

          <article className="premium-panel rounded-3xl p-8 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
              What We Stand For
            </p>
            <h2 className="hero-display mt-3 text-4xl">Why Customers Trust Us</h2>
            <ul className="mt-5 space-y-3 text-base text-black/75">
              {standForPoints.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
            <p className="mt-5 text-base leading-relaxed text-black/72">
              Every order is meant to feel dependable, fresh, and personal. That balance of care
              and professionalism is what continues to shape {BRAND_NAME}.
            </p>
          </article>
        </section>

        <section className="mt-8 premium-panel rounded-3xl p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            Our Promise
          </p>
          <h2 className="hero-display mt-3 text-4xl">A Home Bakery with Business Intent</h2>
          <p className="mt-4 max-w-4xl text-base leading-relaxed text-black/72">
            {BRAND_NAME} continues to grow by staying close to what made it meaningful in the
            beginning: handcrafted products, honest quality, eggless baking, and the courage to
            turn personal passion into entrepreneurship. It is a bakery built with warmth, but also
            with vision.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
