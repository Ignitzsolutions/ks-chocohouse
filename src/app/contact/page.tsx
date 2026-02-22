import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LOCATION, INSTAGRAM_URL } from "@/lib/brand";

export default function ContactPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="premium-panel space-y-3 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Contact
          </p>
          <h1 className="hero-display text-5xl leading-none">Reach us</h1>
          <p className="text-black/70">{LOCATION}</p>
        </div>

        <div className="premium-panel mt-8 grid gap-4 rounded-3xl p-6">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-6 py-3 text-sm font-semibold shadow-sm"
          >
            View Instagram
          </a>
          <div className="rounded-2xl border border-dashed border-black/15 bg-[color:var(--cream)] p-4 text-sm text-black/60">
            Google Maps embed placeholder. Replace embed link.
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
