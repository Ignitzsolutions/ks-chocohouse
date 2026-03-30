import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { BRAND_NAME } from "@/lib/brand";
import { buildPageMetadata } from "@/lib/seo";

const cakes = [
  {
    name: "Velvet Noir",
    slug: "velvet-noir",
    price: "$84",
    serves: "12",
    tags: ["Dark", "Signature"],
  },
  {
    name: "Rosette Aura",
    slug: "rosette-aura",
    price: "$96",
    serves: "18",
    tags: ["Floral", "Premium"],
  },
  {
    name: "Citrus Halo",
    slug: "citrus-halo",
    price: "$68",
    serves: "10",
    tags: ["Fresh", "Vegan"],
  },
  {
    name: "Midnight Tiramisu",
    slug: "midnight-tiramisu",
    price: "$92",
    serves: "14",
    tags: ["Coffee", "Bestseller"],
  },
  {
    name: "Garden Chiffon",
    slug: "garden-chiffon",
    price: "$78",
    serves: "12",
    tags: ["Eggless", "Soft"],
  },
  {
    name: "Pearl Cascade",
    slug: "pearl-cascade",
    price: "$110",
    serves: "22",
    tags: ["Wedding", "Luxury"],
  },
];

const filters = [
  "Birthday",
  "Wedding",
  "Anniversary",
  "Custom",
  "Eggless",
  "Vegan",
  "Sugar-Free",
];

export const metadata: Metadata = buildPageMetadata({
  title: `Cake Catalog | ${BRAND_NAME}`,
  description: "Browse premium cake styles and start customization.",
  path: "/cakes",
  keywords: ["cake catalog", "custom cake styles", "premium cakes"],
});

export default function CakesPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="premium-panel flex flex-wrap items-end justify-between gap-6 rounded-3xl p-6">
          <div className="space-y-3">
            <Badge tone="sage">Catalog</Badge>
            <h1 className="hero-display text-5xl leading-none">Find a cake worth remembering.</h1>
            <p className="text-black/70">
              Filter by celebration type, dietary needs, or signature style.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              placeholder="Search flavors, tags, or styles"
              className="w-64 rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm"
            />
            <button className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold">
              Sort: Popular
            </button>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {filters.map((filter) => (
            <button
              key={filter}
              className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-xs font-semibold text-black/60 hover:text-black"
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cakes.map((cake) => (
            <Link
              key={cake.slug}
              href={`/cakes/${cake.slug}`}
              className="premium-panel group rounded-3xl p-6 transition hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-2xl">{cake.name}</h3>
                <span className="text-sm font-semibold text-[color:var(--berry)]">
                  {cake.price}
                </span>
              </div>
              <p className="mt-2 text-sm text-black/60">Serves {cake.serves}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {cake.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-black/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between text-sm text-black/60">
                <span>Customize in 6 steps</span>
                <span className="font-semibold text-black group-hover:text-[color:var(--berry)]">
                  Order
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
