import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroFloatingCarousel } from "@/components/hero-floating-carousel";
import { HomepageSplash } from "@/components/homepage-splash";
import { HomeCategoriesGrid } from "@/components/home-categories-grid";
import { ReviewsMarquee } from "@/components/reviews-marquee";
import { JsonLd } from "@/components/seo/json-ld";
import {
  BRAND_LOGO_PATH,
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
  title: `Eggless Cakes & Chocolates in Proddatur | ${BRAND_NAME}`,
  description:
    "Experience 100% eggless custom cakes and chocolates in Proddatur from K S Choco House. Order online for free delivery above Rs. 1500.",
  path: "/",
  keywords: [
    ...DEFAULT_SEO_KEYWORDS,
    "eggless cakes and chocolates in Proddatur",
    "order eggless cake online Proddatur",
    "free delivery bakery Proddatur",
  ],
});

export default function Home() {
  const siteUrl = getAbsoluteUrl("/");
  const logoUrl = getAbsoluteUrl(BRAND_LOGO_PATH);

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
      <HomepageSplash />
      <JsonLd data={structuredData} />
      <SiteHeader />
      <section className="py-6">
        <div className="mx-auto w-[97%] px-[5px]">
          <div className="rounded-[38px] bg-[color:var(--cocoa)] p-[3px]">
            <HeroFloatingCarousel />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <section className="premium-panel rounded-3xl p-7 md:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            Eggless Bakery in Proddatur
          </p>
          <h1 className="hero-display mt-3 text-5xl leading-[0.94] md:text-6xl">
            Indulge in Eggless Delights at {BRAND_NAME}
          </h1>
          <div className="mt-5 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4 text-sm leading-7 text-black/72 md:text-base">
              <p>
                {BRAND_NAME} is a home bakery serving {LOCATION} with fresh,
                celebration-ready, 100% eggless cakes and chocolates. If you are
                looking for eggless cakes in Proddatur or premium chocolates for gifting,
                our menu is built for birthdays, anniversaries, festive orders, and
                everyday cravings. Every batch is prepared fresh so the flavor stays rich,
                the crumb stays soft, and the finish feels personal instead of mass-produced.
              </p>
              <p>
                Eggless baking gives many families more comfort when ordering for a group.
                It is easier to share with friends, children, and guests when the bakery
                follows one clear, trusted approach. We focus on balanced sweetness, clean
                texture, and handcrafted presentation, so customers do not feel like they are
                compromising on taste. That matters whether you are ordering a custom cake,
                a chocolate gift box, a bento cake, cupcakes, brownies, or dessert jars.
              </p>
              <p>
                Customers return to us because they want reliable quality, neat decoration,
                and simple ordering. You can <Link href="/menu" className="font-semibold text-[color:var(--berry)] underline">browse the full menu</Link>, add products to the cart,
                and complete checkout in a few steps. If you want to understand how we bake,
                visit the <Link href="/about" className="font-semibold text-[color:var(--berry)] underline">about page</Link>. If you need help with a custom order,
                delivery question, or product recommendation, use the <Link href="/contact" className="font-semibold text-[color:var(--berry)] underline">contact page</Link> and
                speak with us directly.
              </p>
            </div>

            <div className="rounded-3xl bg-[color:var(--ink)]/95 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Quick Order Benefits
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/85">
                <li>100% eggless cakes, chocolates, brownies, cupcakes, and desserts</li>
                <li>Custom message options for birthdays, gifts, and celebrations</li>
                <li>Fresh small-batch preparation for better taste and consistency</li>
                <li>Free delivery on orders above Rs. 1500</li>
              </ul>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/menu"
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-[color:var(--berry)]"
                >
                  Order Online Now
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white"
                >
                  Contact the Bakery
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-[0_18px_36px_rgba(32,22,16,0.06)]">
          <div className="grid gap-5 border-b border-black/10 px-6 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-8 md:py-9">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5f4a42]">
                Categories
              </p>
              <h2 className="hero-display mt-2 text-4xl leading-tight text-[#2f2422]">
                Shop by Category
              </h2>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-[#5d4e49] md:text-base">
                Start with the collection that matches the occasion, then explore sizes, flavors,
                and custom details inside the menu.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <p className="text-sm font-medium leading-6 text-[#5d4e49] md:max-w-sm md:text-right">
                Browse every eggless collection in a cleaner layout and jump straight into the
                category you want to order from.
              </p>
              <Link
                href="/menu"
                className="inline-flex items-center justify-center border border-black/15 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#2f2422] transition hover:border-black/30 hover:bg-[#f8f3ee]"
              >
                View Full Menu
              </Link>
            </div>
          </div>

          <div className="px-6 py-6 md:px-8 md:py-8">
            <HomeCategoriesGrid />
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="premium-panel rounded-3xl p-7 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
              About Us
            </p>
            <h2 className="hero-display mt-3 text-4xl">Home Bakery, Crafted Daily</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-black/70 md:text-base">
              We are a home bakery in {LOCATION}, focused on small-batch cakes and chocolates
              that feel personal and premium. Every order is freshly prepared with careful
              baking, consistent quality, and handcrafted detailing.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-black/70 md:text-base">
              Our goal is simple: make ordering easier for customers who want fresh,
              dependable, eggless products that still feel special when they reach the table.
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

        <section className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="premium-panel rounded-3xl p-7 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
              Why Eggless Baking Works
            </p>
            <h2 className="hero-display mt-3 text-4xl">Comfortable for Families, Strong on Taste</h2>
            <p className="mt-4 text-sm leading-7 text-black/72 md:text-base">
              Many customers prefer eggless baking because it is easier to share confidently at
              home, in offices, and during celebrations. Our approach keeps that practical
              benefit while still delivering rich flavor, soft texture, and premium presentation.
              That is why our bakery works well for both planned events and last-minute dessert
              orders.
            </p>
          </div>

          <div className="premium-panel rounded-3xl p-7 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
              Customer Feedback
            </p>
            <h2 className="hero-display mt-3 text-4xl">What Repeat Buyers Say</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-black/72 md:text-base">
              <p>
                &quot;The cake was fresh, the finish looked premium, and the eggless texture was
                perfect for our family event.&quot;
              </p>
              <p>
                &quot;The custom chocolates are ideal for gifting. Ordering was simple and the
                final presentation felt special.&quot;
              </p>
              <p>
                &quot;We ordered again because the quality stayed consistent and the bakery was easy
                to reach for updates.&quot;
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16 premium-panel rounded-3xl p-7 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
                Ready to Order
              </p>
              <h2 className="hero-display mt-3 text-4xl">Choose Your Cake, Chocolate, or Gift Box</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-black/72 md:text-base">
                Start with the <Link href="/menu" className="font-semibold text-[color:var(--berry)] underline">menu</Link>, review items in the <Link href="/cart" className="font-semibold text-[color:var(--berry)] underline">cart</Link>,
                and complete checkout on the <Link href="/billing" className="font-semibold text-[color:var(--berry)] underline">billing page</Link>. If you need support,
                call {PHONE_NUMBER_DISPLAY} or visit the <Link href="/contact" className="font-semibold text-[color:var(--berry)] underline">contact page</Link>.
              </p>
            </div>
            <Link
              href="/menu"
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--berry)] px-6 py-3 text-sm font-semibold text-white"
            >
              Explore the Menu
            </Link>
          </div>
        </section>

        <section className="mt-16">
          <ReviewsMarquee />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
