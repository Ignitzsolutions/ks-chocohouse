import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
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
          <div className="rounded-2xl border border-dashed border-black/15 bg-[color:var(--cream)] p-4 text-sm text-black/60">
            Google Maps embed placeholder. Replace embed link.
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
