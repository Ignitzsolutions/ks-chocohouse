"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { HOME_CATEGORY_CARDS, type CategoryCard } from "@/lib/categories";

export function HomeCategoriesGrid() {
  const [categories, setCategories] = useState<CategoryCard[]>(HOME_CATEGORY_CARDS);

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((card) => (
        <Link
          key={card.id}
          href={`/menu?category=${encodeURIComponent(card.category)}`}
          className="premium-panel group rounded-3xl"
        >
          <div className="aspect-[4/3] w-full overflow-hidden rounded-t-3xl bg-[color:var(--cream)]">
            <img
              src={card.imageSrc}
              alt={card.alt}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          </div>
          <div className="px-5 py-4">
            <p className="hero-display text-2xl leading-none">{card.label}</p>
            <p className="mt-1 text-sm text-black/55">100% Eggless options</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
