import { BrandSpinner } from "./brand-spinner";

/**
 * Full-viewport loader shown while a page is loading. Used by Next.js
 * route-level loading.tsx files and any client-side full-page loading
 * state. Covers the entire viewport with a cream background and centers
 * the branded spinning logo.
 */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--cream)]"
    >
      <BrandSpinner size={120} label={label} />
    </div>
  );
}
