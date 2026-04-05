import Image from "next/image";
import Link from "next/link";
import { BRAND_NAME, PHONE_NUMBER_DISPLAY, TAGLINE } from "@/lib/brand";
import { isGiftCollectionEnabled } from "@/lib/features";

const coreNavLinks = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const navLinks = isGiftCollectionEnabled()
    ? [
        ...coreNavLinks.slice(0, 2),
        {
          href: "/menu?category=Chocolates&subCategory=Gift%20Collection",
          label: "Gift Collection",
        },
        ...coreNavLinks.slice(2),
      ]
    : coreNavLinks;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--line)] bg-white/92 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-full border border-[color:var(--line)] bg-white shadow-[0_8px_18px_rgba(32,22,16,0.12)]">
            <Image
              src="/images/brand/ks-choco-house-logo.jpg"
              alt="K S Choco House logo"
              fill
              sizes="44px"
              className="object-cover"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="hero-display text-xl font-semibold leading-none">{BRAND_NAME}</p>
            <p className="brand-script mt-1 text-base leading-none text-[color:var(--berry)]">
              {TAGLINE}
            </p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-black/70 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-[color:var(--berry)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[color:var(--berry)] to-[color:var(--berry-dark)] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_24px_rgba(32,22,16,0.24)]"
          >
            Cart / Checkout
          </Link>
        </div>
      </div>
      <div className="border-t border-[color:var(--line)] bg-gradient-to-r from-[color:var(--berry)] via-[color:var(--berry-dark)] to-[color:var(--berry)]">
        <div className="announcement-marquee">
          <div className="announcement-track px-6 py-2 text-xs font-semibold text-white/95">
            <span>WhatsApp Number: {PHONE_NUMBER_DISPLAY}</span>
            <span className="announcement-separator" aria-hidden="true">✦</span>
            <span>Free Delivery for Orders Above ₹1500</span>
            <span className="announcement-separator" aria-hidden="true">✦</span>
            <span className="inline-flex items-center gap-1.5">
              <Image
                src="/images/brand/veg-mark.svg"
                alt="Vegetarian mark"
                width={16}
                height={16}
                className="h-4 w-4 rounded-[2px] bg-white"
              />
              100% Egg Free
            </span>
            <span className="announcement-separator" aria-hidden="true">✦</span>
            <span>WhatsApp Number: {PHONE_NUMBER_DISPLAY}</span>
            <span className="announcement-separator" aria-hidden="true">✦</span>
            <span>Free Delivery for Orders Above ₹1500</span>
            <span className="announcement-separator" aria-hidden="true">✦</span>
            <span className="inline-flex items-center gap-1.5">
              <Image
                src="/images/brand/veg-mark.svg"
                alt="Vegetarian mark"
                width={16}
                height={16}
                className="h-4 w-4 rounded-[2px] bg-white"
              />
              100% Egg Free
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
