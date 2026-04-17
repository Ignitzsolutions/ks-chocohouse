import type { Metadata } from "next";
import "./globals.css";
import { BrowserTitleBlink } from "@/components/browser-title-blink";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { BRAND_NAME, DESCRIPTION, TAGLINE } from "@/lib/brand";
import { buildPageMetadata, DEFAULT_SEO_KEYWORDS } from "@/lib/seo";

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
  const motionInitScript = `
    (function() {
      try {
        var key = 'bakery_motion_pref';
        var stored = localStorage.getItem(key);
        var mode = stored === 'standard' || stored === 'reduced'
          ? stored
          : (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'standard');
        document.documentElement.dataset.motion = mode;
      } catch (error) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: motionInitScript }} />
        <BrowserTitleBlink />
        {children}
        <WhatsappFab />
      </body>
    </html>
  );
}
