import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroFloatingCarousel } from "@/components/hero-floating-carousel";
import { HomeCategoriesGrid } from "@/components/home-categories-grid";
import { JsonLd } from "@/components/seo/json-ld";
import {
  BRAND_NAME,
  CITY,
  COUNTRY_CODE,
  DESCRIPTION,
  FULL_ADDRESS,
  INSTAGRAM_URL,
  LOCATION,
  PINCODE,
  PHONE_NUMBER_DISPLAY,
  STATE,
  TAGLINE,
  WHATSAPP_NUMBER,
} from "@/lib/brand";
import { buildPageMetadata, DEFAULT_SEO_KEYWORDS, getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `${BRAND_NAME} | 100% Eggless Cakes & Chocolates | Proddatur`,
  description: `${DESCRIPTION} 100% eggless custom cakes and chocolates in ${LOCATION}.`,
  path: "/",
  keywords: DEFAULT_SEO_KEYWORDS,
});

export default function Home() {
  const siteUrl = getAbsoluteUrl("/");
  const logoUrl = getAbsoluteUrl("/images/brand/ks-choco-house-logo.jpg");

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: BRAND_NAME,
        url: siteUrl,
        logo: logoUrl,
        sameAs: [INSTAGRAM_URL],
        description: DESCRIPTION,
      },
      {
        "@type": "Bakery",
        "@id": `${siteUrl}#bakery`,
        name: BRAND_NAME,
        image: logoUrl,
        description: `${DESCRIPTION} 100% eggless.`,
        servesCuisine: "Bakery",
        areaServed: "Proddatur",
        telephone: PHONE_NUMBER_DISPLAY,
        address: {
          "@type": "PostalAddress",
          streetAddress: FULL_ADDRESS,
          addressLocality: CITY,
          addressRegion: STATE,
          postalCode: PINCODE,
          addressCountry: COUNTRY_CODE,
        },
        paymentAccepted: ["Cash", "UPI", "Bank Transfer"],
        url: siteUrl,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        url: siteUrl,
        name: BRAND_NAME,
        description: TAGLINE,
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "Is K S Choco House 100% eggless?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. K S Choco House serves 100% eggless cakes and chocolates.",
            },
          },
          {
            "@type": "Question",
            name: "How do I place an order?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Browse products, add to cart, checkout with UPI payment reference, then wait for admin verification.",
            },
          },
          {
            "@type": "Question",
            name: "Where is K S Choco House located?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `${BRAND_NAME} is based in ${LOCATION}.`,
            },
          },
          {
            "@type": "Question",
            name: "How can I contact the bakery?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `Contact ${PHONE_NUMBER_DISPLAY} or WhatsApp +${WHATSAPP_NUMBER}.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <div>
      <JsonLd data={structuredData} />
      <SiteHeader />
      <section className="py-6">
        <div className="mx-auto w-full px-[5px]">
          <div className="rounded-[38px] bg-[color:var(--cocoa)] p-[3px]">
            <HeroFloatingCarousel />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10">

        <section className="mt-14 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
                Categories
              </p>
              <h2 className="hero-display mt-2 text-4xl">Pick Your Style</h2>
            </div>
            <p className="hidden text-sm text-black/55 md:block">
              Explore all eggless creations category-wise.
            </p>
          </div>

          <HomeCategoriesGrid />
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="premium-panel rounded-3xl p-7 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">About Us</p>
            <h2 className="hero-display mt-3 text-4xl">Home Bakery, Crafted Daily</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/70 md:text-base">
              We are a home bakery in {LOCATION}, focused on small-batch cakes and chocolates
              that feel personal and premium. Every order is freshly prepared with
              careful baking, consistent quality, and handcrafted detailing.
            </p>
            <Link
              href="/about"
              className="mt-5 inline-flex rounded-full border border-[color:var(--line)] bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/70"
            >
              Read Full Story
            </Link>
          </div>

          <div className="premium-panel rounded-3xl p-7 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
              What We Stand For
            </p>
            <ul className="mt-4 space-y-3 text-sm text-black/75 md:text-base">
              <li>Made with passion and love for baking</li>
              <li>No preservatives</li>
              <li>Made fresh to order</li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
