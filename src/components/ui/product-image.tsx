"use client";

import Image from "next/image";
import { useState } from "react";
import { BrandSpinner } from "./brand-spinner";

type ProductImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  spinnerSize?: number;
  sizes?: string;
};

/**
 * next/image wrapper that shows a centered rotating logo spinner behind
 * the image until it has finished loading. Prevents the empty-cream box
 * the customer sees on slow connections while product photos stream in.
 *
 * Must be rendered inside a parent with `position: relative` because it
 * uses `fill` under the hood.
 */
export function ProductImage({
  src,
  alt,
  className = "",
  priority = false,
  spinnerSize = 56,
  sizes = "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw",
}: ProductImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <>
      {!loaded && !errored && (
        <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--cream)]">
          <BrandSpinner size={spinnerSize} />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        className={`${className} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setErrored(true);
          setLoaded(true);
        }}
      />
    </>
  );
}

