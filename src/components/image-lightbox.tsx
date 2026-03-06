"use client";

import Image from "next/image";
import { useEffect } from "react";

type Props = {
  open: boolean;
  src: string;
  alt: string;
  title?: string;
  description?: string;
  onClose: () => void;
};

export function ImageLightbox({
  open,
  src,
  alt,
  title,
  description,
  onClose,
}: Props) {
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
          <Image src={src} alt={alt} fill sizes="(max-width: 1024px) 100vw, 960px" className="object-contain" />
        </div>
      </div>
    </div>
  );
}
