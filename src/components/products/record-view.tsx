"use client";

import { useEffect } from "react";
import { useRecentlyViewedStore } from "@/stores/recently-viewed";
import type { ProductSummary } from "@/types/catalog";

/** Mémorise la consultation d'une fiche (sur cet appareil uniquement). */
export function RecordView({ product }: { product: ProductSummary }) {
  const push = useRecentlyViewedStore((s) => s.push);
  const hydrated = useRecentlyViewedStore((s) => s.hydrated);
  useEffect(() => {
    if (hydrated) push(product);
  }, [hydrated, product, push]);
  return null;
}
