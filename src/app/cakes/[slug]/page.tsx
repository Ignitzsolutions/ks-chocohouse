import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { BRAND_NAME } from "@/lib/brand";
import { getAbsoluteUrl } from "@/lib/seo";

const cakes = [
  {
    name: "Velvet Noir",
    slug: "velvet-noir",
    description:
      "Dark cocoa sponge with cherry compote, finished in a silk ganache cloak.",
    basePrice: 84,
    prepTime: "40 mins",
  },
  {
    name: "Rosette Aura",
    slug: "rosette-aura",
    description:
      "Blush rose frosting with almond chiffon layers and a soft berry center.",
    basePrice: 96,
    prepTime: "55 mins",
  },
  {
    name: "Citrus Halo",
    slug: "citrus-halo",
    description:
      "Vegan citrus sponge with yuzu glaze and candied zest finish.",
    basePrice: 68,
    prepTime: "35 mins",
  },
];

const optionSets = {
  size: ["6 inch · 8 serves", "8 inch · 12 serves", "10 inch · 18 serves"],
  shape: ["Round", "Heart", "Square"],
  sponge: ["Classic", "Red velvet", "Almond chiffon", "Vegan cocoa"],
  frosting: ["Silk ganache", "Cream cheese", "Buttercream", "Whipped vanilla"],
  filling: ["Cherry compote", "Salted caramel", "Hazelnut praline", "Berry jam"],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cake = cakes.find((item) => item.slug === slug);
  if (!cake) {
    return {
      title: `${BRAND_NAME} | Cake`,
      robots: { index: false, follow: false },
    };
  }
  const url = getAbsoluteUrl(`/cakes/${cake.slug}`);
  return {
    title: `${cake.name} | ${BRAND_NAME}`,
    description: cake.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${cake.name} | ${BRAND_NAME}`,
      description: cake.description,
      url,
      type: "article",
    },
  };
}

export default async function CakeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cake = cakes.find((item) => item.slug === slug);

  if (!cake) {
    notFound();
  }

  const detailSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cake.name,
    description: cake.description,
    brand: { "@type": "Brand", name: BRAND_NAME },
    category: "Cake",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: cake.basePrice,
      availability: "https://schema.org/InStock",
      url: getAbsoluteUrl(`/cakes/${cake.slug}`),
    },
  };

  return (
    <div>
      <JsonLd data={detailSchema} />
      <SiteHeader />
      <main className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Link href="/cakes" className="text-sm text-black/60">
              ← Back to catalog
            </Link>
            <div className="space-y-3">
              <Badge tone="gold">Customization Order</Badge>
              <h1 className="hero-display text-5xl leading-none">{cake.name}</h1>
              <p className="text-black/70">{cake.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-black/60">
                <span>Base price: ${cake.basePrice}</span>
                <span>Prep time: {cake.prepTime}</span>
                <span>Smart validation enabled</span>
              </div>
            </div>

            <div className="premium-panel rounded-3xl p-6">
              <h3 className="hero-display text-4xl leading-none">Customization options</h3>
              <p className="mt-2 text-sm text-black/60">
                Options update pricing and delivery feasibility instantly.
              </p>
              <div className="mt-6 space-y-4">
                {Object.entries(optionSets).map(([key, values]) => (
                  <div key={key} className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-black/40">
                      {key}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {values.map((value) => (
                        <button
                          key={value}
                          className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-xs font-semibold text-black/60 hover:text-black"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="premium-panel rounded-3xl p-6">
              <h3 className="hero-display text-4xl leading-none">Dietary & message</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Eggless", "Vegan", "Sugar-free", "Gluten-free"].map((tag) => (
                  <button
                    key={tag}
                    className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-xs font-semibold text-black/60"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  placeholder="Personalized message"
                  className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm"
                />
                <input
                  placeholder="Topper request"
                  className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm"
                />
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--line)] bg-white p-4 text-sm text-black/60">
                Upload reference image (drag & drop) or paste a link.
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="premium-panel rounded-3xl p-6">
              <h3 className="hero-display text-4xl leading-none">Order summary</h3>
              <div className="mt-4 space-y-3 text-sm text-black/70">
                <div className="flex items-center justify-between">
                  <span>Base cake</span>
                  <span>${cake.basePrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Premium frosting</span>
                  <span>$12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Floral topper</span>
                  <span>$8</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-black">
                  <span>Estimated total</span>
                  <span>${cake.basePrice + 20}</span>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <Button className="w-full">Add to cart</Button>
                <Button className="w-full" variant="outline">
                  Save customization
                </Button>
              </div>
            </div>

            <div className="rounded-3xl bg-[color:var(--ink)]/95 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                Customization snapshot
              </p>
              <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-white/10 p-4 text-xs text-white/80">
{`{
  "cake": "${cake.name}",
  "size": "8 inch",
  "shape": "Round",
  "sponge": "Red velvet",
  "frosting": "Silk ganache",
  "filling": "Cherry compote",
  "dietary": ["Eggless"],
  "message": "Happy birthday, Mira",
  "delivery": "Feb 12 · 3:00 PM"
}`}
              </pre>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
