"use client";

import { useEffect, useMemo, useState } from "react";
import { type Product, getProducts as getFallbackProducts } from "@/lib/products";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(getFallbackProducts());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { products?: Product[] };
        if (!active || !data.products) return;
        setProducts(data.products);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  return { products, productById, loading };
}
