import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product-detail-client";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BRAND_NAME } from "@/lib/brand";
import { getProductBySlug } from "@/lib/product-store";
import {
  DEFAULT_SEO_KEYWORDS,
  buildPageMetadata,
  getAbsoluteUrl,
} from "@/lib/seo";
import { getProductHref } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return buildPageMetadata({
      title: `${BRAND_NAME} | Product`,
      description: "Product not found.",
      path: "/products",
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${product.name} | ${BRAND_NAME}`,
    description: product.description,
    path: getProductHref(product),
    keywords: [
      ...DEFAULT_SEO_KEYWORDS,
      product.name,
      product.category,
      product.subCategory,
      `${product.name} Proddatur`,
    ],
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const canonicalPath = getProductHref(product);

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: getAbsoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Menu",
          item: getAbsoluteUrl("/menu"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product.category,
          item: getAbsoluteUrl(`/menu?category=${encodeURIComponent(product.category)}`),
        },
        {
          "@type": "ListItem",
          position: 4,
          name: product.name,
          item: getAbsoluteUrl(canonicalPath),
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      category: product.category,
      image: [getAbsoluteUrl(product.imageSrc)],
      brand: {
        "@type": "Brand",
        name: BRAND_NAME,
      },
      offers: {
        "@type": "Offer",
        availability: product.available
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        priceCurrency: "INR",
        price: product.priceInr,
        url: getAbsoluteUrl(canonicalPath),
      },
    },
  ];

  return (
    <div>
      <JsonLd data={schema} />
      <SiteHeader />
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 border border-black/10 bg-white px-4 py-4 sm:px-5">
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/48">
            <Link href="/" className="hover:text-[color:var(--berry)]">
              Home
            </Link>
            <span>/</span>
            <Link href="/menu" className="hover:text-[color:var(--berry)]">
              Menu
            </Link>
            <span>/</span>
            <Link
              href={`/menu?category=${encodeURIComponent(product.category)}`}
              className="hover:text-[color:var(--berry)]"
            >
              {product.category}
            </Link>
            <span>/</span>
            <span className="text-black/78">{product.name}</span>
          </nav>
        </div>

        <ProductDetailClient product={product} />
      </main>
      <SiteFooter />
    </div>
  );
}
