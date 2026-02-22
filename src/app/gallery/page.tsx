import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const placeholders = Array.from({ length: 9 }).map((_, i) => i + 1);

export default function GalleryPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="premium-panel space-y-3 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-black/50">
            Gallery
          </p>
          <h1 className="hero-display text-5xl leading-none">Our work</h1>
          <p className="text-black/70">
            Replace these placeholders with real product photos.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {placeholders.map((n) => (
            <div
              key={n}
              className="premium-panel aspect-[4/3] rounded-3xl"
            />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
