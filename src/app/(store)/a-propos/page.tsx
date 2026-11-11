import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "À propos, données et licences" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-forest-700">Le projet</p>
      <h1 className="font-display text-4xl font-semibold leading-tight">Un vrai marché, de vrais produits, des prix pour de faux.</h1>
      <div className="mt-6 space-y-8 text-[1.02rem] leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Ce qu’est MON MARCHÉ</h2>
          <p className="mt-2">
            MON MARCHÉ est un projet open source qui réinvente les courses en ligne autour de véritables rayons : on parcourt des étagères, on attrape un produit, il file dans le panier. Le site est une <strong>démonstration</strong> : aucune commande n’est transmise, aucun paiement n’est demandé ni encaissé.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">D’où viennent les produits ?</h2>
          <p className="mt-2">
            Chaque produit est une fiche réelle issue d’<a className="font-semibold text-forest-700 underline" href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a> et de ses bases sœurs (Open Beauty Facts, Open Products Facts, Open Pet Food Facts), alimentées par des milliers de contributeurs. Nom, marque, format, ingrédients, allergènes, valeurs nutritionnelles et Nutri-Score sont repris tels quels ; lorsqu’une information manque, la fiche le signale au lieu de l’inventer. Chaque fiche renvoie vers sa source.
          </p>
          <p className="mt-2">
            Les photos sont celles des contributeurs. Lorsque le fond est uni, il est retiré automatiquement (détourage) pour poser l’emballage sur l’étagère ; l’image n’est jamais redessinée ni générée.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Et les prix ?</h2>
          <p className="mt-2">
            Open Food Facts n’est pas une base de prix. Les prix et promotions affichés sont <strong>fictifs</strong>, calculés à partir d’un barème indicatif par catégorie et du format du produit. Ils ne correspondent au tarif d’aucune enseigne et ne doivent pas être utilisés comme référence. Ils sont stockés à part du catalogue, ce qui permettra de brancher un jour une source de prix autorisée.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Licences</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Code de l’application : licence MIT.</li>
            <li>
              Données produits : <a className="underline" href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">Open Database License (ODbL) 1.0</a>, © contributeurs Open Food Facts. L’instantané redistribué avec le projet reste sous ODbL.
            </li>
            <li>
              Photos : <a className="underline" href="https://creativecommons.org/licenses/by-sa/3.0/deed.fr" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a> ; l’auteur est indiqué sous chaque photo dans la fiche produit.
            </li>
            <li>Polices Fraunces et Figtree : SIL Open Font License 1.1.</li>
            <li>
              Les marques et emballages reproduits appartiennent à leurs propriétaires respectifs ; ils sont montrés à titre d’identification des produits, sans affiliation ni partenariat.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Vie privée</h2>
          <p className="mt-2">
            Pas de compte obligatoire, pas de traceur publicitaire. Un identifiant invité aléatoire (cookie technique) relie votre panier, vos favoris et vos listes. Tout peut être effacé depuis <Link className="font-semibold text-forest-700 underline" href="/mon-espace">Mon espace</Link>.
          </p>
        </section>
      </div>
    </article>
  );
}
