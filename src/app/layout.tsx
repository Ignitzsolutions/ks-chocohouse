import type { Metadata } from "next";
import { Cormorant_Garamond, Dancing_Script, Open_Sans } from "next/font/google";
import "./globals.css";
import { BRAND_NAME, DESCRIPTION, TAGLINE } from "@/lib/brand";
import { buildPageMetadata, DEFAULT_SEO_KEYWORDS } from "@/lib/seo";

const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const brandScript = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = buildPageMetadata({
  title: `${BRAND_NAME} | ${TAGLINE} | Proddatur`,
  description: `${DESCRIPTION} ${TAGLINE}.`,
  path: "/",
  keywords: DEFAULT_SEO_KEYWORDS,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${openSans.variable} ${brandScript.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
