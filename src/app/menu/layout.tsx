import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { BRAND_NAME } from "@/lib/brand";
import { getProducts } from "@/lib/products";
import { buildPageMetadata, getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `Menu | ${BRAND_NAME} Eggless Cakes & Chocolates`,
  description:
    "Explore all categories: chocolates, cakes, bento cakes, brownies, cheesecake, cookies, cupcakes, and desserts.",
  path: "/menu",
  keywords: [
    "eggless cakes menu",
    "chocolates menu",
    "bento cakes",
    "custom cakes in Proddatur",
  ],
});

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  const products = getProducts();
  const siteUrl = getAbsoluteUrl("/");

  const productSchema = products.slice(0, 25).map((product) => ({
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: getAbsoluteUrl(product.imageSrc),
    category: product.category,
    brand: { "@type": "Brand", name: BRAND_NAME },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Eggless", value: product.eggless ? "Yes" : "No" },
    ],
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.priceInr,
      availability: product.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: getAbsoluteUrl(`/menu?category=${encodeURIComponent(product.category)}`),
    },
  }));

  const menuSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}menu#collection`,
        name: `${BRAND_NAME} Menu`,
        description: "Category-based menu for eggless cakes and chocolates.",
        url: getAbsoluteUrl("/menu"),
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}menu#items`,
        itemListElement: productSchema.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item,
        })),
      },
    ],
  };

  return (
    <>
      <JsonLd data={menuSchema} />
      {children}
    </>
  );
}
