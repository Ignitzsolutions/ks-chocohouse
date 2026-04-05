"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HOME_CATEGORY_CARDS, type CategoryCard } from "@/lib/categories";

export function HomeCategoriesGrid() {
  const [categories, setCategories] = useState<CategoryCard[]>(HOME_CATEGORY_CARDS);

  const fallbackImageByCategory = useMemo(
    () =>
      new Map(
        HOME_CATEGORY_CARDS.map((card) => [
          card.category,
          { imageSrc: card.imageSrc, alt: card.alt, label: card.label },
        ])
      ),
    []
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/categories", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { categories?: CategoryCard[] };
        if (!active || !data.categories || data.categories.length === 0) return;
        setCategories(data.categories);
      } catch {
        // keep fallback cards
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3 md:gap-6">
      {categories.map((card) => {
        const fallback = fallbackImageByCategory.get(card.category);
        const imageSrc = fallback?.imageSrc ?? card.imageSrc;
        const alt = fallback?.alt ?? card.alt;

        return (
          <Link
            key={card.id}
            href={`/menu?category=${encodeURIComponent(card.category)}`}
            className="group block overflow-hidden border border-black/10 bg-white transition duration-300 hover:border-black/15 hover:shadow-[0_12px_28px_rgba(42,27,20,0.05)]"
          >
            <div className="aspect-[1.08] w-full overflow-hidden bg-white">
              <img
                src={imageSrc}
                alt={alt}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="border-t border-black/10 px-4 py-4 text-center sm:px-5 md:px-6 md:py-5">
              <p className="text-base font-semibold leading-tight text-[#2e2321] md:text-[1.1rem]">
                {card.label}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a6660]">
                100% Eggless
              </p>
              <p className="mt-3 text-xs font-medium text-[#5d4e49] transition group-hover:text-[#2f2422]">
                Explore collection
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
