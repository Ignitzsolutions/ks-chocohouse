"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  src: string;
  alt: string;
  title?: string;
  description?: string;
  onClose: () => void;
};

const FALLBACK_PREVIEW_IMAGE = "/images/categories/cakes.svg";

function normalizePreviewSrc(value: string) {
  const normalized = value.trim();
  return normalized || FALLBACK_PREVIEW_IMAGE;
}

export function ImageLightbox({
  open,
  src,
  alt,
  title,
  description,
  onClose,
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const normalizedSrc = normalizePreviewSrc(src);
  const showingFallback = failedSrc === normalizedSrc;
  const displaySrc = showingFallback ? FALLBACK_PREVIEW_IMAGE : normalizedSrc;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
              Product Preview
            </p>
            <p className="text-lg font-semibold text-black">{title || alt}</p>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-black/60">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold"
          >
            Close
          </button>
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[color:var(--cream)]">
          <img
            src={displaySrc}
            alt={alt}
            className="h-full w-full object-contain"
            referrerPolicy="no-referrer"
            loading="eager"
            onError={() => {
              if (normalizedSrc === FALLBACK_PREVIEW_IMAGE) return;
              setFailedSrc(normalizedSrc);
            }}
          />
          {showingFallback && normalizedSrc !== FALLBACK_PREVIEW_IMAGE ? (
            <p className="absolute bottom-2 left-2 rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold text-white">
              Original image unavailable. Showing fallback.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
