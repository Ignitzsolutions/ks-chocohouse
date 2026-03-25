"use client";

/* eslint-disable @next/next/no-img-element */

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ImageLightbox } from "@/components/image-lightbox";
import { MenuDesktopShell } from "@/components/menu-desktop-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { addItem, getCart, getCartItemKey, type CartItem, updateQty } from "@/lib/cart";
import {
  formatInr,
  getCategories,
  getDisplaySizeOptions,
  type Product,
  type ProductCategory,
} from "@/lib/products";
import { useProducts } from "@/lib/use-products";

function categoryId(category: string) {
  return `cat-${category.toLowerCase().replace(/\s+/g, "-")}`;
}

function toQtyMap(items: CartItem[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[getCartItemKey(item.productId, item.sizeLabel)] = item.qty;
    return acc;
  }, {});
}

function toCategoryIconMap(
  categories: ProductCategory[],
  allProducts: Product[]
) {
  const map = new Map<ProductCategory, string>();
  categories.forEach((category) => {
    const match = allProducts.find((item) => item.category === category)?.imageSrc;
    map.set(category, match ?? "/images/categories/cakes.svg");
  });
  return map;
}

function buildMenuUrl(category: string, subCategory?: string) {
  const params = new URLSearchParams();
  params.set("category", category);
  if (subCategory) params.set("subCategory", subCategory);
  return `/menu?${params.toString()}`;
}

function shouldUseDesktopCatalogScroll() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

function shouldReduceMotion() {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.dataset.motion === "reduced" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function MenuPage() {
  const fallbackCategories = getCategories();
  const { products: allProducts } = useProducts();
  const [categories, setCategories] = useState<ProductCategory[]>(fallbackCategories);

  const [activeCategory, setActiveCategory] = useState<ProductCategory>(
    fallbackCategories[0] ?? "Chocolates"
  );
  const [activeSubCategory, setActiveSubCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSizeByProduct, setSelectedSizeByProduct] = useState<Record<string, string>>({});
  const activeCategoryRef = useRef(activeCategory);
  const [cartQtyById, setCartQtyById] = useState<Record<string, number>>({});
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>(
    {}
  );
  const [visibleCards, setVisibleCards] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<{
    src: string;
    alt: string;
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          categories?: Array<{ category?: string; label?: string }>;
        };
        const names = (data.categories ?? [])
          .map((row) => String(row.category ?? row.label ?? "").trim())
          .filter(Boolean) as string[];
        if (!active || names.length === 0) return;
        setCategories(names);
      } catch {
        // keep fallback categories
      }
    };
    void loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const fromQuery = new URLSearchParams(window.location.search).get(
        "category"
      ) as ProductCategory | null;
      const subCategoryFromQuery =
        new URLSearchParams(window.location.search).get("subCategory") ?? "";
      if (fromQuery && categories.includes(fromQuery)) {
        const availableSubCategories = Array.from(
          new Set(
            allProducts
              .filter((item) => item.category === fromQuery)
              .map((item) => item.subCategory)
              .filter(Boolean)
          )
        );
        setActiveCategory(fromQuery);
        setActiveSubCategory(
          availableSubCategories.includes(subCategoryFromQuery)
            ? subCategoryFromQuery
            : ""
        );
      } else if (
        categories.length > 0 &&
        !categories.includes(activeCategoryRef.current)
      ) {
        setActiveCategory(categories[0]);
        setActiveSubCategory("");
      }
      setCartQtyById(toQtyMap(getCart()));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [allProducts, categories]);

  useEffect(() => {
    const desktopCatalogRoot = shouldUseDesktopCatalogScroll()
      ? document.querySelector<HTMLElement>(".menu-catalog-viewport")
      : null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          const revealId = target.dataset.revealId;
          const revealType = target.dataset.revealType;
          if (!revealId || !revealType) return;

          if (revealType === "section") {
            setVisibleSections((prev) => {
              if (prev[revealId]) return prev;
              return { ...prev, [revealId]: true };
            });
          } else if (revealType === "card") {
            setVisibleCards((prev) => {
              if (prev[revealId]) return prev;
              return { ...prev, [revealId]: true };
            });
          }

          observer.unobserve(target);
        });
      },
      { threshold: 0.14, root: desktopCatalogRoot, rootMargin: "0px 0px -8% 0px" }
    );

    const targets = document.querySelectorAll<HTMLElement>("[data-reveal-id]");
    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, [categories, allProducts.length]);

  const productsByCategory = useMemo(() => {
    const map = new Map<ProductCategory, typeof allProducts>();
    categories.forEach((category) => {
      map.set(
        category,
        allProducts.filter((item) => item.category === category)
      );
    });
    return map;
  }, [allProducts, categories]);

  const subCategoriesByCategory = useMemo(() => {
    const map = new Map<ProductCategory, string[]>();
    categories.forEach((category) => {
      const values = Array.from(
        new Set(
          allProducts
            .filter((item) => item.category === category)
            .map((item) => item.subCategory)
            .filter(Boolean)
        )
      );
      map.set(category, values);
    });
    return map;
  }, [allProducts, categories]);

  const categoryIconMap = useMemo(
    () => toCategoryIconMap(categories, allProducts),
    [categories, allProducts]
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const hasSearchQuery = normalizedSearchQuery.length > 0;

  const searchMatchedProductsByCategory = useMemo(() => {
    const map = new Map<ProductCategory, Product[]>();

    categories.forEach((category) => {
      const items = productsByCategory.get(category) ?? [];
      if (!hasSearchQuery) {
        map.set(category, items);
        return;
      }

      map.set(
        category,
        items.filter((item) => {
          const haystack = [
            item.name,
            item.description,
            item.category,
            item.subCategory,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedSearchQuery);
        })
      );
    });

    return map;
  }, [categories, hasSearchQuery, normalizedSearchQuery, productsByCategory]);

  const totalSearchMatches = useMemo(
    () =>
      categories.reduce(
        (sum, category) => sum + (searchMatchedProductsByCategory.get(category)?.length ?? 0),
        0
      ),
    [categories, searchMatchedProductsByCategory]
  );
  const allSearchMatches = useMemo(
    () =>
      categories.flatMap((category) =>
        (searchMatchedProductsByCategory.get(category) ?? []).map((item) => ({
          ...item,
          matchedCategory: category,
        }))
      ),
    [categories, searchMatchedProductsByCategory]
  );

  useEffect(() => {
    if (!hasSearchQuery) return;
    const desktopCatalogRoot = shouldUseDesktopCatalogScroll()
      ? document.querySelector<HTMLElement>(".menu-catalog-viewport")
      : null;
    if (desktopCatalogRoot) {
      desktopCatalogRoot.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [hasSearchQuery, deferredSearchQuery]);

  const jumpToCategory = (category: ProductCategory, subCategory = "") => {
    setActiveCategory(category);
    const availableSubCategories = subCategoriesByCategory.get(category) ?? [];
    const nextSubCategory =
      subCategory && availableSubCategories.includes(subCategory) ? subCategory : "";
    setActiveSubCategory(nextSubCategory);
    window.history.replaceState(null, "", buildMenuUrl(category, nextSubCategory));
    const node = document.getElementById(categoryId(category));
    if (!node) return;

    const behavior = shouldReduceMotion() ? "auto" : "smooth";
    const desktopCatalogRoot = shouldUseDesktopCatalogScroll()
      ? document.querySelector<HTMLElement>(".menu-catalog-viewport")
      : null;

    if (desktopCatalogRoot) {
      const top =
        node.getBoundingClientRect().top -
        desktopCatalogRoot.getBoundingClientRect().top +
        desktopCatalogRoot.scrollTop -
        12;
      desktopCatalogRoot.scrollTo({ top: Math.max(0, top), behavior });
      return;
    }

    node.scrollIntoView({ behavior, block: "start" });
  };

  const handleIncreaseQty = (productId: string, sizeLabel?: string) => {
    const updatedCart = addItem(productId, 1, sizeLabel);
    setCartQtyById(toQtyMap(updatedCart));
  };

  const handleDecreaseQty = (productId: string, sizeLabel?: string) => {
    const currentQty = cartQtyById[getCartItemKey(productId, sizeLabel)] ?? 0;
    const updatedCart = updateQty(productId, Math.max(0, currentQty - 1), sizeLabel);
    setCartQtyById(toQtyMap(updatedCart));
  };

  const handleBuyNow = (
    productId: string,
    sizeLabel?: string,
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    event?.preventDefault();
    event?.stopPropagation();
    const updatedCart = addItem(productId, 1, sizeLabel);
    setCartQtyById(toQtyMap(updatedCart));
    window.location.assign("/cart");
  };

  const openProductPreview = (item: Product) => {
    setLightbox({
      src: item.imageSrc,
      alt: item.name,
      title: item.name,
      description: item.description,
    });
  };

  const swallowPointerEvent = (
    event:
      | React.MouseEvent<HTMLElement>
      | React.PointerEvent<HTMLElement>
      | React.TouchEvent<HTMLElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const renderProductCard = (
    item: Product,
    index: number,
    extraLabel?: string
  ) => {
    const sizeOptions = getDisplaySizeOptions(item);
    const selectedSize =
      (sizeOptions.length > 0
        ? selectedSizeByProduct[item.id] ?? sizeOptions[0]
        : "") || "";
    const cartKey = getCartItemKey(item.id, selectedSize);

    return (
      <article
        key={item.id}
        data-reveal-id={item.id}
        data-reveal-type="card"
        className={`premium-panel flex h-full flex-col rounded-3xl p-4 transition-all duration-700 motion-reduce:transition-none ${
          visibleCards[item.id] ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
        style={{
          transitionDelay: visibleCards[item.id] ? `${(index % 3) * 70}ms` : "0ms",
        }}
      >
        <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream)]">
          <button
            type="button"
            onClick={() => openProductPreview(item)}
            className="h-full w-full"
            aria-label={`Expand image for ${item.name}`}
          >
            <img src={item.imageSrc} alt={item.name} className="h-full w-full object-cover" />
          </button>
        </div>

        <div className="mt-3 flex flex-1 flex-col space-y-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold leading-snug">{item.name}</h3>
            <span className="rounded-full bg-[color:var(--caramel)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
              Eggless
            </span>
          </div>

          <p className="text-sm leading-6 text-black/62 sm:min-h-12">{item.description}</p>

          {extraLabel ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
              {extraLabel}
            </p>
          ) : null}

          {sizeOptions.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 rounded-2xl border border-black/8 bg-white px-3 py-3 sm:grid-cols-[84px_minmax(0,1fr)] sm:items-center sm:gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/45">
                Sizes
              </p>
              <div
                className="relative"
                onClick={swallowPointerEvent}
                onPointerDown={swallowPointerEvent}
                onTouchStart={swallowPointerEvent}
              >
                <select
                  value={selectedSize}
                  onChange={(event) =>
                    setSelectedSizeByProduct((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                  onClick={swallowPointerEvent}
                  onPointerDown={swallowPointerEvent}
                  onTouchStart={swallowPointerEvent}
                  className="w-full appearance-none rounded-xl border border-dashed border-black/25 bg-[color:var(--cream)] px-4 py-3 pr-10 text-sm font-medium text-black/72 outline-none transition focus:border-[color:var(--berry)] focus:bg-white"
                  aria-label={`Select weight for ${item.name}`}
                >
                  {sizeOptions.map((size) => (
                    <option key={`${item.id}-${size}`} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-black/35">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="text-sm font-semibold text-[color:var(--berry)]">
              {formatInr(item.priceInr)}
            </p>
            <button
              type="button"
              onClick={() => openProductPreview(item)}
              className="text-left text-xs font-semibold tracking-[0.04em] text-[color:var(--berry)] underline-offset-4 hover:underline"
            >
              View photos and details
            </button>
          </div>

          <div className="mt-auto flex flex-col gap-2 sm:flex-row">
            <div
              className="flex items-center justify-between rounded-full border border-black/10 bg-[color:var(--cream)] px-2 py-1 sm:flex-1"
              onClick={swallowPointerEvent}
              onPointerDown={swallowPointerEvent}
              onTouchStart={swallowPointerEvent}
            >
              <button
                onClick={(event) => {
                  swallowPointerEvent(event);
                  handleDecreaseQty(item.id, selectedSize || undefined);
                }}
                onPointerDown={swallowPointerEvent}
                onTouchStart={swallowPointerEvent}
                disabled={(cartQtyById[cartKey] ?? 0) === 0}
                className="h-7 w-7 rounded-full border border-[color:var(--line)] bg-white text-xs font-semibold disabled:opacity-40"
                aria-label={`Decrease ${item.name}`}
              >
                -
              </button>
              <span className="min-w-7 text-center text-xs font-semibold">
                {cartQtyById[cartKey] ?? 0}
              </span>
              <button
                onClick={(event) => {
                  swallowPointerEvent(event);
                  handleIncreaseQty(item.id, selectedSize || undefined);
                }}
                onPointerDown={swallowPointerEvent}
                onTouchStart={swallowPointerEvent}
                className="h-7 w-7 rounded-full border border-[color:var(--line)] bg-white text-xs font-semibold"
                aria-label={`Increase ${item.name}`}
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={(event) => handleBuyNow(item.id, selectedSize || undefined, event)}
              onPointerDown={swallowPointerEvent}
              onTouchStart={swallowPointerEvent}
              className="w-full rounded-full bg-gradient-to-b from-[color:var(--berry)] to-[color:var(--berry-dark)] px-3 py-2 text-center text-xs font-semibold text-white sm:flex-1"
            >
              Buy Now
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="premium-panel rounded-3xl p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/45">Menu</p>
          <h1 className="hero-display mt-2 text-5xl">All Eggless Products</h1>
          <p className="mt-2 text-black/60">
            Select a category from the sidebar and explore available items.
          </p>
        </div>

        <div className="mt-6 flex gap-3 overflow-x-auto pb-2 md:hidden">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => jumpToCategory(category)}
              className={`flex min-w-[84px] flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-[11px] font-semibold ${
                activeCategory === category
                  ? "border-[color:var(--berry)] bg-[color:var(--berry)]/10 text-[color:var(--berry)]"
                  : "border-[color:var(--line)] bg-white text-black/60"
              }`}
            >
              <img
                src={categoryIconMap.get(category)}
                alt={category}
                className="h-10 w-10 rounded-full border border-[color:var(--line)] object-cover"
              />
              <span className="line-clamp-2 text-center leading-tight">{category}</span>
            </button>
          ))}
        </div>

        <div className="premium-panel mt-6 rounded-3xl p-4 md:p-5">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
            Search Products
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[color:var(--line)] bg-white px-3 py-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-black/45"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by product name, flavor, or category"
              className="w-full bg-transparent text-sm text-black/80 outline-none placeholder:text-black/40"
              aria-label="Search products"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-full border border-[color:var(--line)] px-2 py-1 text-[11px] font-semibold text-black/55"
              >
                Clear
              </button>
            ) : null}
          </div>
          {hasSearchQuery ? (
            <p className="mt-2 text-xs text-black/55">
              {totalSearchMatches > 0
                ? `${totalSearchMatches} match${totalSearchMatches > 1 ? "es" : ""} found for "${deferredSearchQuery}".`
                : `No matches found for "${deferredSearchQuery}".`}
            </p>
          ) : (
            <p className="mt-2 text-xs text-black/50">
              Tip: use search to quickly find specific cakes, chocolates, or flavors.
            </p>
          )}
        </div>

        <MenuDesktopShell
          categories={categories}
          activeCategory={activeCategory}
          onCategorySelect={(category) => {
            const availableSubCategories = subCategoriesByCategory.get(category) ?? [];
            const nextSubCategory = availableSubCategories.includes(activeSubCategory)
              ? activeSubCategory
              : "";
            setActiveCategory(category);
            setActiveSubCategory(nextSubCategory);
            window.history.replaceState(null, "", buildMenuUrl(category, nextSubCategory));
          }}
          className="md:h-[75vh] md:grid-cols-[280px_minmax(0,1fr)] md:overflow-hidden"
          railColumnClassName="min-h-0"
          railViewportClassName="min-h-0"
          catalogViewportClassName="menu-catalog-viewport min-h-0 pb-2"
          rail={(api) => (
            <div className="premium-panel flex h-full flex-col rounded-3xl p-4">
              <p className="px-3 pb-2 text-xs uppercase tracking-[0.2em] text-black/50">
                Categories
              </p>
              <div className="min-h-0 space-y-1 overflow-y-auto pr-1">
                {categories.map((category) => (
                  (() => {
                    const isFocusedCategory = api.activeCategory === category;
                    const isSelectedCategory = activeCategory === category;

                    return (
                  <div
                    key={category}
                    className={`rounded-2xl ${
                      isFocusedCategory ? "bg-[color:var(--berry)]/10" : ""
                    }`}
                  >
                    <button
                      onClick={() => api.selectCategory(category)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${
                        isFocusedCategory
                          ? "text-[color:var(--berry)]"
                          : "text-black/70 hover:bg-[color:var(--cream)]"
                      }`}
                    >
                      <img
                        src={categoryIconMap.get(category)}
                        alt={category}
                        className="h-7 w-7 rounded-full border border-[color:var(--line)] object-cover"
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-semibold">{category}</span>
                        {isSelectedCategory ? (
                          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-current/75">
                            Subcategory: {activeSubCategory || "All"}
                          </span>
                        ) : null}
                      </span>
                    </button>

                    {isSelectedCategory ? (
                      <div className="px-3 pb-3">
                        <div className="ml-10 flex flex-col gap-1 rounded-2xl border border-[color:var(--line)] bg-white/80 p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCategory(category);
                              setActiveSubCategory("");
                              window.history.replaceState(null, "", buildMenuUrl(category));
                              api.scrollToCategory(
                                category,
                                shouldReduceMotion() ? "auto" : "smooth"
                              );
                            }}
                            className={`rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                              !activeSubCategory
                                ? "bg-[color:var(--berry)] text-white"
                                : "text-black/65 hover:bg-[color:var(--cream)]"
                            }`}
                          >
                            All
                          </button>
                          {(subCategoriesByCategory.get(category) ?? []).map((subCategory) => (
                            <button
                              key={subCategory}
                              type="button"
                              onClick={() => {
                                setActiveCategory(category);
                                setActiveSubCategory(subCategory);
                                window.history.replaceState(
                                  null,
                                  "",
                                  buildMenuUrl(category, subCategory)
                                );
                                api.scrollToCategory(
                                  category,
                                  shouldReduceMotion() ? "auto" : "smooth"
                                );
                              }}
                              className={`rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                                activeSubCategory === subCategory
                                  ? "bg-[color:var(--berry)] text-white"
                                  : "text-black/65 hover:bg-[color:var(--cream)]"
                              }`}
                            >
                              {subCategory}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                    );
                  })()
                ))}
              </div>
            </div>
          )}
          catalog={(api) => (
            <>
              {hasSearchQuery ? (
                <section
                  key="search-results"
                  data-reveal-id="section-search-results"
                  data-reveal-type="section"
                  className="space-y-4 rounded-3xl border border-[color:var(--line)] bg-white/70 p-4 transition-all duration-700 motion-reduce:transition-none md:p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="hero-display text-4xl leading-none">Search Results</h2>
                      <p className="mt-2 text-sm text-black/58">
                        Showing matches for &quot;{deferredSearchQuery}&quot; across all categories.
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-black/50">
                      {totalSearchMatches} item{totalSearchMatches === 1 ? "" : "s"}
                    </p>
                  </div>

                  {allSearchMatches.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white/80 px-4 py-5 text-sm text-black/55">
                      No products match this search yet. Try a different flavor, category, or cake name.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {allSearchMatches.map((item, index) =>
                        renderProductCard(item, index, item.matchedCategory)
                      )}
                    </div>
                  )}
                </section>
              ) : null}

              {hasSearchQuery
                ? null
                : categories.map((category) => {
                const items = productsByCategory.get(category) ?? [];
                const searchedItems = searchMatchedProductsByCategory.get(category) ?? [];
                const subCategories = subCategoriesByCategory.get(category) ?? [];
                const filteredItems =
                  activeCategory === category && activeSubCategory
                    ? searchedItems.filter((item) => item.subCategory === activeSubCategory)
                    : searchedItems;
                const showSection = !hasSearchQuery || searchedItems.length > 0;
                const sectionRevealId = `section-${categoryId(category)}`;
                const sectionItemCount = hasSearchQuery ? filteredItems.length : items.length;
                if (!showSection) return null;

                return (
                  <section
                    key={category}
                    ref={api.setSectionRef(category)}
                    id={categoryId(category)}
                    data-reveal-id={sectionRevealId}
                    data-reveal-type="section"
                    className={`space-y-4 rounded-3xl border border-[color:var(--line)] bg-white/70 p-4 transition-all duration-700 motion-reduce:transition-none md:p-5 ${
                      visibleSections[sectionRevealId]
                        ? "translate-y-0 opacity-100"
                        : "translate-y-5 opacity-0"
                    }`}
                  >
                    <div className="flex items-end justify-between gap-3">
                      <h2 className="hero-display text-4xl leading-none">{category}</h2>
                      <p className="text-xs uppercase tracking-[0.2em] text-black/50">
                        {sectionItemCount} item{sectionItemCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {activeCategory === category && subCategories.length > 1 ? (
                        <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-3">
                          <button
                            type="button"
                            onClick={() => jumpToCategory(category, "")}
                            className={`rounded-full px-4 py-2 text-xs font-semibold ${
                              !activeSubCategory
                                ? "bg-[color:var(--berry)] text-white"
                                : "border border-black/10 bg-white text-black/65"
                            }`}
                          >
                            All
                          </button>
                          {subCategories.map((subCategory) => (
                            <button
                              key={subCategory}
                              type="button"
                              onClick={() => jumpToCategory(category, subCategory)}
                              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                                activeSubCategory === subCategory
                                  ? "bg-[color:var(--berry)] text-white"
                                  : "border border-black/10 bg-white text-black/65"
                              }`}
                            >
                              {subCategory}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {filteredItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white/80 px-4 py-5 text-sm text-black/55 sm:col-span-2 xl:col-span-3">
                          No products match this filter.
                        </div>
                      ) : null}
                      {filteredItems.map((item, index) => renderProductCard(item, index))}
                    </div>
                  </section>
                );
              })}
            </>
          )}
        />
      </main>
      <SiteFooter />
      <ImageLightbox
        open={Boolean(lightbox)}
        src={lightbox?.src ?? ""}
        alt={lightbox?.alt ?? ""}
        title={lightbox?.title ?? ""}
        description={lightbox?.description ?? ""}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
