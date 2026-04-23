import type { Metadata } from "next";
import { BRAND_LOGO_PATH, BRAND_NAME, DESCRIPTION, LOCATION, TAGLINE } from "@/lib/brand";
import { getSiteUrl as getConfiguredSiteUrl } from "@/lib/runtime-config";

export function getSiteUrl() {
  return getConfiguredSiteUrl();
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
  const image = getAbsoluteUrl(BRAND_LOGO_PATH);

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    metadataBase: new URL(getSiteUrl()),
    icons: {
      icon: [
        { url: BRAND_LOGO_PATH, type: "image/svg+xml" },
      ],
      shortcut: [BRAND_LOGO_PATH],
      apple: [BRAND_LOGO_PATH],
    },
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
  "The Ultimate Choco Destination",
];

export const BRAND_LONG_DESCRIPTION = `${DESCRIPTION} ${TAGLINE}. Home bakery in ${LOCATION}.`;
