import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroFloatingCarousel } from "@/components/hero-floating-carousel";
import { HomeCategoriesGrid } from "@/components/home-categories-grid";

export default function Home() {
  return (
    <div>
      <SiteHeader />
      <section className="py-6">
        <div className="mx-auto w-full px-[5px]">
          <div className="rounded-[38px] bg-[color:var(--cocoa)] p-[3px]">
            <HeroFloatingCarousel />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10">

        <section className="mt-14 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
                Categories
              </p>
              <h2 className="hero-display mt-2 text-4xl">Pick Your Style</h2>
            </div>
            <p className="hidden text-sm text-black/55 md:block">
              Explore all eggless creations category-wise.
            </p>
          </div>

          <HomeCategoriesGrid />
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="premium-panel rounded-3xl p-7 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">About Us</p>
            <h2 className="hero-display mt-3 text-4xl">Home Bakery, Crafted Daily</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/70 md:text-base">
              We are a home bakery in Sastri Nagar, Proddatur, focused on small-batch cakes and
              chocolates that feel personal and premium. Every order is freshly prepared with
              careful baking, consistent quality, and handcrafted detailing.
            </p>
            <Link
              href="/about"
              className="mt-5 inline-flex rounded-full border border-[color:var(--line)] bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/70"
            >
              Read Full Story
            </Link>
          </div>

          <div className="premium-panel rounded-3xl p-7 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
              What We Stand For
            </p>
            <ul className="mt-4 space-y-3 text-sm text-black/75 md:text-base">
              <li>Made with passion and love for baking</li>
              <li>No preservatives</li>
              <li>Made fresh to order</li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
