import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { getAbsoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    "/",
    "/about",
    "/menu",
    "/order",
    "/gallery",
    "/contact",
    "/policies",
    "/cakes",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: getAbsoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const categories = Array.from(new Set(getProducts().map((product) => product.category)));
  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: getAbsoluteUrl(`/menu?category=${encodeURIComponent(category)}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticEntries, ...categoryEntries];
}
