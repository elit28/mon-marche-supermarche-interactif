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
    <section id={props.id} ref={ref} aria-busy={!failed} className="relative scroll-mt-[calc(var(--header-h)+4rem)]">
      <div className="mx-auto max-w-[110rem] px-4 sm:px-6 lg:px-10">
        <RayonSign title={props.title} eyebrow={props.eyebrow} accent={props.accent} icon={props.icon} countLabel={props.countLabel} as={props.headingLevel} />
      </div>
      {failed ? (
        <p className="mx-auto max-w-[110rem] px-4 py-8 text-ink-muted sm:px-6 lg:px-10">
          Ce rayon n’a pas pu être chargé.{" "}
          <button type="button" className="font-semibold text-forest-700 underline" onClick={() => setFailed(false)}>
            Réessayer
          </button>
        </p>
      ) : (
        <div className="shelf-track mt-1 flex gap-4 overflow-hidden px-4 pb-4 sm:px-6 lg:px-10" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="flex w-32 shrink-0 flex-col items-center">
              <div className="flex h-[var(--shelf-stage)] items-end pb-1">
                <div className="skeleton h-[calc(var(--shelf-image)*0.8)] w-20 rounded-xl" />
              </div>
              <div className="skeleton mt-[1.25rem] h-16 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
