import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ReviewsMarquee } from "@/components/reviews-marquee";
import { JsonLd } from "@/components/seo/json-ld";
import {
  BRAND_NAME,
  CITY,
  COUNTRY_CODE,
  FULL_ADDRESS,
  INSTAGRAM_URL,
  LOCATION,
  PINCODE,
  PHONE_NUMBER_DISPLAY,
  STATE,
  WHATSAPP_NUMBER,
} from "@/lib/brand";
import { buildPageMetadata, getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `Contact ${BRAND_NAME} | ${LOCATION}`,
  description: `Contact ${BRAND_NAME} for 100% eggless cakes and chocolates in ${LOCATION}.`,
  path: "/contact",
  keywords: ["contact K S Choco House", "bakery phone number", "Proddatur bakery"],
});

export default function ContactPage() {
  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${BRAND_NAME}`,
    mainEntity: {
      "@type": "Bakery",
      name: BRAND_NAME,
      telephone: PHONE_NUMBER_DISPLAY,
      url: getAbsoluteUrl("/contact"),
      sameAs: [INSTAGRAM_URL],
      address: {
        "@type": "PostalAddress",
        streetAddress: FULL_ADDRESS,
        addressLocality: CITY,
        addressRegion: STATE,
        postalCode: PINCODE,
        addressCountry: COUNTRY_CODE,
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: PHONE_NUMBER_DISPLAY,
      },
    },
  };

  return (
    <div>
      <JsonLd data={contactSchema} />
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="premium-panel space-y-3 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Contact
          </p>
          <h1 className="hero-display text-5xl leading-none">Reach us</h1>
          <p className="text-black/70">{FULL_ADDRESS}</p>
        </div>

        <div className="premium-panel mt-8 grid gap-4 rounded-3xl p-6">
          <p className="text-sm text-black/60">
            Phone: {PHONE_NUMBER_DISPLAY} · WhatsApp: +{WHATSAPP_NUMBER}
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-6 py-3 text-sm font-semibold shadow-sm"
          >
            View Instagram
          </a>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
              Google Maps
            </p>
            <div
              className="relative overflow-hidden rounded-2xl border border-black/10 bg-white"
              style={{ aspectRatio: "4 / 3" }}
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3858.1939084076243!2d78.5450242755276!3d14.75810277320031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bb4794c8c8d77ef%3A0x8dc92ceee9f5d15c!2sKS%20CHOCO%20HOUSE!5e0!3m2!1sen!2sfi!4v1773163032334!5m2!1sen!2sfi"
                width="600"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full"
                title="KS Choco House map"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
              Google Reviews
            </p>
            <p className="mt-2 text-sm text-black/60">
              Read customer feedback and add your review.
            </p>
            <a
              href="https://maps.app.goo.gl/8u854U6K9BDk7CsT7"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--berry)]"
            >
              View Google Reviews
            </a>
          </div>
        </div>

        <div className="mt-10">
          <ReviewsMarquee />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
