import { getCategoryDefinition } from "@/lib/catalog/categories";
import { getFeaturedProducts, getPromotedProducts, getShelf, listCategories } from "@/server/services/catalog";
import { AisleNav } from "@/components/navigation/aisle-nav";
import { CategoryIcon } from "@/components/navigation/category-icon";
import { RecentlyViewedShelf } from "@/components/home/recently-viewed-shelf";
import { LazyShelf } from "@/components/shelves/lazy-shelf";
import { Shelf } from "@/components/shelves/shelf";
import { SparkIcon, TagIcon } from "@/components/ui/icons";
import { CatalogUnavailable } from "@/components/layout/catalog-unavailable";

export const dynamic = "force-dynamic";

const EAGER_SHELVES = 3;
const SHELF_PAGE = 18;

export default async function HomePage() {
  let data;
  try {
    const categories = await listCategories();
    const [promos, featured, ...eager] = await Promise.all([
      getPromotedProducts(SHELF_PAGE),
      getFeaturedProducts(24),
      ...categories.slice(0, EAGER_SHELVES).map((c) => getShelf(c.slug, { limit: SHELF_PAGE })),
    ]);
    data = { categories, promos, featured, eager };
  } catch (error) {
    console.error(error);
    return <CatalogUnavailable />;
  }
  const { categories, promos, featured, eager } = data;
  if (categories.length === 0) return <CatalogUnavailable empty />;
  const productCount = categories.reduce((s, c) => s + c.productCount, 0);

  return (
    <>
      <section className="mx-auto max-w-[110rem] px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-9 lg:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-forest-700">Le marché est ouvert</p>
        <h1 className="mt-1 max-w-3xl font-display text-[1.75rem] font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl">
          Vos courses, rayon par rayon.
        </h1>
        <p className="mt-2 hidden max-w-2xl text-base text-ink-soft sm:mt-3 sm:block sm:text-lg">
          {productCount} vrais produits vendus en France, photographiés par la communauté Open Food Facts. Touchez « + » : le produit file dans votre panier.
        </p>
      </section>

      <AisleNav categories={categories} />

      <div className="space-y-10 pb-8 pt-6 sm:space-y-12">
        {promos.products.length > 0 ? (
          <Shelf
            id="promotions"
            title="Promotions de la semaine"
            eyebrow="Offres fictives de démonstration"
            accent="#c2410c"
            icon={<TagIcon size={22} />}
            countLabel={`${promos.total}`}
            href="/promotions"
            hrefLabel="Toutes les promos"
            products={promos.products}
            moreUrl="/api/promotions"
            nextOffset={promos.nextOffset}
            priority
          />
        ) : null}

        <RecentlyViewedShelf />

        {featured.length > 0 ? (
          <Shelf id="incontournables" title="Les incontournables" eyebrow="Sélection du marché" accent="#166534" icon={<SparkIcon size={22} />} products={featured} />
        ) : null}

        {categories.map((c, i) => {
          const def = getCategoryDefinition(c.slug);
          const common = {
            id: `rayon-${c.slug}`,
            title: c.name,
            eyebrow: `Rayon ${String(i + 1).padStart(2, "0")}`,
            accent: c.accent,
            icon: <CategoryIcon slug={c.slug} size={22} />,
            countLabel: `${c.productCount} produits`,
            href: `/rayon/${c.slug}`,
            hrefLabel: def ? "Tout le rayon" : "Voir",
            moreUrl: `/api/shelves/${c.slug}?limit=${SHELF_PAGE}`,
          };
          const page = eager[i];
          return page ? <Shelf key={c.slug} {...common} products={page.products} nextOffset={page.nextOffset} /> : <LazyShelf key={c.slug} {...common} />;
        })}
      </div>
    </>
  );
}
