"use client";

/* eslint-disable @next/next/no-img-element */

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MenuDesktopShell } from "@/components/menu-desktop-shell";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { addItem, getCart, getCartItemKey, type CartItem, updateQty } from "@/lib/cart";
import {
  getCategories,
  getPriceDisplayMeta,
  getProductOptionLabel,
  getDisplaySizeOptions,
  getProductHref,
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
    map.set(category, "/images/categories/cakes.svg");
  });
  allProducts.forEach((item) => {
    if (map.get(item.category) === "/images/categories/cakes.svg") {
      map.set(item.category, item.imageSrc);
    }
  });
  return map;
}

function buildCategoryViews(categories: ProductCategory[], products: Product[]) {
  const categorySet = new Set(categories);
  const productsByCategory = new Map<ProductCategory, Product[]>();
  const subCategoriesByCategory = new Map<ProductCategory, string[]>();
  const seenSubCategories = new Map<ProductCategory, Set<string>>();

  categories.forEach((category) => {
    productsByCategory.set(category, []);
    subCategoriesByCategory.set(category, []);
    seenSubCategories.set(category, new Set());
  });

  products.forEach((item) => {
    if (!categorySet.has(item.category)) return;

    productsByCategory.get(item.category)?.push(item);

    const subCategory = item.subCategory.trim();
    if (!subCategory) return;

    const seen = seenSubCategories.get(item.category);
    if (!seen || seen.has(subCategory)) return;

    seen.add(subCategory);
    subCategoriesByCategory.get(item.category)?.push(subCategory);
  });

  return { productsByCategory, subCategoriesByCategory };
}

function getProductInteractionLabel(product: Product) {
  if (/cupcake/i.test(product.category) || /chocolate/i.test(product.category)) {
    return "Count";
  }
  return getProductOptionLabel(product);
}

function buildMenuUrl(category: string, subCategory?: string) {
  const params = new URLSearchParams();
  params.set("category", category);
  if (subCategory) params.set("subCategory", subCategory);
  return `/menu?${params.toString()}`;
}

const MENU_STATE_KEY = "ksch-menu-state";

type PersistedMenuState = {
  category: string;
  subCategory: string;
  scrollTop: number;
};

function readMenuState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(MENU_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedMenuState;
  } catch {
    return null;
  }
}

function writeMenuState(state: PersistedMenuState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(MENU_STATE_KEY, JSON.stringify(state));
}

export default function MenuPage() {
  const router = useRouter();
  const fallbackCategories = getCategories();
  const { products: allProducts } = useProducts();
  const [categories, setCategories] = useState<ProductCategory[]>(fallbackCategories);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const restoredScrollRef = useRef(false);

  const [activeCategory, setActiveCategory] = useState<ProductCategory>(
    fallbackCategories[0] ?? "Chocolates"
  );
  const [activeSubCategory, setActiveSubCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSizeByProduct, setSelectedSizeByProduct] = useState<Record<string, string>>({});
  const [cartQtyById, setCartQtyById] = useState<Record<string, number>>({});

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
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);
    window.addEventListener("resize", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const persisted = readMenuState();
      const requestedCategory =
        (params.get("category") as ProductCategory | null) ||
        (persisted?.category as ProductCategory | undefined) ||
        null;
      const requestedSubCategory =
        params.get("subCategory") ?? persisted?.subCategory ?? "";
      if (requestedCategory && categories.includes(requestedCategory)) {
        const availableSubCategories = Array.from(
          new Set(
            allProducts
              .filter((item) => item.category === requestedCategory)
              .map((item) => item.subCategory)
              .filter(Boolean)
          )
        );
        setActiveCategory(requestedCategory);
        setActiveSubCategory(
          availableSubCategories.includes(requestedSubCategory)
            ? requestedSubCategory
            : ""
        );
      } else if (
        categories.length > 0 &&
        !categories.includes(activeCategory)
      ) {
        setActiveCategory(categories[0]);
        setActiveSubCategory("");
      }
      setCartQtyById(toQtyMap(getCart()));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeCategory, allProducts, categories]);

  useEffect(() => {
    writeMenuState({
      category: activeCategory,
      subCategory: activeSubCategory,
      scrollTop:
        document.querySelector<HTMLElement>(".menu-catalog-viewport")?.scrollTop ??
        window.scrollY,
    });
  }, [activeCategory, activeSubCategory]);

  useEffect(() => {
    const target =
      document.querySelector<HTMLElement>(".menu-catalog-viewport") ?? window;

    const saveScrollPosition = () => {
      const scrollTop =
        target instanceof Window ? target.scrollY : target.scrollTop;
      writeMenuState({
        category: activeCategory,
        subCategory: activeSubCategory,
        scrollTop,
      });
    };

    saveScrollPosition();
    target.addEventListener("scroll", saveScrollPosition, { passive: true });
    return () => target.removeEventListener("scroll", saveScrollPosition);
  }, [activeCategory, activeSubCategory, isMobileViewport]);

  useEffect(() => {
    if (restoredScrollRef.current) return;
    const persisted = readMenuState();
    if (!persisted) return;
    if (persisted.category !== activeCategory || persisted.subCategory !== activeSubCategory) return;

    const frame = window.requestAnimationFrame(() => {
      const desktopCatalogRoot = document.querySelector<HTMLElement>(".menu-catalog-viewport");
      if (desktopCatalogRoot) {
        desktopCatalogRoot.scrollTo({ top: Math.max(0, persisted.scrollTop), behavior: "auto" });
      } else {
        window.scrollTo({ top: Math.max(0, persisted.scrollTop), behavior: "auto" });
      }
      restoredScrollRef.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeCategory, activeSubCategory]);

  const { productsByCategory, subCategoriesByCategory } = useMemo(
    () => buildCategoryViews(categories, allProducts),
    [allProducts, categories]
  );

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
  const visibleCategories = useMemo(
    () => (hasSearchQuery || !isMobileViewport ? categories : [activeCategory]),
    [activeCategory, categories, hasSearchQuery, isMobileViewport]
  );

  useEffect(() => {
    if (!hasSearchQuery) return;
    const desktopCatalogRoot = document.querySelector<HTMLElement>(".menu-catalog-viewport");
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

    const behavior: ScrollBehavior = "auto";
    const desktopCatalogRoot = document.querySelector<HTMLElement>(".menu-catalog-viewport");

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

  const openProductPage = (item: Product) => {
    writeMenuState({
      category: activeCategory,
      subCategory: activeSubCategory,
      scrollTop:
        document.querySelector<HTMLElement>(".menu-catalog-viewport")?.scrollTop ??
        window.scrollY,
    });
    router.push(getProductHref(item));
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

  const stopEventPropagation = (
    event:
      | React.MouseEvent<HTMLElement>
      | React.PointerEvent<HTMLElement>
      | React.TouchEvent<HTMLElement>
  ) => {
    event.stopPropagation();
  };

  const renderProductCard = (
    item: Product,
    _index: number,
    extraLabel?: string
  ) => {
    const sizeOptions = getDisplaySizeOptions(item);
    const optionLabel = getProductInteractionLabel(item);
    const selectedSize =
      (sizeOptions.length > 0
        ? selectedSizeByProduct[item.id] ?? sizeOptions[0]
        : "") || "";
    const cartKey = getCartItemKey(item.id, selectedSize);
    const priceMeta = getPriceDisplayMeta(item, selectedSize || undefined);

    return (
      <article
        key={item.id}
        role="link"
        tabIndex={0}
        aria-label={`Open product page for ${item.name}`}
        onClick={() => openProductPage(item)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProductPage(item);
          }
        }}
        className="flex h-full cursor-pointer flex-col overflow-hidden border border-[#e3d8d2] bg-white"
      >
        <div className="group relative aspect-[4/3] overflow-hidden bg-[color:var(--cream)]">
          <img
            src={item.imageSrc}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
        </div>

        <div className="flex flex-1 flex-col space-y-3 p-4 text-left sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-[22px] font-semibold leading-snug text-[#2f2321]">
                {item.name}
              </h3>
              <span className="mt-2 block h-px w-16 bg-[#4a1f1f]/60" />
            </div>
            <span className="shrink-0 border border-[#e3d8d2] bg-[#fff7ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f4a42]">
              Eggless
            </span>
          </div>

          <p className="break-words text-sm leading-6 text-[#5d4e49] sm:min-h-12">
            {item.description}
          </p>

          {extraLabel ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
              {extraLabel}
            </p>
          ) : null}

          {sizeOptions.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 border-t border-[#eee2db] pt-3 sm:grid-cols-[84px_minmax(0,1fr)] sm:items-center sm:gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#66544f]">
                {optionLabel}
              </p>
              <div
                className="relative"
                onClick={stopEventPropagation}
                onPointerDown={stopEventPropagation}
                onTouchStart={stopEventPropagation}
              >
                <select
                  value={selectedSize}
                  onChange={(event) =>
                    setSelectedSizeByProduct((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                  onClick={stopEventPropagation}
                  onPointerDown={stopEventPropagation}
                  onTouchStart={stopEventPropagation}
                  className="w-full appearance-none border border-dashed border-[#7a4b42] bg-[#faf7f4] px-4 py-3 pr-10 text-sm font-semibold text-[#2f2523] outline-none transition focus:border-[#4a1f1f] focus:bg-white"
                  aria-label={`Select ${optionLabel.toLowerCase()} for ${item.name}`}
                >
                  {sizeOptions.map((size) => (
                    <option key={`${item.id}-${size}`} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#7d6d68]">
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
            <p className="text-base font-semibold text-[#4a1f1f]">
              {priceMeta.finalPriceLabel}
            </p>
            {priceMeta.pricePerKgLabel ? (
              <p className="text-xs font-medium text-[#6d5952]">{priceMeta.pricePerKgLabel}</p>
            ) : null}
          </div>

          <div className="mt-auto flex flex-col gap-2 sm:flex-row">
            <div
              className="flex items-center justify-between border-t border-[#eee2db] bg-white px-2 py-1 sm:flex-1"
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
                className="h-7 w-7 border border-[#d8cdc7] bg-white text-xs font-semibold text-[#2f2523] disabled:opacity-40"
                aria-label={`Decrease ${item.name}`}
              >
                -
              </button>
              <span className="min-w-7 text-center text-xs font-semibold text-[#2f2523]">
                {cartQtyById[cartKey] ?? 0}
              </span>
              <button
                onClick={(event) => {
                  swallowPointerEvent(event);
                  handleIncreaseQty(item.id, selectedSize || undefined);
                }}
                onPointerDown={swallowPointerEvent}
                onTouchStart={swallowPointerEvent}
                className="h-7 w-7 border border-[#d8cdc7] bg-white text-xs font-semibold text-[#2f2523]"
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
              className="w-full bg-[#4a1f1f] px-3 py-2 text-center text-xs font-semibold text-white sm:flex-1"
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
      <main className="mx-auto max-w-[1520px] px-4 py-10 sm:px-6 lg:px-8">
        <section className="pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#5f4a42]">
                Menu
              </p>
              <h1 className="hero-display mt-2 text-5xl leading-[0.94] text-[#2f2321] sm:text-6xl">
                All Eggless Products
              </h1>
              <p className="mt-3 text-base font-medium leading-7 text-[#5d4e49]">
                Browse the full catalog by category, then open any product for size, flavour,
                and ordering details.
              </p>
            </div>

            <div className="w-full max-w-[620px] lg:ml-auto">
              <label className="block text-xs font-bold uppercase tracking-[0.18em] text-[#5a3a35]">
                Search Products
              </label>
              <div className="mt-3 flex items-center gap-3 border-2 border-[#4a1f1f] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(74,31,31,0.08)]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[#4a1f1f]"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
                  <path
                    d="M20 20L16.65 16.65"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search cakes, chocolates, flavours, or categories"
                  className="w-full bg-transparent text-sm font-semibold text-[#2f2523] outline-none placeholder:font-semibold placeholder:text-[#8b746d]"
                  aria-label="Search products"
                  autoComplete="off"
                  spellCheck={false}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="border border-[#d8cdc7] bg-[#faf4f1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a3a35]"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <p className="mt-3 text-xs font-semibold leading-6 text-[#6d5953]">
                Search by product name, category, description, or flavour.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 flex gap-3 overflow-x-auto pb-2 md:hidden">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => jumpToCategory(category)}
              className={`flex min-w-[84px] flex-col items-center gap-2 border px-2 py-3 text-[11px] font-semibold ${
                activeCategory === category
                  ? "border-[#4a1f1f] bg-[#fff5f2] text-[#4a1f1f]"
                  : "border-[#e1d5cf] bg-white text-[#584643]"
              }`}
            >
              <img
                src={categoryIconMap.get(category)}
                alt={category}
                className="h-10 w-10 object-cover"
                decoding="async"
              />
              <span className="line-clamp-2 text-center leading-tight">{category}</span>
            </button>
          ))}
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
          className="md:h-[75vh] md:grid-cols-[260px_minmax(0,1fr)] md:overflow-hidden"
          railColumnClassName="min-h-0"
          railViewportClassName="min-h-0"
          catalogViewportClassName="menu-catalog-viewport min-h-0 pb-2 lg:pr-1"
          rail={(api) => (
            <div className="flex h-full flex-col bg-white p-4">
              <p className="px-3 pb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#5f4a42]">
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
                    className={isFocusedCategory ? "bg-[#fff5f2]" : ""}
                  >
                    <button
                      onClick={() => api.selectCategory(category)}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left ${
                        isFocusedCategory
                          ? "text-[#4a1f1f]"
                          : "text-[#453633] hover:bg-[#faf5f1]"
                      }`}
                    >
                      <img
                        src={categoryIconMap.get(category)}
                        alt={category}
                        className="h-8 w-8 object-cover"
                        decoding="async"
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
                        <div className="ml-11 flex flex-col gap-1 border-l border-[#e6ddd7] pl-3">
                          <button
                            type="button"
                            onClick={() => {
                                setActiveCategory(category);
                                setActiveSubCategory("");
                                window.history.replaceState(null, "", buildMenuUrl(category));
                              api.scrollToCategory(category, "auto");
                            }}
                            className={`px-3 py-2 text-left text-xs font-semibold ${
                              !activeSubCategory
                                ? "bg-[#4a1f1f] text-white"
                                : "text-[#685650] hover:bg-[#faf5f1]"
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
                                api.scrollToCategory(category, "auto");
                              }}
                              className={`px-3 py-2 text-left text-xs font-semibold ${
                                activeSubCategory === subCategory
                                  ? "bg-[#4a1f1f] text-white"
                                  : "text-[#685650] hover:bg-[#faf5f1]"
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
                  className="space-y-4 border-t border-black/10 pt-6"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="hero-display text-4xl leading-none text-[#2f2321]">
                        Search Results
                      </h2>
                      <p className="mt-2 text-sm font-medium text-[#5d4e49]">
                        Showing matches for &quot;{deferredSearchQuery}&quot; across all categories.
                      </p>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5f4a42]">
                      {totalSearchMatches} item{totalSearchMatches === 1 ? "" : "s"}
                    </p>
                  </div>

                  {allSearchMatches.length === 0 ? (
                    <div className="bg-[#fbf6f2] px-4 py-5 text-sm font-medium text-[#66544f]">
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
                : visibleCategories.map((category) => {
                const items = productsByCategory.get(category) ?? [];
                const searchedItems = searchMatchedProductsByCategory.get(category) ?? [];
                const subCategories = subCategoriesByCategory.get(category) ?? [];
                const filteredItems =
                  activeCategory === category && activeSubCategory
                    ? searchedItems.filter((item) => item.subCategory === activeSubCategory)
                    : searchedItems;
                const showSection = !hasSearchQuery || searchedItems.length > 0;
                const sectionItemCount = hasSearchQuery ? filteredItems.length : items.length;
                if (!showSection) return null;

                return (
                    <section
                  key={category}
                  ref={api.setSectionRef(category)}
                  id={categoryId(category)}
                  className="scroll-mt-24 space-y-4 border-t border-black/10 pt-6 md:scroll-mt-0"
                >
                    <div className="flex items-end justify-between gap-3">
                      <h2 className="hero-display text-4xl leading-none text-[#2f2321]">{category}</h2>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5f4a42]">
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
                                ? "bg-[#4a1f1f] text-white"
                                : "border border-[#d9ccc5] bg-white text-[#685650]"
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
                                  ? "bg-[#4a1f1f] text-white"
                                  : "border border-[#d9ccc5] bg-white text-[#685650]"
                              }`}
                            >
                              {subCategory}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {filteredItems.length === 0 ? (
                        <div className="bg-[#fbf6f2] px-4 py-5 text-sm font-medium text-[#66544f] sm:col-span-2 xl:col-span-3">
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
    </div>
  );
}
