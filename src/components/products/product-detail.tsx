/**
 * Fiche produit détaillée (affichée en fenêtre par-dessus les rayons ou en page).
 * Aucune donnée n'est inventée : chaque information absente est signalée.
 */
import Image from "next/image";
import { NOVA_LABELS, NUTRIENT_ROWS, allergenLabel, formatNutrient } from "@/lib/catalog/labels";
import { formatPrice } from "@/lib/pricing";
import { finalPriceCents, unitPriceOf } from "@/lib/product";
import type { ProductDetail as ProductDetailData, ProductSummary } from "@/types/catalog";
import { AddToCart } from "@/components/cart/add-to-cart";
import { AddToListButton } from "@/components/lists/add-to-list-button";
import { Shelf } from "@/components/shelves/shelf";
import { ExternalIcon, InfoIcon, LeafIcon } from "@/components/ui/icons";
import { FavoriteButton } from "./favorite-button";
import { NutriScore } from "./nutriscore";
import { ShelfPrice } from "./price-tag";
import { RecordView } from "./record-view";

function Missing({ children = "Information non renseignée dans la fiche source." }: { children?: React.ReactNode }) {
  return <p className="text-sm italic text-ink-muted">{children}</p>;
}

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-t border-cream-200 py-1" open={open}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-xl leading-none text-ink-muted transition-transform group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

export function ProductDetail({ product, similar, titleId = "fiche-produit-titre" }: { product: ProductDetailData; similar: ProductSummary[]; titleId?: string }) {
  const final = finalPriceCents(product);
  const unit = unitPriceOf(product);
  const isFood = product.nutriscore !== null || product.nutrition !== null || product.ingredientsText !== null;
  const lastUpdate = product.source.lastModifiedAt
    ? new Date(product.source.lastModifiedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const summary: ProductSummary = {
    id: product.id,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    quantity: product.quantity,
    netAmount: product.netAmount,
    netUnit: product.netUnit,
    category: product.category,
    subshelf: product.subshelf,
    priceCents: product.priceCents,
    isDemoPrice: product.isDemoPrice,
    promotion: product.promotion,
    image: product.image,
    nutriscore: product.nutriscore,
    organic: product.organic,
  };

  return (
    <article className="pb-6">
      <RecordView product={summary} />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-10">
        {/* Visuel */}
        <figure data-slot className="flex flex-col">
          <div
            className="relative flex aspect-square max-h-[26rem] items-end justify-center overflow-hidden rounded-[1.5rem] px-8 pb-10 pt-8 sm:max-h-[30rem]"
            style={{ background: `radial-gradient(70% 60% at 50% 42%, ${product.image.color}2e, transparent 70%), linear-gradient(180deg, #fff, #f5f3ea)` }}
          >
            <Image
              data-product-image
              src={product.image.src}
              alt={[product.name, product.brand, product.quantity].filter(Boolean).join(", ")}
              width={product.image.width}
              height={product.image.height}
              sizes="(min-width: 768px) 420px, 80vw"
              quality={80}
              priority
              className={product.image.cutout ? "relative z-10 max-h-full w-auto object-contain" : "relative z-10 max-h-full w-auto rounded-xl object-contain mix-blend-multiply"}
            />
            <span aria-hidden="true" className="absolute inset-x-6 bottom-6 h-3 rounded-sm bg-gradient-to-b from-oak-100 to-oak-300 shadow-[0_8px_14px_-8px_rgb(84_60_24/0.5)]" />
            <span aria-hidden="true" className="absolute bottom-8 left-1/2 z-0 h-4 w-1/2 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(50%_50%_at_50%_50%,rgb(60_42_15/0.3),transparent_70%)]" />
          </div>
          <figcaption className="mt-2 text-xs text-ink-muted">
            {product.imageAttribution} ·{" "}
            <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.fr" className="underline hover:text-forest-700" target="_blank" rel="noopener noreferrer license">
              licence
            </a>
            {product.image.cutout ? " · détourage automatique" : ""}
          </figcaption>
        </figure>

        {/* Informations */}
        <div className="min-w-0">
          {product.brand ? <p className="text-sm font-semibold uppercase tracking-[0.12em] text-forest-700">{product.brand}</p> : null}
          <h2 id={titleId} className="mt-1 font-display text-[1.75rem] font-semibold leading-tight text-balance sm:text-[2.1rem]">
            {product.name}
          </h2>
          <p className="mt-1 text-ink-soft">
            {[product.quantity, product.genericName].filter(Boolean).join(" · ") || <span className="italic text-ink-muted">Format non renseigné</span>}
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            {product.nutriscore ? <NutriScore grade={product.nutriscore} /> : null}
            {product.organic ? (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-leaf-100 px-3 text-sm font-semibold text-forest-800">
                <LeafIcon size={16} /> Bio (label déclaré)
              </span>
            ) : null}
            {product.novaGroup ? (
              <span className="inline-flex h-9 items-center rounded-full bg-cream-100 px-3 text-sm font-medium text-ink-soft" title={NOVA_LABELS[product.novaGroup]}>
                NOVA {product.novaGroup}
              </span>
            ) : null}
          </div>

          <div className="mt-5 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-forest-900/6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <ShelfPrice cents={final} size="lg" className={product.promotion ? "text-tomato-600" : "text-ink"} />
                  {product.promotion ? (
                    <>
                      <span className="text-sm text-ink-muted line-through">
                        <span className="sr-only">au lieu de </span>
                        {formatPrice(product.priceCents)}
                      </span>
                      <span className="rounded-full bg-tomato-600 px-2 py-0.5 text-sm font-bold text-white">{product.promotion.label}</span>
                    </>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-ink-muted">{unit ? `soit ${unit.label}` : "Prix au kilo/litre non calculable (format non renseigné)"}</p>
              </div>
              <FavoriteButton product={summary} size="md" />
            </div>
            <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-cream-100 px-3 py-2 text-xs text-ink-soft">
              <InfoIcon size={15} className="mt-px shrink-0" />
              Prix fictif de démonstration{product.promotion ? ", promotion fictive" : ""} : il ne correspond au tarif d’aucune enseigne.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <AddToCart product={summary} variant="inline" />
              <AddToListButton product={summary} />
            </div>
          </div>

          <div className="mt-5">
            {isFood ? (
              <>
                <Section title="Ingrédients" open>
                  {product.ingredientsText ? <p className="text-sm leading-relaxed text-ink-soft">{product.ingredientsText}</p> : <Missing />}
                </Section>
                <Section title="Allergènes">
                  {product.allergens.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {product.allergens.map((a) => (
                        <li key={a} className="rounded-full bg-tomato-50 px-2.5 py-1 text-sm font-medium text-tomato-700 ring-1 ring-tomato-600/20">
                          {allergenLabel(a)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Missing>Aucun allergène renseigné dans la fiche source (ce qui ne garantit pas leur absence : vérifiez l’emballage).</Missing>
                  )}
                  {product.traces.length > 0 ? (
                    <p className="mt-2 text-sm text-ink-soft">
                      Traces éventuelles : {product.traces.map(allergenLabel).join(", ")}.
                    </p>
                  ) : null}
                </Section>
                <Section title="Valeurs nutritionnelles">
                  {product.nutrition ? (
                    <table className="w-full text-sm">
                      <caption className="sr-only">Valeurs nutritionnelles pour {product.nutrition.per === "100ml" ? "100 ml" : "100 g"}</caption>
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                          <th scope="col" className="py-1.5 font-semibold">Pour {product.nutrition.per === "100ml" ? "100 ml" : "100 g"}</th>
                          <th scope="col" className="py-1.5 text-right font-semibold">Valeur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {NUTRIENT_ROWS.map((row) => (
                          <tr key={row.key} className="border-t border-cream-200">
                            <th scope="row" className={row.indent ? "py-1.5 pl-4 font-normal text-ink-soft" : "py-1.5 font-medium"}>
                              {row.label}
                            </th>
                            <td className="py-1.5 text-right tabular-nums">{formatNutrient(product.nutrition![row.key], row.unit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <Missing />
                  )}
                  {product.servingSize ? <p className="mt-2 text-xs text-ink-muted">Portion indiquée : {product.servingSize}</p> : null}
                </Section>
              </>
            ) : null}
            <Section title="Informations et provenance" open={!isFood}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-ink-muted">Code-barres</dt>
                <dd className="font-mono tabular-nums">{product.barcode}</dd>
                <dt className="text-ink-muted">Rayon</dt>
                <dd>
                  {product.categoryName}
                  {product.subshelfName ? ` › ${product.subshelfName}` : ""}
                </dd>
                <dt className="text-ink-muted">Source</dt>
                <dd>
                  <a href={product.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-forest-700 underline underline-offset-2">
                    Fiche {product.source.name} <ExternalIcon size={14} />
                  </a>
                </dd>
                <dt className="text-ink-muted">Licence</dt>
                <dd>Données ODbL · photo CC BY-SA</dd>
                {lastUpdate ? (
                  <>
                    <dt className="text-ink-muted">Mise à jour</dt>
                    <dd>{lastUpdate} (source)</dd>
                  </>
                ) : null}
              </dl>
            </Section>
          </div>
        </div>
      </div>

      {similar.length > 0 ? (
        <div className="-mx-4 mt-8 sm:-mx-6 md:-mx-8">
          <Shelf id="similaires" title="Produits similaires" eyebrow="Sur la même étagère" accent="#166534" products={similar} headingLevel="h3" />
        </div>
      ) : null}
    </article>
  );
}
