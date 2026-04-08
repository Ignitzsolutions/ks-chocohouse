import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Products | K S Choco House",
  description: "Manage product catalog, pricing, subcategories, and product images.",
  path: "/admin/products",
  noIndex: true,
});

export default function AdminProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
