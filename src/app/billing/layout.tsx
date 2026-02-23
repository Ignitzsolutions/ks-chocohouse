import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Checkout | K S Choco House",
  description: "Complete your order details and payment reference.",
  path: "/billing",
  noIndex: true,
});

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
