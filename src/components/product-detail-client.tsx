"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImageLightbox } from "@/components/image-lightbox";
import {
  addItem,
  getCart,
  getCartItemKey,
  setItemCustomizationNote,
} from "@/lib/cart";
import {
  getDisplayFlavorOptions,
  getPriceDisplayMeta,
  getProductOptionLabel,
  getDisplaySizeOptions,
  type Product,
} from "@/lib/products";
import { PHONE_NUMBER_DISPLAY, whatsappLink } from "@/lib/brand";

type Props = {
  product: Product;
};

function buildGalleryFrames(product: Product) {
  const gallery = Array.from(
    new Set([product.imageSrc, ...(product.imageGallery ?? [])].filter(Boolean))
  );
  return gallery.map((src, index) => ({
    id: `${product.id}-gallery-${index}`,
    src,
    alt: index === 0 ? product.name : `${product.name} view ${index + 1}`,
    label: index === 0 ? "Front" : `View ${index + 1}`,
    objectPosition: "center center",
  }));
}

function isLimitedDeliveryCategory(product: Product) {
  const haystack = `${product.category} ${product.name}`.toLowerCase();
  return /cake|cheesecake/.test(haystack);
}

function composeCustomizationNote(
  note: string,
  selectedFlavor: string
) {
  const trimmedNote = note.trim();
  const flavorLine = selectedFlavor ? `Flavour: ${selectedFlavor}` : "";
  return [flavorLine, trimmedNote].filter(Boolean).join(" | ");
}

export function ProductDetailClient({ product }: Props) {
  const galleryFrames = useMemo(() => buildGalleryFrames(product), [product]);
  const sizeOptions = useMemo(() => getDisplaySizeOptions(product), [product]);
  const optionLabel = useMemo(() => getProductOptionLabel(product), [product]);
  const flavorOptions = useMemo(
    () => (product.flavorSelectionEnabled ? getDisplayFlavorOptions(product) : []),
    [product]
  );
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] ?? "");
  const [selectedFlavor, setSelectedFlavor] = useState(flavorOptions[0] ?? "");
  const [messageNote, setMessageNote] = useState("");
  const [lineQty, setLineQty] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  const activeFrame = galleryFrames[activeFrameIndex] ?? galleryFrames[0];
  const priceMeta = useMemo(
    () => getPriceDisplayMeta(product, selectedSize || undefined),
    [product, selectedSize]
  );

  const cartQty =
    getCart().find(
      (item) =>
        getCartItemKey(item.productId, item.sizeLabel) ===
        getCartItemKey(product.id, selectedSize || undefined)
    )?.qty ?? 0;

  const whatsappHref = whatsappLink(
    `Hi, I want to customize ${product.name}${selectedSize ? ` (${selectedSize})` : ""}${
      selectedFlavor ? ` with ${selectedFlavor} flavour` : ""
    }.`
  );

  const persistLine = (qty: number) => {
    const safeQty = Math.max(1, qty);
    addItem(product.id, safeQty, selectedSize || undefined);
    const composedNote = composeCustomizationNote(messageNote, selectedFlavor);
    if (composedNote) {
      setItemCustomizationNote(product.id, composedNote, selectedSize || undefined);
    }
    setAddedFeedback(
      `${safeQty} item${safeQty > 1 ? "s" : ""} added to cart${selectedSize ? ` · ${selectedSize}` : ""}.`
    );
  };

  const handleBuyNow = () => {
    persistLine(lineQty);
    window.location.assign("/cart");
  };

  const limitedDelivery = isLimitedDeliveryCategory(product);

  return (
    <>
      <section className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.88fr)] lg:items-start">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_92px] lg:items-start">
          <div className="relative overflow-hidden border border-[#d8cdc7] bg-[#f6f1ec]">
            <div className="relative aspect-square">
              <img
                src={activeFrame.src}
                alt={activeFrame.alt}
                className="h-full w-full object-cover"
                style={{ objectPosition: activeFrame.objectPosition }}
                loading="eager"
                decoding="async"
              />

              {galleryFrames.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveFrameIndex((current) =>
                        current === 0 ? galleryFrames.length - 1 : current - 1
                      )
                    }
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-black/10 bg-white/95 text-[#3b2b2b] shadow-sm"
                    aria-label="Previous product image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveFrameIndex((current) => (current + 1) % galleryFrames.length)
                    }
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-black/10 bg-white/95 text-[#3b2b2b] shadow-sm"
                    aria-label="Next product image"
                  >
                    ›
                  </button>
                </>
              ) : null}

              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center border border-black/10 bg-white/95 text-[#3b2b2b] shadow-sm"
                aria-label={`Zoom image for ${product.name}`}
              >
                ⤢
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 lg:grid-cols-1">
            {galleryFrames.map((frame, index) => {
              const selected = index === activeFrameIndex;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => setActiveFrameIndex(index)}
                  className={`overflow-hidden border bg-[#f6f1ec] text-left transition ${
                    selected ? "border-[#5a2a2a]" : "border-[#ddd2cb] hover:border-[#b79f93]"
                  }`}
                >
                  <div className="aspect-square">
                    <img
                      src={frame.src}
                      alt={frame.alt}
                      className="h-full w-full object-cover"
                      style={{ objectPosition: frame.objectPosition }}
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="space-y-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c7770]">
              {product.category}
            </p>
            <h1 className="mt-2 text-[30px] font-semibold leading-tight text-[#3b2b2b] sm:text-[34px]">
              {product.name}
            </h1>
            <div className="mt-5 h-px w-20 bg-[#4a1f1f]" />
            <p className="mt-6 text-[22px] font-medium text-[#4b403d]">
              {priceMeta.finalPriceLabel}
            </p>
            {priceMeta.pricePerKgLabel ? (
              <p className="mt-2 text-sm font-medium text-[#6e5e58]">{priceMeta.pricePerKgLabel}</p>
            ) : null}
          </div>

          <div className="space-y-4">
            {sizeOptions.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-[120px_minmax(0,300px)] md:items-center">
                <label
                  htmlFor="product-size"
                  className="text-sm font-medium text-[#5d4c46]"
                >
                  {optionLabel}
                </label>
                <div className="relative">
                  <select
                    id="product-size"
                    value={selectedSize}
                    onChange={(event) => setSelectedSize(event.target.value)}
                    className="h-12 w-full appearance-none border border-[#d8cdc7] bg-[#f5f5f5] px-4 pr-10 text-sm text-[#3b2b2b] outline-none focus:border-[#6b4c3f]"
                  >
                    {sizeOptions.map((size) => (
                      <option key={`${product.id}-${size}`} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#7f6c65]">
                    ▾
                  </span>
                </div>
              </div>
            ) : null}

            {flavorOptions.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-[120px_minmax(0,300px)] md:items-center">
                <label
                  htmlFor="product-flavor"
                  className="text-sm font-medium text-[#5d4c46]"
                >
                  Flavour
                </label>
                <div className="relative">
                  <select
                    id="product-flavor"
                    value={selectedFlavor}
                    onChange={(event) => setSelectedFlavor(event.target.value)}
                    className="h-12 w-full appearance-none border border-dotted border-[#6b4c3f] bg-[#f5f5f5] px-4 pr-10 text-sm text-[#3b2b2b] outline-none focus:border-[#4a1f1f]"
                  >
                    {flavorOptions.map((flavor) => (
                      <option key={`${product.id}-${flavor}`} value={flavor}>
                        {flavor}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#7f6c65]">
                    ▾
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="message-note"
              className="text-sm font-medium text-[#5d4c46]"
            >
              Message Or Special Notes (Max: 50 Characters)
            </label>
            <input
              id="message-note"
              type="text"
              maxLength={50}
              value={messageNote}
              onChange={(event) => setMessageNote(event.target.value)}
              placeholder="E.g. Happy Birthday!!!"
              className="mt-3 h-12 w-full border border-[#d8cdc7] bg-white px-4 text-sm text-[#3b2b2b] outline-none placeholder:text-[#9e8e87] focus:border-[#6b4c3f]"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-[120px_minmax(0,180px)] md:items-center">
            <p className="text-sm font-medium text-[#5d4c46]">Quantity</p>
            <div className="flex w-fit items-center border border-[#d8cdc7] bg-white">
              <button
                type="button"
                onClick={() => setLineQty((current) => Math.max(1, current - 1))}
                className="flex h-11 w-11 items-center justify-center border-r border-[#d8cdc7] text-lg text-[#3b2b2b]"
                aria-label={`Decrease quantity for ${product.name}`}
              >
                -
              </button>
              <span className="flex h-11 min-w-14 items-center justify-center text-sm font-medium text-[#3b2b2b]">
                {lineQty}
              </span>
              <button
                type="button"
                onClick={() => setLineQty((current) => current + 1)}
                className="flex h-11 w-11 items-center justify-center border-l border-[#d8cdc7] text-lg text-[#3b2b2b]"
                aria-label={`Increase quantity for ${product.name}`}
              >
                +
              </button>
            </div>
          </div>

          {cartQty > 0 ? (
            <p className="text-sm font-medium text-[#7b4a3c]">
              Already in cart: {cartQty}
            </p>
          ) : null}

          {addedFeedback ? (
            <div className="border border-[#d9c1b6] bg-[#fbf4f0] px-4 py-3 text-sm text-[#5d3c35]">
              {addedFeedback}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
            <button
              type="button"
              onClick={() => persistLine(lineQty)}
              className="h-12 bg-[#4a1f1f] px-6 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#3c1717]"
            >
              Add to Cart
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="h-12 border border-[#d8cdc7] bg-white px-6 text-sm font-semibold uppercase tracking-[0.08em] text-[#3b2b2b] transition hover:border-[#a78b80] hover:text-[#4a1f1f]"
            >
              Buy Now
            </button>
          </div>

          <div className="space-y-3 border-t border-[#e8ddd7] pt-5 text-[13px] leading-6 text-[#72645f]">
            <p>
              {limitedDelivery
                ? "Standard deliveries for cakes and cheesecakes are limited to Proddatur city limits only. Contact us for more information."
                : "Fresh bakes are prepared to order. Contact us if you need delivery support beyond the standard coverage area."}
            </p>
            <p className="font-medium text-[#4b403d]">
              Call / WhatsApp:{" "}
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="text-[#4a1f1f] underline underline-offset-4"
              >
                {PHONE_NUMBER_DISPLAY}
              </a>
            </p>
          </div>

          <details className="border-t border-[#e8ddd7] pt-5 text-sm text-[#5f544f]">
            <summary className="cursor-pointer list-none font-medium text-[#6a5a55]">
              <span className="inline-flex items-center gap-2">
                <span>ⓘ</span>
                <span>More Info</span>
              </span>
            </summary>
            <div className="mt-4 space-y-4 leading-7 text-[#5b4f4a]">
              <p>{product.description}</p>
              <p>
                Category: <strong>{product.category}</strong>
                {product.subCategory ? ` · ${product.subCategory}` : ""}
              </p>
              <p>
                Eggless: <strong>{product.eggless ? "Yes" : "No"}</strong>
              </p>
              <Link
                href="/menu"
                className="inline-flex text-sm font-medium text-[#4a1f1f] underline underline-offset-4"
              >
                Back to full menu
              </Link>
            </div>
          </details>
        </aside>
      </section>

      <ImageLightbox
        open={lightboxOpen}
        src={activeFrame.src}
        alt={activeFrame.alt}
        title={product.name}
        description={product.description}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
