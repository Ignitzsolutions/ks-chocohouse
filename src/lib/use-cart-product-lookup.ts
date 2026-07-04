"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";

/**
 * Fetch product records (INCLUDING unavailable ones) for a list of ids.
 * Used by cart and checkout to distinguish "product no longer available"
 * from "product missing / deleted" so we can surface both to the customer
 * instead of silently dropping the line item.
 */
export function useCartProductLookup(ids: string[]) {
  const [productById, setProductById] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(false);
  const idsKey = useMemo(() => [...new Set(ids)].sort().join(","), [ids]);

  useEffect(() => {
    const uniqueIds = idsKey ? idsKey.split(",") : [];
    if (uniqueIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProductById(new Map());
      return;
    }

    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    fetch("/api/products/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: uniqueIds }),
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const products = Array.isArray(data?.products) ? (data.products as Product[]) : [];
        const map = new Map<string, Product>();
        products.forEach((product) => map.set(product.id, product));
        setProductById(map);
      })
      .catch(() => {
        if (active) setProductById(new Map());
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [idsKey]);

  return { productById, loading };
}
