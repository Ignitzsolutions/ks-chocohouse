import Image from "next/image";
import { BRAND_NAME, TAGLINE, DESCRIPTION, LOCATION, INSTAGRAM_URL } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[color:var(--line)] bg-white/95">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <h3 className="hero-display text-3xl">{BRAND_NAME}</h3>
          <p className="text-sm text-black/70">
            {TAGLINE}
          </p>
          <p className="text-sm text-black/70">{DESCRIPTION}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-black/50">
            100% Eggless · Freshly Made · Custom Designs
          </p>
          <div className="pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45">
              FSSAI Validation
            </p>
            <Image
              src="/images/brand/fssai-logo.svg"
              alt="Food Safety and Standards Authority of India (FSSAI) logo"
              width={140}
              height={47}
              className="mt-1 h-auto w-[130px] object-contain"
            />
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Location</p>
          <p className="text-black/60">{LOCATION}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Social</p>
          <p className="text-black/60">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[color:var(--berry)]"
            >
              Instagram
            </a>
          </p>
          <p className="text-black/60">Open daily · Custom orders available</p>
        </div>
      </div>
      <div className="border-t border-[color:var(--line)] py-4 text-center text-xs text-black/50">
        © 2026 {BRAND_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
