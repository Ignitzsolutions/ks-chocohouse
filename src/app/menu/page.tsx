"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageLightbox } from "@/components/image-lightbox";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { addItem, getCart, type CartItem, updateQty } from "@/lib/cart";
import {
  formatInr,
  getCategories,
  type Product,
  type ProductCategory,
} from "@/lib/products";
import { useProducts } from "@/lib/use-products";

function categoryId(category: string) {
  return `cat-${category.toLowerCase().replace(/\s+/g, "-")}`;
}

function toQtyMap(items: CartItem[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.productId] = item.qty;
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

export default function MenuPage() {
  const router = useRouter();
  const fallbackCategories = getCategories();
  const { products: allProducts } = useProducts();
  const [categories, setCategories] = useState<ProductCategory[]>(fallbackCategories);

  const [activeCategory, setActiveCategory] = useState<ProductCategory>(
    fallbackCategories[0] ?? "Chocolates"
  );
  const [activeSubCategory, setActiveSubCategory] = useState("");
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
    const frame = window.requestAnimationFrame(() => {
      const fromQuery = new URLSearchParams(window.location.search).get(
        "category"
      ) as ProductCategory | null;
      const subCategoryFromQuery =
        new URLSearchParams(window.location.search).get("subCategory") ?? "";
      if (fromQuery && categories.includes(fromQuery)) {
        setActiveCategory(fromQuery);
        setActiveSubCategory(subCategoryFromQuery);
      } else if (categories.length > 0 && !categories.includes(activeCategory)) {
        setActiveCategory(categories[0]);
        setActiveSubCategory("");
      }
      setCartQtyById(toQtyMap(getCart()));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [categories, activeCategory]);

  useEffect(() => {
    if (activeCategory && categories.includes(activeCategory)) {
      const id = categoryId(activeCategory);
      const node = document.getElementById(id);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [activeCategory, categories]);

  useEffect(() => {
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
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
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

  const jumpToCategory = (category: ProductCategory, subCategory = "") => {
    setActiveCategory(category);
    const availableSubCategories = subCategoriesByCategory.get(category) ?? [];
    const nextSubCategory =
      subCategory && availableSubCategories.includes(subCategory) ? subCategory : "";
    setActiveSubCategory(nextSubCategory);
    window.history.replaceState(null, "", buildMenuUrl(category, nextSubCategory));
    const node = document.getElementById(categoryId(category));
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleIncreaseQty = (productId: string) => {
    const updatedCart = addItem(productId, 1);
    setCartQtyById(toQtyMap(updatedCart));
  };

  const handleDecreaseQty = (productId: string) => {
    const currentQty = cartQtyById[productId] ?? 0;
    const updatedCart = updateQty(productId, Math.max(0, currentQty - 1));
    setCartQtyById(toQtyMap(updatedCart));
  };

  const handleBuyNow = (productId: string) => {
    const updatedCart = addItem(productId, 1);
    setCartQtyById(toQtyMap(updatedCart));
    router.push("/cart");
  };

  const openProductPreview = (item: Product) => {
    setLightbox({
      src: item.imageSrc,
      alt: item.name,
      title: item.name,
      description: item.description,
    });
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

        <section className="mt-6 grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className="hidden self-start md:block">
            <div className="premium-panel floating-sidebar sticky top-24 rounded-3xl p-4">
              <p className="px-3 pb-2 text-xs uppercase tracking-[0.2em] text-black/50">
                Categories
              </p>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => jumpToCategory(category)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold ${
                      activeCategory === category
                        ? "bg-[color:var(--berry)]/10 text-[color:var(--berry)]"
                        : "text-black/70 hover:bg-[color:var(--cream)]"
                    }`}
                  >
                    <img
                      src={categoryIconMap.get(category)}
                      alt={category}
                      className="h-7 w-7 rounded-full border border-[color:var(--line)] object-cover"
                    />
                    <span>{category}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-8">
            {categories.map((category) => {
              const items = productsByCategory.get(category) ?? [];
              const subCategories = subCategoriesByCategory.get(category) ?? [];
              const filteredItems =
                activeCategory === category && activeSubCategory
                  ? items.filter((item) => item.subCategory === activeSubCategory)
                  : items;
              const sectionRevealId = `section-${categoryId(category)}`;
              return (
                <section
                  key={category}
                  id={categoryId(category)}
                  data-reveal-id={sectionRevealId}
                  data-reveal-type="section"
                  className={`space-y-4 transition-all duration-700 motion-reduce:transition-none ${
                    visibleSections[sectionRevealId]
                      ? "translate-y-0 opacity-100"
                      : "translate-y-5 opacity-0"
                  }`}
                >
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="hero-display text-4xl leading-none">{category}</h2>
                    <p className="text-xs uppercase tracking-[0.2em] text-black/50">
                      {items.length} items
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activeCategory === category && subCategories.length > 1 ? (
                      <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
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
                    {filteredItems.map((item, index) => (
                      <article
                        key={item.id}
                        data-reveal-id={item.id}
                        data-reveal-type="card"
                        className={`premium-panel flex h-full flex-col rounded-3xl p-4 transition-all duration-700 motion-reduce:transition-none ${
                          visibleCards[item.id]
                            ? "translate-y-0 opacity-100"
                            : "translate-y-6 opacity-0"
                        }`}
                        style={{
                          transitionDelay: visibleCards[item.id]
                            ? `${(index % 3) * 70}ms`
                            : "0ms",
                        }}
                      >
                        <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--cream)]">
                          <button
                            type="button"
                            onClick={() => openProductPreview(item)}
                            className="h-full w-full"
                            aria-label={`Expand image for ${item.name}`}
                          >
                            <img
                              src={item.imageSrc}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => openProductPreview(item)}
                          className="mt-3 flex flex-1 flex-col space-y-2 text-left"
                          aria-label={`Open details for ${item.name}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-semibold">{item.name}</h3>
                            <span className="rounded-full bg-[color:var(--caramel)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                              Eggless
                            </span>
                          </div>
                          <p className="min-h-10 text-sm text-black/60">{item.description}</p>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--berry)]">
                            Tap to view details
                          </p>
                          <p className="text-sm font-semibold text-[color:var(--berry)]">
                            {formatInr(item.priceInr)}
                          </p>
                        </button>
                        <div className="mt-4 flex gap-2">
                          <div className="flex flex-1 items-center justify-between rounded-full border border-black/10 bg-[color:var(--cream)] px-2 py-1">
                            <button
                              onClick={() => handleDecreaseQty(item.id)}
                              disabled={(cartQtyById[item.id] ?? 0) === 0}
                              className="h-7 w-7 rounded-full border border-[color:var(--line)] bg-white text-xs font-semibold disabled:opacity-40"
                              aria-label={`Decrease ${item.name}`}
                            >
                              -
                            </button>
                            <span className="min-w-7 text-center text-xs font-semibold">
                              {cartQtyById[item.id] ?? 0}
                            </span>
                            <button
                              onClick={() => handleIncreaseQty(item.id)}
                              className="h-7 w-7 rounded-full border border-[color:var(--line)] bg-white text-xs font-semibold"
                              aria-label={`Increase ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleBuyNow(item.id)}
                            className="flex-1 rounded-full bg-gradient-to-b from-[color:var(--berry)] to-[color:var(--berry-dark)] px-3 py-2 text-center text-xs font-semibold text-white"
                          >
                            Buy Now
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
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
