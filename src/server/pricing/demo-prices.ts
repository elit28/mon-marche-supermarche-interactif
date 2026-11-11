/**
 * Générateur de PRIX FICTIFS de démonstration.
 *
 * Ces prix ne proviennent d'aucune enseigne ni d'aucun relevé : ils sont
 * calculés de façon déterministe à partir d'un barème indicatif par étagère
 * (€/kg ou €/L) et du format du produit, puis arrondis « façon magasin ».
 * Ils sont stockés dans une table indépendante (`prices`, source `demo`) et
 * modifiables depuis l'administration. Un fournisseur de prix autorisé pourra
 * remplacer cette source sans toucher au catalogue.
 */
import { createHash } from "node:crypto";
import type { CategorySlug } from "../../lib/catalog/categories";
import type { PromotionInput } from "../../lib/pricing";

export const DEMO_PRICE_SOURCE = "demo-generator-v1";

/** Barème fictif par étagère : prix de référence au kilo ou au litre (centimes) et prix typique. */
interface Scale {
  perUnit: number;
  typical: number;
}

const DEFAULT_SCALE: Scale = { perUnit: 900, typical: 299 };

const SCALES: Partial<Record<CategorySlug, Record<string, Scale>>> = {
  "fruits-legumes": { fruits: { perUnit: 380, typical: 249 }, legumes: { perUnit: 320, typical: 199 }, salades: { perUnit: 900, typical: 179 }, "fruits-secs": { perUnit: 1800, typical: 349 } },
  "produits-laitiers-oeufs": { yaourts: { perUnit: 320, typical: 219 }, desserts: { perUnit: 480, typical: 239 }, laits: { perUnit: 115, typical: 129 }, "beurres-cremes": { perUnit: 920, typical: 259 }, oeufs: { perUnit: 700, typical: 289 } },
  fromages: { "pates-molles": { perUnit: 1300, typical: 299 }, "pates-pressees": { perUnit: 1500, typical: 349 }, "fondus-tartiner": { perUnit: 1250, typical: 279 }, rapes: { perUnit: 1300, typical: 259 }, fromages: { perUnit: 1400, typical: 299 } },
  "viandes-charcuterie": { jambons: { perUnit: 1650, typical: 319 }, saucissons: { perUnit: 2200, typical: 349 }, volailles: { perUnit: 1400, typical: 449 }, "lardons-saucisses": { perUnit: 1100, typical: 279 }, viandes: { perUnit: 1500, typical: 399 } },
  "poissons-produits-mer": { fumes: { perUnit: 4500, typical: 599 }, surimi: { perUnit: 1000, typical: 249 }, crustaces: { perUnit: 2400, typical: 549 }, poissons: { perUnit: 2000, typical: 499 } },
  "boulangerie-patisserie": { "pains-de-mie": { perUnit: 420, typical: 219 }, brioches: { perUnit: 650, typical: 279 }, crepes: { perUnit: 800, typical: 249 }, pains: { perUnit: 600, typical: 229 } },
  "pates-riz-feculents": { pates: { perUnit: 240, typical: 149 }, riz: { perUnit: 330, typical: 219 }, "semoules-cereales": { perUnit: 320, typical: 199 }, "purees-legumineuses": { perUnit: 750, typical: 229 } },
  "conserves-epicerie-salee": { "sauces-tomate": { perUnit: 420, typical: 219 }, condiments: { perUnit: 700, typical: 229 }, conserves: { perUnit: 360, typical: 189 }, "poissons-conserve": { perUnit: 1450, typical: 289 }, bouillons: { perUnit: 2400, typical: 219 }, huiles: { perUnit: 800, typical: 549 }, epicerie: { perUnit: 700, typical: 249 } },
  "biscuits-gateaux": { biscuits: { perUnit: 820, typical: 219 }, gateaux: { perUnit: 1000, typical: 269 }, aperitif: { perUnit: 1250, typical: 239 }, "biscuits-gateaux": { perUnit: 900, typical: 239 } },
  "chocolats-confiseries": { tablettes: { perUnit: 1400, typical: 229 }, barres: { perUnit: 1600, typical: 289 }, bonbons: { perUnit: 1100, typical: 219 }, chocolats: { perUnit: 1500, typical: 279 } },
  "petit-dejeuner": { cereales: { perUnit: 800, typical: 329 }, tartiner: { perUnit: 900, typical: 349 }, "cafes-thes": { perUnit: 1900, typical: 449 }, "petit-dejeuner": { perUnit: 700, typical: 279 } },
  "boissons-eaux": { eaux: { perUnit: 40, typical: 99 }, sodas: { perUnit: 165, typical: 199 }, jus: { perUnit: 250, typical: 269 }, boissons: { perUnit: 210, typical: 229 } },
  surgeles: { glaces: { perUnit: 700, typical: 449 }, pizzas: { perUnit: 900, typical: 399 }, "frites-legumes": { perUnit: 320, typical: 279 }, surgeles: { perUnit: 1000, typical: 449 } },
  "hygiene-beaute": { douche: { perUnit: 1300, typical: 279 }, cheveux: { perUnit: 1400, typical: 379 }, dents: { perUnit: 3600, typical: 249 }, deodorants: { perUnit: 2400, typical: 329 }, soins: { perUnit: 3800, typical: 549 }, hygiene: { perUnit: 2000, typical: 399 } },
  "entretien-maison": { lessives: { perUnit: 520, typical: 899 }, vaisselle: { perUnit: 420, typical: 279 }, nettoyants: { perUnit: 420, typical: 329 }, entretien: { perUnit: 500, typical: 399 } },
  bebe: { repas: { perUnit: 900, typical: 259 }, laits: { perUnit: 2500, typical: 1899 }, soins: { perUnit: 2200, typical: 599 }, bebe: { perUnit: 1500, typical: 499 } },
  animaux: { chats: { perUnit: 620, typical: 549 }, chiens: { perUnit: 420, typical: 599 }, animaux: { perUnit: 550, typical: 549 } },
};

const MIN_CENTS = 35;
const MAX_CENTS = 3_990;

/** Nombre pseudo-aléatoire déterministe dans [0, 1[ dérivé d'une graine. */
export function seededUnit(seed: string): number {
  const hash = createHash("sha256").update(seed).digest();
  return hash.readUInt32BE(0) / 0x1_0000_0000;
}

/** Arrondi « façon magasin » : terminaisons en 9 (ou 5 pour les petits prix). */
export function roundToShelfPrice(cents: number): number {
  const clamped = Math.min(MAX_CENTS, Math.max(MIN_CENTS, Math.round(cents)));
  return Math.floor(clamped / 10) * 10 + 9;
}

export interface DemoPriceInput {
  barcode: string;
  category: CategorySlug;
  subshelf: string;
  netAmount: number | null;
  netUnit: "g" | "ml" | null;
  organic: boolean;
}

export function generateDemoPrice(input: DemoPriceInput): number {
  const scale = SCALES[input.category]?.[input.subshelf] ?? (input.category === "produits-bio" ? { perUnit: 1000, typical: 329 } : DEFAULT_SCALE);
  const jitter = 0.88 + seededUnit(`price:${input.barcode}`) * 0.24; // ±12 %
  let cents: number;
  if (input.netAmount && input.netUnit) {
    const amountInKgOrL = input.netAmount / 1000;
    // Les petits formats coûtent proportionnellement plus cher (dégressivité).
    const sizeFactor = amountInKgOrL < 0.15 ? 1.35 : amountInKgOrL > 2 ? 0.85 : 1;
    cents = scale.perUnit * amountInKgOrL * sizeFactor;
    // Garde-fou : un format improbable ne doit pas produire un prix absurde.
    cents = Math.min(Math.max(cents, scale.typical * 0.35), scale.typical * 4);
  } else {
    cents = scale.typical;
  }
  if (input.organic) cents *= 1.25;
  return roundToShelfPrice(cents * jitter);
}

/**
 * Promotion fictive déterministe (environ 1 produit sur 9), ou `null`.
 * Une remise en euros ne dépasse jamais 30 % du prix (sinon : pourcentage).
 */
export function generateDemoPromotion(barcode: string, priceCents?: number): (PromotionInput & { label: string }) | null {
  const roll = seededUnit(`promo:${barcode}`);
  if (roll > 0.11) return null;
  const pick = seededUnit(`promo-kind:${barcode}`);
  if (pick < 0.72) {
    const options = [10, 15, 20, 20, 25, 30, 34, 40];
    const value = options[Math.floor(seededUnit(`promo-value:${barcode}`) * options.length)]!;
    return { kind: "percent", value, label: `-${value} %` };
  }
  const amounts = [30, 40, 50, 60, 80, 100];
  const value = amounts[Math.floor(seededUnit(`promo-value:${barcode}`) * amounts.length)]!;
  if (priceCents !== undefined && value > priceCents * 0.3) return { kind: "percent", value: 20, label: "-20 %" };
  return { kind: "amount", value, label: `-${(value / 100).toFixed(2).replace(".", ",")} €` };
}
