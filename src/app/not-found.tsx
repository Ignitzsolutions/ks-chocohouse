import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-black/50">
          Page not found
        </p>
        <h1 className="mt-6 text-4xl">This slice is missing.</h1>
        <p className="mt-4 text-black/70">
          The page you are looking for has already been served. Let’s head back
          to something delicious.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--berry)] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(180,69,94,0.35)] transition hover:bg-[color:var(--berry-dark)]"
          >
            Return home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
