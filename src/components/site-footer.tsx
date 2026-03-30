import Link from "next/link";
import Image from "next/image";
import {
  BRAND_NAME,
  TAGLINE,
  DESCRIPTION,
  FULL_ADDRESS,
  INSTAGRAM_URL,
} from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[color:var(--line)] bg-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_0.9fr_1fr_1fr] lg:px-8">
        <div className="space-y-3">
          <h3 className="hero-display text-3xl">{BRAND_NAME}</h3>
          <p className="text-sm text-black/85">{TAGLINE}</p>
          <p className="text-sm text-black/82">{DESCRIPTION}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-black/72">
            100% Eggless · Freshly Made · Custom Designs
          </p>
          <div className="pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/72">
              FSSAI Validation
            </p>
            <Image
              src="/images/brand/fssai-logo.svg"
              alt="Food Safety and Standards Authority of India (FSSAI) logo"
              width={140}
              height={47}
              className="mt-1 h-auto w-[130px] object-contain"
            />
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/72">
              FSSAI No: 20124233000089
            </p>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-semibold uppercase tracking-[0.14em] text-black/80">Quick Links</p>
          <nav className="flex flex-col gap-2 text-black/82">
            <Link href="/" className="transition hover:text-[color:var(--berry)]">
              Home
            </Link>
            <Link href="/menu" className="transition hover:text-[color:var(--berry)]">
              Menu
            </Link>
            <Link href="/about" className="transition hover:text-[color:var(--berry)]">
              About Us
            </Link>
            <Link href="/contact" className="transition hover:text-[color:var(--berry)]">
              Contact
            </Link>
            <Link href="/gallery" className="transition hover:text-[color:var(--berry)]">
              Gallery
            </Link>
            <Link href="/policies" className="transition hover:text-[color:var(--berry)]">
              Policies
            </Link>
          </nav>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-semibold uppercase tracking-[0.14em] text-black/80">Location</p>
          <p className="leading-6 text-black/82">{FULL_ADDRESS}</p>
          <p className="text-black/78">Open daily · Custom orders available</p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-semibold uppercase tracking-[0.14em] text-black/80">Social</p>
          <p className="text-black/82">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[color:var(--berry)]"
            >
              Instagram
            </a>
          </p>
          <p className="leading-6 text-black/78">
            Follow our latest cakes, chocolates, custom orders, and seasonal creations.
          </p>
        </div>
      </div>
      <div className="border-t border-[color:var(--line)] py-4 text-center text-xs text-black/72">
        © 2026 {BRAND_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
