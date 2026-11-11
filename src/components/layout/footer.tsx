import Link from "next/link";
import { LogoMark } from "./logo";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-forest-900/10 bg-cream-100/70 pb-36 md:pb-32">
      <div className="mx-auto grid max-w-[110rem] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div className="max-w-md space-y-3">
          <div className="flex items-center gap-2">
            <LogoMark size={30} />
            <span className="font-display text-lg font-semibold">mon marché</span>
          </div>
          <p className="text-sm text-ink-soft">
            Supermarché virtuel open source. Les produits sont réels (Open Food Facts et bases sœurs) ; les prix et promotions sont <strong>fictifs</strong> et servent uniquement à la démonstration. Aucune commande n’est transmise, aucun paiement n’est encaissé.
          </p>
        </div>
        <nav aria-label="Informations" className="space-y-2 text-sm">
          <p className="font-semibold">Le projet</p>
          <ul className="space-y-1.5 text-ink-soft">
            <li><Link className="hover:text-forest-700 hover:underline" href="/a-propos">À propos & licences</Link></li>
            <li><Link className="hover:text-forest-700 hover:underline" href="/promotions">Promotions (démo)</Link></li>
            <li><Link className="hover:text-forest-700 hover:underline" href="/mon-espace">Mon espace & données</Link></li>
          </ul>
        </nav>
        <div className="space-y-2 text-sm text-ink-soft">
          <p className="font-semibold text-ink">Données ouvertes</p>
          <p>
            Fiches produits © contributeurs <a className="underline hover:text-forest-700" href="https://world.openfoodfacts.org" rel="noopener noreferrer" target="_blank">Open Food Facts</a>, sous licence ODbL ; photos sous licence CC BY-SA. Les marques citées appartiennent à leurs propriétaires, qui ne sont pas associés à ce projet.
          </p>
        </div>
      </div>
    </footer>
  );
}
