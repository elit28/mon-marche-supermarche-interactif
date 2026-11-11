import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/lib/pricing";
import { getGuestKey } from "@/server/auth/guest";
import { listDemoOrders } from "@/server/services/orders";
import { ForgetMe } from "@/components/lists/forget-me";
import { HeartIcon, ListIcon, UserIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon espace", robots: { index: false } };

export default async function MySpacePage() {
  const guest = await getGuestKey();
  const orders = guest ? await listDemoOrders(guest).catch(() => []) : [];
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-forest-700 text-white">
          <UserIcon size={28} />
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold">Mon espace</h1>
          <p className="text-ink-soft">Mode invité : aucun compte, aucune donnée personnelle requise.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/favoris" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft hover:ring-2 hover:ring-forest-700/20">
          <HeartIcon className="text-tomato-600" /> <span className="font-semibold">Mes favoris</span>
        </Link>
        <Link href="/listes" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft hover:ring-2 hover:ring-forest-700/20">
          <ListIcon className="text-forest-700" /> <span className="font-semibold">Mes listes de courses</span>
        </Link>
      </div>

      <section className="mt-10" aria-labelledby="commandes-titre">
        <h2 id="commandes-titre" className="font-display text-2xl font-semibold">
          Commandes simulées
        </h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-ink-soft">Aucune commande simulée pour l’instant.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {orders.map((o) => (
              <li key={o.reference} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgb(23_35_28/0.06)]">
                <span>
                  <span className="block font-mono font-semibold">{o.reference}</span>
                  <span className="block text-sm text-ink-muted">
                    {o.created_at.toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} · {o.item_count} articles ·{" "}
                    {o.fulfillment === "delivery" ? "livraison" : "retrait"}
                  </span>
                </span>
                <span className="font-bold tabular-nums">{formatPrice(o.total_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-3xl bg-white p-6 shadow-soft" aria-labelledby="donnees-titre">
        <h2 id="donnees-titre" className="font-display text-2xl font-semibold">
          Vos données
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          <li>Un identifiant invité aléatoire (cookie technique) relie votre panier, vos favoris, vos listes et vos commandes simulées.</li>
          <li>Les produits consultés récemment restent uniquement sur cet appareil.</li>
          <li>L’adresse facultative saisie lors d’une commande simulée est conservée avec cette commande jusqu’à suppression.</li>
          <li>Aucun traceur publicitaire, aucune donnée transmise à des tiers.</li>
        </ul>
        <ForgetMe />
      </section>
    </div>
  );
}
