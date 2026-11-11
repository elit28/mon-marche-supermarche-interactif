import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryDefinition } from "@/lib/catalog/categories";
import { hasActiveFilters, parseSearchParams, toQueryString } from "@/lib/search-params";
import { getGuestKey } from "@/server/auth/guest";
import { getShelf, getSubshelves, listCategories } from "@/server/services/catalog";
import { searchCatalog } from "@/server/services/search";
import { getFavoriteIds } from "@/server/services/user-data";
import { CategoryIcon } from "@/components/navigation/category-icon";
import { FilterBar } from "@/components/navigation/filter-bar";
import { ProductGrid } from "@/components/shelves/product-grid";
import { Shelf } from "@/components/shelves/shelf";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const def = getCategoryDefinition(slug);
  return def ? { title: `Rayon ${def.name}`, description: def.description } : { title: "Rayon introuvable" };
}

export default async function RayonPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const def = getCategoryDefinition(slug);
  if (!def) notFound();
  const categories = await listCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const search = parseSearchParams({ ...(await searchParams), categorie: slug });
  const filtered = hasActiveFilters({ ...search, categorie: [] }) || search.tri !== "pertinence";
  const guest = search.favoris ? await getGuestKey() : null;
  const favorites = guest ? await getFavoriteIds(guest) : new Set<number>();
  const result = await searchCatalog({ ...search, tri: filtered ? search.tri : "pertinence" }, favorites);

  const subshelves = filtered ? [] : await getSubshelves(slug);
  const pages = filtered ? [] : await Promise.all(subshelves.map((s) => getShelf(slug, { subshelf: s.slug, limit: 18 })));
  const position = categories.findIndex((c) => c.slug === slug);

  return (
    <div className="pb-10 pt-6">
      <header className="mx-auto max-w-[110rem] px-4 sm:px-6 lg:px-10">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-soft" style={{ backgroundColor: category.accent }} aria-hidden="true">
            <CategoryIcon slug={slug} size={28} />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: category.accent }}>
              Rayon {String(position + 1).padStart(2, "0")}
            </p>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-[2.6rem]">{category.name}</h1>
            <p className="mt-1 max-w-2xl text-ink-soft">
              {def.description} <span className="whitespace-nowrap text-ink-muted">· {category.productCount} produits</span>
            </p>
          </div>
        </div>
        {!filtered && subshelves.length > 1 ? (
          <nav aria-label="Étagères du rayon" className="shelf-scroller -mx-4 mt-5 flex gap-2 px-4 sm:mx-0 sm:px-0">
            {subshelves.map((s) => (
              <a key={s.slug} href={`#etagere-${s.slug}`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-forest-900/10 bg-white px-3.5 text-sm font-medium text-ink-soft hover:border-forest-700/40">
                {s.name} <span className="text-ink-muted">{s.count}</span>
              </a>
            ))}
          </nav>
        ) : null}
        <div className="mt-4">
          <FilterBar params={search} facets={result.facets} total={result.total} hideCategories />
        </div>
      </header>

      {filtered ? (
        <div className="mx-auto mt-6 max-w-[110rem] px-2 sm:px-4 lg:px-8">
          {result.total === 0 ? (
            <p className="px-2 py-12 text-center text-ink-soft">Aucun produit de ce rayon ne correspond à ces filtres.</p>
          ) : (
            <ProductGrid products={result.products} nextOffset={result.nextOffset} apiQuery={toQueryString(search)} label={`Rayon ${category.name}`} />
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-10">
          {subshelves.map((s, i) => (
            <Shelf
              key={s.slug}
              id={`etagere-${s.slug}`}
              title={s.name}
              eyebrow={`Étagère ${i + 1}`}
              accent={category.accent}
              countLabel={`${s.count}`}
              products={pages[i]!.products}
              nextOffset={pages[i]!.nextOffset}
              moreUrl={`/api/shelves/${slug}?etagere=${s.slug}&limit=18`}
              priority={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
