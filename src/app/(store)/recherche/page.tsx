import type { Metadata } from "next";
import Link from "next/link";
import { getCategoryDefinition } from "@/lib/catalog/categories";
import { parseSearchParams, toQueryString } from "@/lib/search-params";
import { getGuestKey } from "@/server/auth/guest";
import { searchCatalog } from "@/server/services/search";
import { getFavoriteIds } from "@/server/services/user-data";
import { CategoryIcon } from "@/components/navigation/category-icon";
import { FilterBar } from "@/components/navigation/filter-bar";
import { ProductGrid } from "@/components/shelves/product-grid";
import { Shelf } from "@/components/shelves/shelf";
import { CatalogUnavailable } from "@/components/layout/catalog-unavailable";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = parseSearchParams(await searchParams);
  return { title: params.q ? `« ${params.q} »` : "Recherche", robots: { index: false } };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = parseSearchParams(await searchParams);
  let result;
  try {
    const guest = params.favoris ? await getGuestKey() : null;
    const favorites = guest ? await getFavoriteIds(guest) : new Set<number>();
    result = await searchCatalog(params, favorites);
  } catch (error) {
    console.error(error);
    return <CatalogUnavailable />;
  }
  const heading = params.q ? `« ${params.q} »` : "Tous les produits";

  return (
    <div className="pb-10 pt-6">
      <div className="mx-auto max-w-[110rem] px-4 sm:px-6 lg:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-forest-700">Recherche</p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          {heading}
          <span className="ml-3 align-middle font-sans text-base font-medium text-ink-muted" aria-live="polite">
            {result.total} produit{result.total > 1 ? "s" : ""}
          </span>
        </h1>
        <div className="mt-4">
          <FilterBar params={params} facets={result.facets} total={result.total} />
        </div>
      </div>

      {result.total === 0 ? (
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Aucun produit ne correspond</p>
          <p className="mt-2 text-ink-soft">
            Vérifiez l’orthographe, essayez un terme plus général (« pâtes », « eau », « chocolat ») ou retirez un filtre.
          </p>
          <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest-700 px-6 font-semibold text-white">
            Retour aux rayons
          </Link>
        </div>
      ) : result.groups.length > 0 ? (
        <div className="mt-6 space-y-10">
          {result.groups.map((g) => (
            <Shelf
              key={g.category.slug}
              id={`resultats-${g.category.slug}`}
              title={g.category.name}
              eyebrow={getCategoryDefinition(g.category.slug)?.shortName}
              accent={g.category.accent}
              icon={<CategoryIcon slug={g.category.slug} size={22} />}
              countLabel={`${g.count} sur ${g.category.productCount}`}
              href={g.count > g.products.length ? `/recherche${toQueryString({ ...params, categorie: [g.category.slug] })}` : undefined}
              hrefLabel="Tous les résultats"
              products={g.products}
            />
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-[110rem] px-2 sm:px-4 lg:px-8">
          <ProductGrid products={result.products} nextOffset={result.nextOffset} apiQuery={toQueryString(params)} label={`Résultats : ${heading}`} />
        </div>
      )}
    </div>
  );
}
