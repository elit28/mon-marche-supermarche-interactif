import { getCategoryDefinition } from "@/lib/catalog/categories";
import { getPromotedProducts, getShelf, listCategories } from "@/server/services/catalog";
import { CategoryIcon } from "@/components/navigation/category-icon";
import { RecentlyViewedShelf } from "@/components/home/recently-viewed-shelf";
import { LazyShelf } from "@/components/shelves/lazy-shelf";
import { Shelf } from "@/components/shelves/shelf";
import { TagIcon } from "@/components/ui/icons";
import { CatalogUnavailable } from "@/components/layout/catalog-unavailable";

export const dynamic = "force-dynamic";

const EAGER_SHELVES = 3;
const SHELF_PAGE = 18;

export default async function HomePage() {
  let data;
  try {
    const categories = await listCategories();
    const [promos, ...eager] = await Promise.all([
      getPromotedProducts(SHELF_PAGE),
      ...categories.slice(0, EAGER_SHELVES).map((c) => getShelf(c.slug, { limit: SHELF_PAGE })),
    ]);
    data = { categories, promos, eager };
  } catch (error) {
    console.error(error);
    return <CatalogUnavailable />;
  }
  const { categories, promos, eager } = data;
  if (categories.length === 0) return <CatalogUnavailable empty />;
  const productCount = categories.reduce((s, c) => s + c.productCount, 0);

  const shelves = categories.map((c, i) => {
    const def = getCategoryDefinition(c.slug);
    const common = {
      id: `rayon-${c.slug}`,
      title: c.name,
      accent: c.accent,
      icon: <CategoryIcon slug={c.slug} size={16} />,
      countLabel: `${c.productCount} produits`,
      href: `/rayon/${c.slug}`,
      hrefLabel: def ? "Tout le rayon" : "Voir",
      moreUrl: `/api/shelves/${c.slug}?limit=${SHELF_PAGE}`,
    };
    const page = eager[i];
    return page ? <Shelf key={c.slug} {...common} products={page.products} nextOffset={page.nextOffset} priority={i < 2} /> : <LazyShelf key={c.slug} {...common} />;
  });

  return (
    <>
      <h1 className="sr-only">MON MARCHÉ — vos courses, rayon par rayon : {productCount} vrais produits, prix fictifs de démonstration</h1>
      <div className="pb-8">
        {shelves.slice(0, EAGER_SHELVES)}

        {promos.products.length > 0 ? (
          <Shelf
            id="promotions"
            title="Promotions de la semaine"
            accent="#c2410c"
            icon={<TagIcon size={16} />}
            countLabel={`${promos.total} offres fictives`}
            href="/promotions"
            hrefLabel="Toutes les promos"
            products={promos.products}
            moreUrl="/api/promotions"
            nextOffset={promos.nextOffset}
          />
        ) : null}

        <RecentlyViewedShelf />

        {shelves.slice(EAGER_SHELVES)}
      </div>
    </>
  );
}
