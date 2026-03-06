import type { Metadata } from "next";
import { BRAND_NAME, DESCRIPTION, LOCATION, TAGLINE } from "@/lib/brand";

const DEFAULT_DEV_URL = "http://localhost:3006";

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.NODE_ENV === "production" ? "" : DEFAULT_DEV_URL);
  if (!raw) return DEFAULT_DEV_URL;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function getAbsoluteUrl(path = "/") {
  const base = getSiteUrl();
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

type MetadataInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function buildPageMetadata(input: MetadataInput): Metadata {
  const canonical = getAbsoluteUrl(input.path ?? "/");
  const image = getAbsoluteUrl("/images/brand/ks-choco-house-logo.jpg");

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    metadataBase: new URL(getSiteUrl()),
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: input.title,
      description: input.description,
      siteName: BRAND_NAME,
      images: [{ url: image, width: 1200, height: 1200, alt: BRAND_NAME }],
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
    robots: input.noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}

export const DEFAULT_SEO_KEYWORDS = [
  "K S Choco House",
  "Eggless cakes Proddatur",
  "Eggless bakery Proddatur",
  "Custom cakes Proddatur",
  "Chocolates Proddatur",
  "Bento cakes Proddatur",
  "Home bakery Sastry Nagar",
  "Ultimate choco destination",
];

export const BRAND_LONG_DESCRIPTION = `${DESCRIPTION} ${TAGLINE}. Home bakery in ${LOCATION}.`;
