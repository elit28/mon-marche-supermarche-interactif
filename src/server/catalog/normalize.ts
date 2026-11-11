/**
 * Normalisation et contrôle qualité des fiches Open Food Facts.
 *
 * Toutes les fonctions de ce module sont pures (aucune I/O) afin d'être
 * testées unitairement. Règle d'or : on nettoie la présentation (espaces,
 * casse, quantité répétée dans le nom) mais on n'invente JAMAIS une donnée.
 */
import {
  CATEGORY_BY_SLUG,
  pickSubshelf,
  type CategorySlug,
} from "../../lib/catalog/categories";
import { normalizeSearchText } from "../../lib/search-text";
import type { OffProduct, OffSite } from "./off-types";

/* -------------------------------------------------------------------------- */
/* Codes-barres                                                               */
/* -------------------------------------------------------------------------- */

/** Vérifie la clé de contrôle d'un GTIN (EAN-8, UPC-A, EAN-13, GTIN-14). */
export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code)) return false;
  if (![8, 12, 13, 14].includes(code.length)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  let sum = 0;
  let weight = 3;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += digits[i]! * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * Les EAN-13 commençant par 2 (20 à 29) sont des numéros à circulation
 * restreinte (produits pesés en magasin, codes internes) : ils n'identifient
 * pas un produit de manière universelle.
 */
export function isRestrictedCirculationCode(code: string): boolean {
  return code.length === 13 && code.startsWith("2");
}

/**
 * Préfixes GS1 des marques de distributeurs (Carrefour, Leclerc, Intermarché,
 * Auchan, Système U, Casino, Monoprix, Picard, Cora, Lidl, Aldi, Kaufland) :
 * exclus, car un prix fictif ne doit pas pouvoir être attribué à une enseigne.
 */
export const RETAILER_GS1_PREFIXES = [
  "3560070", "3560071", "3270190", "3245390", "3245412", "3245413", "3245414",
  "356470", "3250390", "3250391", "3250392", "3250393", "3596710", "3596780",
  "325622", "3256230", "336895", "324541", "3222470", "3222471", "3222472", "3222473",
  "3350030", "3270160", "3257980", "3257981", "4056489", "4335619", "4061458", "4061459",
  "4047247", "4337185",
];

/** Produits destinés à d'autres marchés, parfois marqués à tort « vendus en France ». */
export const FOREIGN_MARKET_PREFIXES = ["611", "613", "619", "6223", "628", "629"];

export function isRetailerBarcode(code: string): boolean {
  // EAN-8 commençant par 2 : codes internes d'enseigne (ex. marques propres de hard-discount).
  if (code.length === 8 && code.startsWith("2")) return true;
  return RETAILER_GS1_PREFIXES.some((prefix) => code.startsWith(prefix));
}

export function isForeignMarketBarcode(code: string): boolean {
  return code.length === 13 && FOREIGN_MARKET_PREFIXES.some((prefix) => code.startsWith(prefix));
}

/** Normalise un code : chiffres uniquement, UPC-A (12) complété en EAN-13. */
export function normalizeBarcode(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12) return `0${digits}`;
  return digits;
}

/* -------------------------------------------------------------------------- */
/* Marques                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Marques de distributeurs (MDD) exclues : MON MARCHÉ affiche des prix
 * fictifs, il ne faut pas laisser croire qu'il s'agit des prix d'une enseigne.
 */
export const RETAILER_BRAND_SLUGS = new Set([
  "carrefour", "carrefour-bio", "carrefour-classic", "carrefour-extra", "carrefour-sensation",
  "carrefour-baby", "carrefour-kids", "carrefour-original", "carrefour-selection", "carrefour-veggie",
  "simpl", "reflets-de-france", "auchan", "auchan-bio", "auchan-gourmet", "mmm", "pouce",
  "leclerc", "e-leclerc", "marque-repere", "eco-plus", "bio-village", "nos-regions-ont-du-talent",
  "jafaden", "entracte", "chabrior", "paturages", "monique-ranou", "saint-eloi", "top-budget",
  "netto", "les-mousquetaires", "intermarche", "u", "u-bio", "u-saveurs", "systeme-u", "super-u",
  "monoprix", "monoprix-bio", "monoprix-gourmet", "casino", "casino-bio", "franprix",
  "leader-price", "lidl", "milbona", "cien", "cottage", "dentalux", "w5", "envia", "deluxe",
  "aldi", "picard", "cora", "match", "belle-france", "grand-jury", "delisse", "tous-les-jours",
  "carrefour-bon-app", "auchan-baby", "u-tout-petits", "bonne-journee", "ruffle", "chef-select",
  "alesto", "snack-day", "crownfield", "freeway", "solevita", "golden-bridge", "fin-carre",
  "favorina", "nixe", "gourmet-finest-cuisine", "lupilu", "formil", "tandil", "saint-albray-lidl",
  "dia", "ed", "spar", "vival", "biocoop", "naturalia", "la-vie-claire", "bio-c-bon",
  "alesto-selection", "trader-joe-s", "trader-joes", "daco-bello", "eco", "prix-malin", "saint-alby",
  "notre-jardin", "comptoir-du-grain", "odyssee", "paquito", "regain", "apta", "salade-go",
  "tous-les-jours", "nos-regions-ont-du-talent", "mcennedy", "kania", "chef-select", "milbona",
]);

export function brandSlugify(brand: string): string {
  return normalizeSearchText(brand).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isShouting(value: string): boolean {
  const letters = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  if (letters.length <= 3) return false;
  const upper = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, "").length;
  return upper / letters.length >= 0.85;
}

/** Casse « titre » pour une marque écrite tout en majuscules (BARILLA → Barilla). */
function smartCase(value: string): string {
  if (!isShouting(value)) return value;
  return value
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s\-'’&./])([a-zà-öø-ÿ])/g, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase("fr-FR"));
}

/** Casse « phrase » pour un nom écrit tout en majuscules (LASAGNE ALL'UOVO → Lasagne all'uovo). */
function sentenceCase(value: string): string {
  if (!isShouting(value)) return value;
  const lower = value.toLocaleLowerCase("fr-FR");
  return lower.charAt(0).toLocaleUpperCase("fr-FR") + lower.slice(1);
}

/** Extrait la marque principale (première marque déclarée), casse corrigée. */
export function cleanBrand(brands: string | undefined): string | null {
  if (!brands) return null;
  const first = brands
    .split(",")
    .map((b) => b.trim())
    .find((b) => b.length > 0);
  if (!first) return null;
  const cleaned = smartCase(first.replace(/\s+/g, " "));
  if (cleaned.length < 2 || /^\d+$/.test(cleaned)) return null;
  return cleaned;
}

/* -------------------------------------------------------------------------- */
/* Noms                                                                       */
/* -------------------------------------------------------------------------- */

const QUANTITY_SUFFIX =
  /[\s,\-–(]*\b\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?(?:kg|g|gr|grs|grammes?|mg|l|cl|ml|litres?)\b\.?\)?\s*$/iu;

/**
 * Nettoie le nom commercial : espaces, casse « TOUT EN MAJUSCULES », marque
 * répétée en préfixe et quantité répétée en suffixe (affichée à part).
 */
export function cleanProductName(rawName: string, brand: string | null): string {
  let name = rawName.replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").trim();
  name = sentenceCase(name);

  if (brand) {
    const normalizedBrand = normalizeSearchText(brand);
    const normalizedName = normalizeSearchText(name);
    if (normalizedName.startsWith(`${normalizedBrand} `)) {
      const rest = name.slice(brand.length).replace(/^[\s\-–:,]+/, "");
      if (rest.length >= 3) name = rest;
    }
  }

  for (let i = 0; i < 2; i++) {
    const stripped = name.replace(QUANTITY_SUFFIX, "").trim();
    if (stripped.length >= 3) name = stripped;
  }

  name = name.replace(/[\s,\-–:]+$/, "").trim();
  if (name.length > 0) name = name[0]!.toLocaleUpperCase("fr-FR") + name.slice(1);
  return name;
}

/* -------------------------------------------------------------------------- */
/* Quantités                                                                  */
/* -------------------------------------------------------------------------- */

export type NetUnit = "g" | "ml";

export interface ParsedQuantity {
  /** Libellé lisible, ex. « 400 g », « 6 x 1,5 L ». */
  label: string | null;
  /** Quantité nette totale en grammes ou millilitres, si calculable. */
  netAmount: number | null;
  netUnit: NetUnit | null;
}

const UNIT_FACTORS: Record<string, { unit: NetUnit; factor: number }> = {
  mg: { unit: "g", factor: 0.001 },
  g: { unit: "g", factor: 1 },
  gr: { unit: "g", factor: 1 },
  grs: { unit: "g", factor: 1 },
  gramme: { unit: "g", factor: 1 },
  grammes: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  ml: { unit: "ml", factor: 1 },
  cl: { unit: "ml", factor: 10 },
  dl: { unit: "ml", factor: 100 },
  l: { unit: "ml", factor: 1000 },
  litre: { unit: "ml", factor: 1000 },
  litres: { unit: "ml", factor: 1000 },
};

function toNumber(value: string): number {
  return Number.parseFloat(value.replace(",", "."));
}

export function cleanQuantityLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  let label = raw
    .replace(/\s*[℮e]\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!label || !/\d/.test(label)) return null;
  // « 400g » -> « 400 g », « 1.5L » -> « 1,5 L »
  label = label.replace(/(\d)\s*(kg|g|mg|ml|cl|l)\b/giu, (_m, d: string, u: string) => {
    const unit = u.toLowerCase() === "l" ? "L" : u.toLowerCase();
    return `${d} ${unit}`;
  });
  label = label.replace(/(\d)\.(\d)/g, "$1,$2");
  label = label.replace(/\s*[xX×]\s*/g, " x ");
  if (label.length > 40) return null;
  return label;
}

export function parseQuantity(product: Pick<OffProduct, "quantity" | "product_quantity" | "product_quantity_unit">): ParsedQuantity {
  const label = cleanQuantityLabel(product.quantity);

  // 1. Valeur calculée par Open Food Facts quand elle existe.
  const pq = typeof product.product_quantity === "string" ? toNumber(product.product_quantity) : product.product_quantity;
  const pqUnit = product.product_quantity_unit?.toLowerCase();
  if (pq && Number.isFinite(pq) && pq > 0 && pqUnit && UNIT_FACTORS[pqUnit]) {
    const { unit, factor } = UNIT_FACTORS[pqUnit]!;
    return { label, netAmount: round3(pq * factor), netUnit: unit };
  }

  // 2. Sinon, analyse du libellé (« 6 x 33 cl », « 1,5 L », « 500g »).
  const text = (product.quantity ?? "").toLowerCase().replace(/[℮]/gu, "");
  const multi = text.match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|mg|l|cl|ml)\b/);
  if (multi) {
    const count = Number.parseInt(multi[1]!, 10);
    const { unit, factor } = UNIT_FACTORS[multi[3]!]!;
    return { label, netAmount: round3(count * toNumber(multi[2]!) * factor), netUnit: unit };
  }
  const single = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|mg|l|cl|ml)\b/);
  if (single) {
    const { unit, factor } = UNIT_FACTORS[single[2]!]!;
    return { label, netAmount: round3(toNumber(single[1]!) * factor), netUnit: unit };
  }
  return { label, netAmount: null, netUnit: null };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/* -------------------------------------------------------------------------- */
/* Catégories                                                                 */
/* -------------------------------------------------------------------------- */

export const EXCLUDED_TAGS = new Set([
  "en:alcoholic-beverages", "en:wines", "en:beers", "en:spirits", "en:ciders", "en:liqueurs",
  "en:champagnes", "en:aperitif", "en:dietary-supplements", "en:food-supplements",
  "en:bodybuilding-supplements", "en:tobacco-products", "en:cigarettes", "en:incorrect-product-type",
  "en:medicines", "en:books",
]);

export const ORGANIC_LABELS = new Set([
  "en:organic", "en:eu-organic", "fr:ab-agriculture-biologique", "en:fr-bio-01", "en:ab-agriculture-biologique",
]);

export function isOrganic(labels: readonly string[] | undefined): boolean {
  return (labels ?? []).some((l) => ORGANIC_LABELS.has(l));
}

interface Rule {
  slug: CategorySlug;
  tags: string[];
}

/** Ordre d'évaluation : du plus spécifique au plus général. */
const FOOD_RULES: Rule[] = [
  { slug: "bebe", tags: ["en:baby-foods", "en:baby-milks", "en:infant-formulas", "en:baby-cereals", "en:baby-meals", "en:follow-on-milks", "en:growing-up-milks", "en:baby-desserts"] },
  { slug: "animaux", tags: ["en:pet-food", "en:dog-food", "en:cat-food", "en:dog-and-cat-food"] },
  // Signaux « surgelé » forts (glaces, pizzas, frites) : prioritaires.
  { slug: "surgeles", tags: ["en:ice-creams", "en:frozen-desserts", "en:ice-cream-tubs", "en:ice-cream-bars", "en:sorbets", "en:frozen-pizzas", "en:frozen-fries"] },
  { slug: "fromages", tags: ["en:cheeses"] },
  { slug: "conserves-epicerie-salee", tags: ["en:canned-fishes", "en:canned-foods", "en:canned-vegetables", "en:canned-meals", "en:canned-legumes"] },
  { slug: "poissons-produits-mer", tags: ["en:smoked-salmons", "en:smoked-fishes", "en:surimi", "en:seafood", "en:fishes", "en:shrimps", "en:crustaceans"] },
  { slug: "viandes-charcuterie", tags: ["en:meats", "en:prepared-meats", "en:hams", "en:sausages", "en:poultries", "en:bacons", "en:dry-sausages", "en:salamis"] },
  { slug: "pates-riz-feculents", tags: ["en:pastas", "en:rices", "en:semolinas", "en:couscous", "en:mashed-potatoes", "en:dehydrated-mashed-potatoes", "en:lentils", "en:pulses", "en:quinoa", "en:cereal-grains", "en:gnocchi"] },
  { slug: "petit-dejeuner", tags: ["en:breakfast-cereals", "en:mueslis", "en:sweet-spreads", "en:hazelnut-spreads", "en:jams", "en:honeys", "en:fruit-preserves", "en:coffees", "en:teas", "en:herbal-teas", "en:cocoa-powders", "en:chocolate-powders", "en:instant-breakfast-drinks", "en:breakfast-biscuits", "en:compotes"] },
  { slug: "boulangerie-patisserie", tags: ["en:breads", "en:sandwich-breads", "en:sliced-breads", "en:viennoiseries", "en:brioches", "en:croissants", "en:crepes", "en:pancakes", "en:crepes-and-galettes", "en:rusks", "en:toasts", "en:special-breads"] },
  { slug: "biscuits-gateaux", tags: ["en:biscuits", "en:cakes", "en:biscuits-and-cakes", "en:salty-snacks", "en:crisps", "en:chips-and-fries", "en:appetizers", "en:crackers", "en:popcorn", "en:madeleines"] },
  { slug: "chocolats-confiseries", tags: ["en:chocolates", "en:candies", "en:confectioneries", "en:chocolate-candies", "en:chocolate-bars"] },
  { slug: "produits-laitiers-oeufs", tags: ["en:dairies", "en:milks", "en:yogurts", "en:butters", "en:creams", "en:dairy-desserts", "en:eggs", "en:plant-based-milk-alternatives", "en:fermented-milk-products"] },
  { slug: "boissons-eaux", tags: ["en:beverages", "en:waters", "en:sodas", "en:fruit-juices", "en:syrups", "en:iced-teas"] },
  { slug: "conserves-epicerie-salee", tags: ["en:sauces", "en:condiments", "en:mustards", "en:soups", "en:broths", "en:bouillon-cubes", "en:spices", "en:salts", "en:vegetable-oils", "en:vinegars", "en:olives", "en:pickles", "en:groceries"] },
  // Le tag générique « surgelés » est souvent ajouté à tort : il ne prime pas sur les rayons secs.
  { slug: "surgeles", tags: ["en:frozen-foods", "en:frozen-vegetables", "en:frozen-fishes", "en:frozen-ready-made-meals"] },
  { slug: "fruits-legumes", tags: ["en:fresh-fruits", "en:fresh-vegetables", "en:fruits", "en:vegetables", "en:salads", "en:dried-fruits", "en:nuts", "en:potatoes"] },
];

const BEAUTY_BABY_TAGS = ["en:baby-care", "fr:bebe", "en:baby", "en:baby-hygiene", "en:baby-wipes"];
const BABY_BRANDS = new Set(["mustela", "mixa-bebe", "pampers", "huggies", "lotus-baby", "love-green", "joone", "biolane", "cadum"]);
const CLEANING_BRANDS = new Set([
  "ariel", "skip", "dash", "mir", "cif", "ajax", "sanytol", "le-chat", "persil", "st-marc", "harpic", "finish", "sun", "paic",
  "l-arbre-vert", "la-croix", "soupline", "lenor", "febreze", "air-wick", "x-tra", "omo", "destop", "rainett", "briochin",
  "maison-verte", "the-pink-stuff", "stardrops", "vanish", "cillit-bang", "canard", "wc-net", "starwax", "etamine-du-lys",
  "ecover", "method", "fairy", "dreft", "spontex", "scotch-brite", "calgon", "carolin", "baranne", "eau-ecarlate", "k2r", "saint-marc",
]);
const PET_BRANDS = new Set([
  "purina", "purina-one", "felix", "gourmet", "whiskas", "pedigree", "sheba", "friskies", "royal-canin", "ultima", "perfect-fit",
  "cesar", "canigou", "frolic", "fido", "catisfactions", "dreamies", "markies", "applaws", "hill-s", "advance", "almo-nature",
]);
const PET_TAGS = ["en:pet-food", "en:dog-food", "en:cat-food", "en:dog-and-cat-food", "en:dry-pet-food", "en:wet-pet-food", "en:cat-treats", "en:dog-treats"];
const CLEANING_TAGS = [
  "en:household-chemicals", "en:detergents", "en:liquid-detergent", "en:laundry-detergents", "en:household-cleaning-products",
  "en:household-cleaning-supplies", "en:dishwashing-liquids", "en:dishwasher-tablets", "en:disinfectants", "en:cleaning-products",
  "en:fabric-softeners", "en:multi-purpose-cleaners", "en:household-supplies",
];

export interface CategoryInput {
  site: OffSite;
  tags: readonly string[];
  brandSlug: string | null;
  /** Rayon visé par la requête de découverte (indice, jamais prioritaire sur les règles). */
  hint?: CategorySlug;
  organic: boolean;
}

/** Associe une fiche à un rayon local, ou `null` si aucun rayon cohérent. */
export function mapCategory(input: CategoryInput): CategorySlug | null {
  const tags = new Set(input.tags);
  if ([...tags].some((t) => EXCLUDED_TAGS.has(t))) return null;

  if (input.site === "petfood") {
    // Base « animaux » : on exige une catégorie ou une marque d'alimentation animale.
    return PET_TAGS.some((t) => tags.has(t)) || (input.brandSlug && PET_BRANDS.has(input.brandSlug)) ? "animaux" : null;
  }

  if (input.site === "beauty") {
    if (BEAUTY_BABY_TAGS.some((t) => tags.has(t)) || (input.brandSlug && BABY_BRANDS.has(input.brandSlug))) return "bebe";
    return "hygiene-beaute";
  }

  if (input.site === "products") {
    if (tags.has("en:diapers") || (input.brandSlug && BABY_BRANDS.has(input.brandSlug))) return "bebe";
    if (CLEANING_TAGS.some((t) => tags.has(t))) return "entretien-maison";
    if (input.brandSlug && CLEANING_BRANDS.has(input.brandSlug)) return "entretien-maison";
    return null;
  }

  // Rayon bio : uniquement pour les produits dont le label bio est vérifié.
  if (input.hint === "produits-bio" && input.organic) return "produits-bio";

  for (const rule of FOOD_RULES) {
    if (rule.tags.some((t) => tags.has(t))) return rule.slug;
  }
  if (input.hint && input.hint !== "produits-bio" && input.hint !== "hygiene-beaute" && input.hint !== "entretien-maison") {
    return input.hint;
  }
  return null;
}

export function mapSubshelf(category: CategorySlug, tags: readonly string[]): string {
  const def = CATEGORY_BY_SLUG.get(category)!;
  return pickSubshelf(def, tags);
}

/* -------------------------------------------------------------------------- */
/* Images                                                                     */
/* -------------------------------------------------------------------------- */

export const ALLOWED_IMAGE_HOSTS = new Set([
  "images.openfoodfacts.org",
  "static.openfoodfacts.org",
  "images.openbeautyfacts.org",
  "static.openbeautyfacts.org",
  "images.openproductsfacts.org",
  "static.openproductsfacts.org",
  "images.openpetfoodfacts.org",
  "static.openpetfoodfacts.org",
]);

/** Refuse toute URL d'image hors des domaines officiels, ou non HTTPS. */
export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(parsed.hostname) && /\.(jpe?g|png|webp)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

/** URL de la photo de face, en privilégiant l'emballage français. */
export function pickFrontImageUrl(product: OffProduct): string | null {
  const display = product.selected_images?.front?.display ?? {};
  const candidates = [display.fr, product.lang ? display[product.lang] : undefined, product.image_front_url, ...Object.values(display)];
  for (const url of candidates) {
    if (url && isAllowedImageUrl(url)) return url;
  }
  return null;
}

/** Version pleine résolution d'une image sélectionnée (`.400.jpg` → `.full.jpg`). */
export function toFullImageUrl(url: string): string {
  return url.replace(/\.400\.jpg$/i, ".full.jpg");
}

/** Clé de l'image de face sélectionnée dans `images` (ex. « front_fr »). */
export function frontImageKey(url: string): string | null {
  const match = url.match(/\/(front_[a-z]{2})\.\d+\.\d+\.jpg$/i);
  return match ? match[1]! : null;
}

/* -------------------------------------------------------------------------- */
/* Fiche normalisée                                                           */
/* -------------------------------------------------------------------------- */

export interface NormalizedNutrition {
  per: "100g" | "100ml";
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  proteins: number | null;
  salt: number | null;
}

export interface NormalizedProduct {
  barcode: string;
  site: OffSite;
  name: string;
  rawName: string;
  genericName: string | null;
  brand: string | null;
  brandSlug: string | null;
  rawBrands: string | null;
  quantityLabel: string | null;
  netAmount: number | null;
  netUnit: NetUnit | null;
  category: CategorySlug;
  subshelf: string;
  categoriesTags: string[];
  labelsTags: string[];
  organic: boolean;
  nutriscoreGrade: "a" | "b" | "c" | "d" | "e" | null;
  novaGroup: number | null;
  ingredientsText: string | null;
  allergens: string[];
  traces: string[];
  nutrition: NormalizedNutrition | null;
  servingSize: string | null;
  imageUrl: string;
  imageUploader: string | null;
  popularity: number;
  lastModifiedAt: number | null;
}

export type RejectionReason =
  | "invalid_barcode"
  | "restricted_barcode"
  | "missing_name"
  | "name_is_brand"
  | "missing_brand"
  | "retailer_brand"
  | "missing_image"
  | "not_sold_in_france"
  | "excluded_category"
  | "no_category";

export type NormalizeResult =
  | { ok: true; product: NormalizedProduct }
  | { ok: false; reason: RejectionReason };

function num(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function cleanTagList(tags: readonly string[] | undefined): string[] {
  return [...new Set((tags ?? []).filter((t) => /^[a-z]{2}:[\p{L}\p{N}-]+$/u.test(t)))];
}

function cleanText(text: string | undefined, max = 4000): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 3) return null;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function normalizeNutrition(product: OffProduct, site: OffSite): NormalizedNutrition | null {
  if (site !== "food" && site !== "petfood") return null;
  const n = product.nutriments;
  if (!n) return null;
  const nutrition: NormalizedNutrition = {
    per: product.nutrition_data_per === "100ml" ? "100ml" : "100g",
    energyKcal: num(n["energy-kcal_100g"]),
    fat: num(n.fat_100g),
    saturatedFat: num(n["saturated-fat_100g"]),
    carbohydrates: num(n.carbohydrates_100g),
    sugars: num(n.sugars_100g),
    fiber: num(n.fiber_100g),
    proteins: num(n.proteins_100g),
    salt: num(n.salt_100g),
  };
  const filled = Object.entries(nutrition).filter(([k, v]) => k !== "per" && v !== null).length;
  return filled >= 3 ? nutrition : null;
}

export function normalizeOffProduct(product: OffProduct, site: OffSite, hint?: CategorySlug): NormalizeResult {
  const barcode = normalizeBarcode(product.code ?? "");
  if (!isValidGtin(barcode)) return { ok: false, reason: "invalid_barcode" };
  if (isRestrictedCirculationCode(barcode)) return { ok: false, reason: "restricted_barcode" };
  if (isRetailerBarcode(barcode)) return { ok: false, reason: "retailer_brand" };
  if (isForeignMarketBarcode(barcode)) return { ok: false, reason: "not_sold_in_france" };

  const countries = product.countries_tags ?? [];
  if (countries.length > 0 && !countries.includes("en:france")) return { ok: false, reason: "not_sold_in_france" };

  const brand = cleanBrand(product.brands);
  const brandSlug = product.brands_tags?.[0] ?? (brand ? brandSlugify(brand) : null);
  if (brandSlug && (RETAILER_BRAND_SLUGS.has(brandSlug) || (brand && RETAILER_BRAND_SLUGS.has(brandSlugify(brand))))) {
    return { ok: false, reason: "retailer_brand" };
  }

  const rawName = (product.product_name_fr || product.product_name || "").trim();
  if (rawName.length < 2 || /^\d+$/.test(rawName)) return { ok: false, reason: "missing_name" };
  // Nom en alphabet latin exigé (catalogue destiné au public français).
  const letters = rawName.match(/\p{L}/gu)?.length ?? 0;
  const latinLetters = rawName.match(/\p{Script=Latin}/gu)?.length ?? 0;
  if (latinLetters < 2 || latinLetters / Math.max(letters, 1) < 0.8) return { ok: false, reason: "missing_name" };
  const name = cleanProductName(rawName, brand);
  if (name.length < 2) return { ok: false, reason: "missing_name" };
  if (brand && normalizeSearchText(name) === normalizeSearchText(brand) && (site !== "food" || name.length < 4)) {
    return { ok: false, reason: "name_is_brand" };
  }

  const tags = cleanTagList(product.categories_tags);
  const labels = cleanTagList(product.labels_tags);
  if (tags.some((t) => EXCLUDED_TAGS.has(t))) return { ok: false, reason: "excluded_category" };

  const organic = isOrganic(labels);
  const category = mapCategory({ site, tags, brandSlug, hint, organic });
  if (!category) return { ok: false, reason: "no_category" };

  if (!brand && category !== "fruits-legumes") return { ok: false, reason: "missing_brand" };

  const imageUrl = pickFrontImageUrl(product);
  if (!imageUrl) return { ok: false, reason: "missing_image" };
  const key = frontImageKey(imageUrl);
  const uploader = key ? (product.images?.[key]?.uploader ?? null) : null;

  const quantity = parseQuantity(product);
  const grade = product.nutriscore_grade?.toLowerCase();
  const nutriscoreGrade = grade && ["a", "b", "c", "d", "e"].includes(grade) ? (grade as NormalizedProduct["nutriscoreGrade"]) : null;

  return {
    ok: true,
    product: {
      barcode,
      site,
      name,
      rawName,
      genericName: cleanText(product.generic_name_fr, 200),
      brand,
      brandSlug: brand ? brandSlugify(brand) : null,
      rawBrands: product.brands ?? null,
      quantityLabel: quantity.label,
      netAmount: quantity.netAmount,
      netUnit: quantity.netUnit,
      category,
      subshelf: mapSubshelf(category, tags),
      categoriesTags: tags,
      labelsTags: labels,
      organic,
      nutriscoreGrade: site === "food" ? nutriscoreGrade : null,
      novaGroup: site === "food" && product.nova_group && product.nova_group >= 1 && product.nova_group <= 4 ? product.nova_group : null,
      ingredientsText: cleanText(product.ingredients_text_fr || (product.lang === "fr" ? product.ingredients_text : undefined)),
      allergens: cleanTagList(product.allergens_tags),
      traces: cleanTagList(product.traces_tags),
      nutrition: normalizeNutrition(product, site),
      servingSize: cleanText(product.serving_size, 60),
      imageUrl,
      imageUploader: uploader,
      popularity: product.unique_scans_n ?? 0,
      lastModifiedAt: product.last_modified_t ?? null,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Déduplication                                                              */
/* -------------------------------------------------------------------------- */

/** Clé de quasi-doublon : même marque, même nom et même format. */
export function duplicateKey(p: Pick<NormalizedProduct, "brandSlug" | "name" | "quantityLabel">): string {
  return [p.brandSlug ?? "", normalizeSearchText(p.name).replace(/[^a-z0-9]/g, ""), normalizeSearchText(p.quantityLabel ?? "").replace(/\s/g, "")].join("|");
}

/**
 * Élimine les doublons exacts (même code-barres) et les quasi-doublons
 * (même marque + nom + format, ex. variantes d'emballage) en conservant la
 * fiche la plus consultée.
 */
export function dedupeProducts<T extends Pick<NormalizedProduct, "barcode" | "brandSlug" | "name" | "quantityLabel" | "popularity">>(
  products: readonly T[],
): { kept: T[]; removed: Array<{ product: T; duplicateOf: string }> } {
  const sorted = [...products].sort((a, b) => b.popularity - a.popularity || a.barcode.localeCompare(b.barcode));
  const byCode = new Map<string, T>();
  const byKey = new Map<string, T>();
  const removed: Array<{ product: T; duplicateOf: string }> = [];
  for (const p of sorted) {
    const existingCode = byCode.get(p.barcode);
    if (existingCode) {
      removed.push({ product: p, duplicateOf: existingCode.barcode });
      continue;
    }
    const key = duplicateKey(p);
    const existingKey = byKey.get(key);
    if (existingKey) {
      removed.push({ product: p, duplicateOf: existingKey.barcode });
      continue;
    }
    byCode.set(p.barcode, p);
    byKey.set(key, p);
  }
  return { kept: [...byCode.values()], removed };
}
