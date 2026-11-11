"use client";

/**
 * Étagère chargée à l'approche de l'écran : la page d'accueil n'envoie au
 * navigateur que les premiers rayons ; les suivants arrivent au défilement.
 */
import { useEffect, useRef, useState } from "react";
import type { ShelfPage } from "@/types/catalog";
import { Shelf, type ShelfProps } from "./shelf";
import { RayonSign } from "./rayon-sign";

type LazyShelfProps = Omit<ShelfProps, "products" | "nextOffset"> & { moreUrl: string };

export function LazyShelf(props: LazyShelfProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<ShelfPage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || page || failed) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        fetch(props.moreUrl)
          .then((res) => (res.ok ? (res.json() as Promise<ShelfPage>) : Promise.reject(new Error(String(res.status)))))
          .then((data) => !cancelled && setPage(data))
          .catch(() => !cancelled && setFailed(true));
      },
      { rootMargin: "900px 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [props.moreUrl, page, failed]);

  if (page) return <Shelf {...props} products={page.products} nextOffset={page.nextOffset} />;

  return (
    <section id={props.id} ref={ref} aria-busy={!failed} className="shelf-row relative scroll-mt-[var(--header-h)] pt-5 sm:pt-6">
      <div className="mx-auto max-w-[110rem] px-4 sm:px-6 lg:px-8">
        <RayonSign title={props.title} countLabel={props.countLabel} as={props.headingLevel} />
      </div>
      {failed ? (
        <p className="mx-auto max-w-[110rem] px-4 py-8 text-ink-muted sm:px-6 lg:px-8">
          Ce rayon n’a pas pu être chargé.{" "}
          <button type="button" className="font-semibold text-forest-700 underline" onClick={() => setFailed(false)}>
            Réessayer
          </button>
        </p>
      ) : (
        <div className="shelf-track mt-2 flex overflow-hidden px-1 sm:px-3 lg:px-5" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="flex w-[var(--slot-w)] shrink-0 flex-col items-center">
              <div className="flex h-[var(--shelf-stage)] items-end pb-1">
                <div className="skeleton h-[calc(var(--shelf-image)*0.8)] w-24 rounded-xl" />
              </div>
              <div className="flex h-[calc(var(--shelf-lip)+var(--shelf-front))] items-center pt-[var(--shelf-lip)]">
                <div className="h-7 w-14 rounded-sm bg-white/80" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
