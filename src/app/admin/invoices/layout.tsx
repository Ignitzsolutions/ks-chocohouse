import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Invoices | K S Choco House",
  description: "Create and manage offline invoices and sale records.",
  path: "/admin/invoices",
  noIndex: true,
});

export default function AdminInvoicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
