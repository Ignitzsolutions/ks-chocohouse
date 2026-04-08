import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Orders | K S Choco House",
  description: "Review orders, update statuses, and manage invoice generation.",
  path: "/admin/orders",
  noIndex: true,
});

export default function AdminOrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
