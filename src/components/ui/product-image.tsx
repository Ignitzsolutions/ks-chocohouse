"use client";

import { useState } from "react";
import { BrandSpinner } from "./brand-spinner";

type ProductImageProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  spinnerSize?: number;
};

/**
 * <img> wrapper that shows a centered rotating logo spinner behind the
 * image until it has finished loading. Prevents the empty-cream box the
 * customer sees on slow connections while product photos stream in.
 */
export function ProductImage({
  src,
  alt,
  className = "",
  loading = "lazy",
  spinnerSize = 56,
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
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setErrored(true);
          setLoaded(true);
        }}
      />
    </>
  );
}
