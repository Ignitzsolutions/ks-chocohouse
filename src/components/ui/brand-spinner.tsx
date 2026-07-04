"use client";

import { BRAND_LOGO_PATH } from "@/lib/brand";

type BrandSpinnerProps = {
  size?: number;
  label?: string;
  className?: string;
};

/**
 * Rotating KS Choco House logo used as a loading indicator.
 * Small variant (size <= 64) is used as an inline / image-overlay spinner.
 * Larger variant with `label` is used as a full-section loader.
 */
export function BrandSpinner({
  size = 56,
  label,
  className = "",
}: BrandSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-[#4a1f1f]/15 border-t-[#4a1f1f] animate-spin"
          style={{ animationDuration: "1.1s" }}
        />
        <img
          src={BRAND_LOGO_PATH}
          alt=""
          aria-hidden="true"
          className="rounded-full bg-white object-contain p-1 shadow-sm ks-brand-spin"
          style={{ width: size * 0.72, height: size * 0.72 }}
        />
      </div>
      {label && (
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5f4a42]">
          {label}
        </p>
      )}
      <style jsx>{`
        .ks-brand-spin {
          animation: ks-brand-spin 2.4s linear infinite;
        }
        @keyframes ks-brand-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ks-brand-spin {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Full-height section loader — use inside a page while data is loading.
 */
export function BrandSectionLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[280px] w-full items-center justify-center py-12">
      <BrandSpinner size={80} label={label} />
    </div>
  );
}
