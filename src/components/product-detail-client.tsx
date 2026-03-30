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
  formatInr,
  getDisplaySizeOptions,
  getProductHref,
  type Product,
} from "@/lib/products";
import { PHONE_NUMBER_DISPLAY, whatsappLink } from "@/lib/brand";

type Props = {
  product: Product;
};

export function ProductDetailClient({ product }: Props) {
  const sizeOptions = useMemo(() => getDisplaySizeOptions(product), [product]);
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] ?? "");
  const [messageNote, setMessageNote] = useState("");
  const [lineQty, setLineQty] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  const cartQty = getCart().find(
    (item) =>
      getCartItemKey(item.productId, item.sizeLabel) ===
      getCartItemKey(product.id, selectedSize || undefined)
  )?.qty ?? 0;

  const whatsappHref = whatsappLink(
    `Hi, I want to customize ${product.name}${selectedSize ? ` (${selectedSize})` : ""}.`
  );

  const persistLine = (qty: number) => {
    const safeQty = Math.max(1, qty);
    addItem(product.id, safeQty, selectedSize || undefined);
    if (messageNote.trim()) {
      setItemCustomizationNote(product.id, messageNote, selectedSize || undefined);
    }
    setAddedFeedback(
      `${safeQty} item${safeQty > 1 ? "s" : ""} added to cart${selectedSize ? ` · ${selectedSize}` : ""}.`
    );
  };

  const handleBuyNow = () => {
    persistLine(lineQty);
    window.location.assign("/cart");
  };

  const metaPairs = [
    { label: "Category", value: product.category },
    { label: "Collection", value: product.subCategory || "Signature selection" },
    { label: "Eggless", value: product.eggless ? "Yes" : "No" },
    { label: "Availability", value: product.available ? "Made to order" : "Unavailable" },
  ];

  return (
    <>
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-5">
          <div className="border border-black/10 bg-white">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block aspect-[4/4.2] w-full overflow-hidden bg-[color:var(--cream)]"
              aria-label={`Open full image of ${product.name}`}
            >
              <img
                src={product.imageSrc}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </button>
          </div>

          <div className="grid gap-px border border-black/10 bg-black/10 sm:grid-cols-3">
            <div className="bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                Format
              </p>
              <p className="mt-2 text-sm font-semibold text-black/82">
                Custom product page
              </p>
            </div>
            <div className="bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                Delivery
              </p>
              <p className="mt-2 text-sm font-semibold text-black/82">
                Proddatur and nearby areas
              </p>
            </div>
            <div className="bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                Support
              </p>
              <p className="mt-2 text-sm font-semibold text-black/82">{PHONE_NUMBER_DISPLAY}</p>
            </div>
          </div>

          <div className="border border-black/10 bg-white">
            <div className="border-b border-black/10 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
                Product Details
              </p>
            </div>
            <div className="grid gap-px bg-black/10 sm:grid-cols-2">
              {metaPairs.map((item) => (
                <div key={item.label} className="bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/42">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-black/82">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-black/10 bg-white">
            <div className="border-b border-black/10 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
                Description
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <p className="text-base font-medium leading-8 text-black/78">
                {product.description}
              </p>
              <p className="text-sm leading-7 text-black/60">
                Each product page now carries its own dedicated detail view, clearer ordering
                controls, and a cleaner mobile-first layout so customers can review size, notes,
                and quantity without hunting through the menu.
              </p>
            </div>
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28">
          <div className="border border-black/10 bg-white">
            <div className="border-b border-black/10 px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
                {product.category}
              </p>
              <h1 className="hero-display mt-2 text-4xl leading-none sm:text-5xl">
                {product.name}
              </h1>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--berry)]">
                {formatInr(product.priceInr)}
              </p>
            </div>

            <div className="space-y-5 px-5 py-5">
              {sizeOptions.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
                  <label
                    htmlFor="product-size"
                    className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45"
                  >
                    Sizes
                  </label>
                  <select
                    id="product-size"
                    value={selectedSize}
                    onChange={(event) => setSelectedSize(event.target.value)}
                    className="w-full border border-black/20 bg-[color:var(--cream)] px-4 py-3 text-sm font-semibold text-black/78 outline-none"
                  >
                    {sizeOptions.map((size) => (
                      <option key={`${product.id}-${size}`} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid gap-2">
                <label
                  htmlFor="message-note"
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45"
                >
                  Message Note
                </label>
                <textarea
                  id="message-note"
                  rows={4}
                  maxLength={240}
                  value={messageNote}
                  onChange={(event) => setMessageNote(event.target.value)}
                  placeholder="Example: Happy Birthday Siya, pastel finish, gold topper, less sweet."
                  className="w-full border border-black/20 bg-white px-4 py-4 text-sm leading-7 text-black/78 outline-none"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
                  Quantity
                </p>
                <div className="flex items-center justify-between border border-black/20 bg-[color:var(--cream)] px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setLineQty((current) => Math.max(1, current - 1))}
                    className="h-9 w-9 border border-black/15 bg-white text-lg font-semibold text-black/78"
                    aria-label={`Decrease quantity for ${product.name}`}
                  >
                    -
                  </button>
                  <span className="min-w-10 text-center text-base font-semibold text-black/82">
                    {lineQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLineQty((current) => current + 1)}
                    className="h-9 w-9 border border-black/15 bg-white text-lg font-semibold text-black/78"
                    aria-label={`Increase quantity for ${product.name}`}
                  >
                    +
                  </button>
                </div>
              </div>

              {cartQty > 0 ? (
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--berry)]">
                  In cart: {cartQty}
                </p>
              ) : null}

              {addedFeedback ? (
                <div className="border border-[color:var(--berry)]/25 bg-[color:var(--berry)]/6 px-4 py-3 text-sm font-medium text-[color:var(--berry-dark)]">
                  {addedFeedback}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    persistLine(lineQty);
                  }}
                  className="border border-black bg-[color:var(--berry)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="border border-black/20 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-black/82"
                >
                  Buy Now
                </button>
              </div>

              <div className="grid gap-px border border-black/10 bg-black/10 text-sm">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white px-4 py-3 font-semibold text-[color:var(--berry)]"
                >
                  Chat on WhatsApp for custom changes
                </a>
                <Link
                  href={getProductHref(product)}
                  className="bg-white px-4 py-3 font-semibold text-black/70"
                >
                  Copyable product page path: {getProductHref(product)}
                </Link>
              </div>
            </div>
          </div>

          <div className="border border-black/10 bg-white px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
              Ordering Notes
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-black/65">
              <li>Each product now has its own detail page for clear browsing and ordering.</li>
              <li>Size selection carries forward into the cart, checkout, and invoice.</li>
              <li>Image tap opens fullscreen, but ordering controls stay separate.</li>
            </ul>
          </div>
        </aside>
      </section>

      <ImageLightbox
        open={lightboxOpen}
        src={product.imageSrc}
        alt={product.name}
        title={product.name}
        description={product.description}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
