import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Order Confirmation | K S Choco House",
  description: "Order confirmation and receipt details.",
  path: "/order/confirm",
  noIndex: true,
});

export default function OrderConfirmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
