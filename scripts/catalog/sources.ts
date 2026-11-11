/**
 * Requêtes de découverte du catalogue initial.
 *
 * Chaque requête interroge l'API de recherche v2 d'une base Open Food Facts
 * (produits vendus en France, triés par popularité). Les marques citées ici
 * ne sont qu'un point de départ : seules les fiches réellement existantes et
 * conformes aux critères qualité sont importées.
 */
import type { CategorySlug } from "../../src/lib/catalog/categories";
import type { OffSite } from "../../src/server/catalog/off-types";

export interface DiscoveryQuery {
  site: OffSite;
  /** Rayon visé (indice pour la cartographie). */
  category: CategorySlug;
  /** Filtre par catégorie OFF (taxonomie). */
  tag?: string;
  /** Filtre par marque (slug OFF, plusieurs marques séparées par « | »). */
  brand?: string;
  /** Filtre par label (ex. en:organic). */
  label?: string;
  /** Nombre maximal de candidats retenus pour cette requête. */
  take: number;
  pageSize?: number;
  /** Nombre de pages de résultats à parcourir (100 produits par page). */
  pages?: number;
}

/** Nombre de produits visé par rayon (le pipeline sur-échantillonne puis sélectionne). */
export const CATEGORY_TARGETS: Record<CategorySlug, number> = {
  "fruits-legumes": 30,
  "produits-laitiers-oeufs": 40,
  fromages: 35,
  "viandes-charcuterie": 32,
  "poissons-produits-mer": 25,
  "boulangerie-patisserie": 28,
  "pates-riz-feculents": 36,
  "conserves-epicerie-salee": 45,
  "biscuits-gateaux": 45,
  "chocolats-confiseries": 36,
  "petit-dejeuner": 45,
  "boissons-eaux": 45,
  surgeles: 30,
  "produits-bio": 30,
  "hygiene-beaute": 36,
  "entretien-maison": 28,
  bebe: 26,
  animaux: 26,
};

const q = (category: CategorySlug, site: OffSite, spec: Omit<DiscoveryQuery, "category" | "site" | "take"> & { take?: number }): DiscoveryQuery => ({
  category,
  site,
  take: spec.take ?? 30,
  ...spec,
});

/** Requêtes par catégorie OFF : deux pages, tous les produits conformes sont candidats. */
const tags = (category: CategorySlug, site: OffSite, list: string[], _take = 30) => list.map((tag) => q(category, site, { tag, take: 100, pages: 2 }));
/** Regroupe les marques par 3 (syntaxe OU « a|b|c » de l'API v2) pour limiter le nombre d'appels. */
const brands = (category: CategorySlug, site: OffSite, list: string[], take = 12) => {
  const chunks: string[][] = [];
  for (let i = 0; i < list.length; i += 3) chunks.push(list.slice(i, i + 3));
  return chunks.map((chunk) => q(category, site, { brand: chunk.join("|"), take: Math.max(take * chunk.length, 40), pageSize: 100 }));
};

export const DISCOVERY_QUERIES: DiscoveryQuery[] = [
  // 1. Fruits et légumes (produits frais conditionnés, avec code-barres)
  ...tags("fruits-legumes", "food", ["en:fresh-fruits", "en:fresh-vegetables", "en:salads", "en:dried-fruits"], 40),
  ...brands("fruits-legumes", "food", ["florette", "bonduelle", "chiquita", "pink-lady", "zespri", "vitamont"], 10),

  // 2. Produits laitiers et œufs
  ...tags("produits-laitiers-oeufs", "food", ["en:yogurts", "en:milks", "en:butters", "en:eggs", "en:dairy-desserts", "en:creams"], 30),
  ...brands("produits-laitiers-oeufs", "food", ["danone", "yoplait", "la-laitiere", "lactel", "candia", "elle-vire", "president", "activia", "danette", "alpro"], 10),

  // 3. Fromages
  ...tags("fromages", "food", ["en:cheeses"], 80),
  ...brands("fromages", "food", ["president", "babybel", "kiri", "boursin", "caprice-des-dieux", "societe", "entremont", "la-vache-qui-rit", "saint-moret", "galbani", "coeur-de-lion", "st-moret"], 8),

  // 4. Viandes et charcuterie
  ...tags("viandes-charcuterie", "food", ["en:hams", "en:sausages", "en:dry-sausages", "en:poultries", "en:bacons"], 30),
  ...brands("viandes-charcuterie", "food", ["herta", "fleury-michon", "le-gaulois", "pere-dodu", "justin-bridou", "aoste", "madrange", "cochonou", "charal"], 8),

  // 5. Poissons et produits de la mer
  ...tags("poissons-produits-mer", "food", ["en:smoked-salmons", "en:surimi", "en:shrimps", "en:fishes"], 30),
  ...brands("poissons-produits-mer", "food", ["labeyrie", "delpierre", "guyader", "coraya", "fleury-michon"], 8),

  // 6. Boulangerie et pâtisserie
  ...tags("boulangerie-patisserie", "food", ["en:sandwich-breads", "en:brioches", "en:viennoiseries", "en:crepes", "en:breads"], 30),
  ...brands("boulangerie-patisserie", "food", ["harrys", "pasquier", "brioche-pasquier", "jacquet", "la-boulangere", "krisprolls"], 10),

  // 7. Pâtes, riz et féculents
  ...tags("pates-riz-feculents", "food", ["en:pastas", "en:rices", "en:semolinas", "en:mashed-potatoes", "en:lentils"], 30),
  ...brands("pates-riz-feculents", "food", ["barilla", "panzani", "lustucru", "taureau-aile", "ben-s-original", "uncle-ben-s", "tipiak", "rivoire-et-carret", "mousline"], 10),

  // 8. Conserves et épicerie salée
  ...tags("conserves-epicerie-salee", "food", ["en:mustards", "en:mayonnaises", "en:ketchup", "en:tomato-sauces", "en:canned-vegetables", "en:canned-fishes", "en:bouillon-cubes", "en:olive-oils", "en:soups"], 20),
  ...brands("conserves-epicerie-salee", "food", ["heinz", "maille", "amora", "knorr", "maggi", "benedicta", "mutti", "bonduelle", "d-aucy", "cassegrain", "petit-navire", "saupiquet", "puget", "lesieur", "william-saurin"], 8),

  // 9. Biscuits et gâteaux (et apéritif)
  ...tags("biscuits-gateaux", "food", ["en:biscuits", "en:cakes", "en:crisps", "en:crackers"], 30),
  ...brands("biscuits-gateaux", "food", ["oreo", "prince", "bn", "granola", "belin", "lay-s", "pringles", "michel-et-augustin", "st-michel", "brossard", "lu", "pepito", "tuc", "bret-s", "vico", "mikado"], 8),

  // 10. Chocolats et confiseries
  ...tags("chocolats-confiseries", "food", ["en:chocolates", "en:candies"], 40),
  ...brands("chocolats-confiseries", "food", ["milka", "cote-d-or", "lindt", "kinder", "nestle-dessert", "poulain", "haribo", "carambar", "kitkat", "twix", "m-m-s", "ferrero-rocher", "lutti", "galak"], 6),

  // 11. Petit-déjeuner
  ...tags("petit-dejeuner", "food", ["en:breakfast-cereals", "en:sweet-spreads", "en:jams", "en:honeys", "en:coffees", "en:teas", "en:cocoa-powders"], 25),
  ...brands("petit-dejeuner", "food", ["nutella", "bonne-maman", "kellogg-s", "nestle", "bjorg", "harrys", "lu", "carte-noire", "l-or", "nescafe", "lipton", "banania", "nesquik", "ricore", "st-dalfour", "lu-petit-dejeuner", "chocapic", "lion"], 8),

  // 12. Boissons et eaux (sans alcool)
  ...tags("boissons-eaux", "food", ["en:waters", "en:sodas", "en:fruit-juices", "en:iced-teas", "en:syrups"], 25),
  ...brands("boissons-eaux", "food", ["coca-cola", "pepsi", "orangina", "oasis", "tropico", "evian", "volvic", "cristaline", "perrier", "san-pellegrino", "badoit", "vittel", "contrex", "schweppes", "teisseire", "joker", "tropicana", "fanta", "innocent", "lipton-ice-tea", "ice-tea"], 6),

  // 13. Surgelés
  ...tags("surgeles", "food", ["en:frozen-foods", "en:ice-creams", "en:frozen-pizzas", "en:frozen-vegetables"], 30),
  ...brands("surgeles", "food", ["mccain", "findus", "buitoni", "marie", "haagen-dazs", "carte-d-or", "magnum", "ristorante", "iglo", "extreme", "miko"], 8),

  // 14. Produits bio (label bio obligatoire)
  q("produits-bio", "food", { label: "en:organic", take: 60 }),
  ...brands("produits-bio", "food", ["bjorg", "jardin-bio", "jardin-bio-etic", "alter-eco", "lima", "lea-nature", "bonneterre", "danival", "les-2-vaches", "grillon-d-or", "primeal", "ekibio", "vrai", "celnat"], 10).map(
    (query) => ({ ...query, label: "en:organic" }),
  ),

  // 15. Hygiène et beauté (Open Beauty Facts)
  ...brands("hygiene-beaute", "beauty", ["dove", "nivea", "garnier", "l-oreal-paris", "le-petit-marseillais", "signal", "colgate", "elseve", "head-shoulders", "palmolive", "sanex", "narta", "rexona", "axe", "ushuaia", "tahiti", "fructis", "neutrogena", "mixa", "labello", "gillette", "dop", "aquafresh", "elmex", "mennen"], 8),
  q("hygiene-beaute", "beauty", { take: 60 }),

  // 16. Entretien de la maison (Open Products Facts)
  ...brands("entretien-maison", "products", ["ariel", "skip", "dash", "mir", "cif", "ajax", "sanytol", "le-chat", "persil", "st-marc", "harpic", "finish", "sun", "paic", "l-arbre-vert", "la-croix", "soupline", "lenor", "febreze", "air-wick", "x-tra", "omo", "destop"], 8),
  q("entretien-maison", "products", { take: 80 }),

  // 17. Bébé
  ...tags("bebe", "food", ["en:baby-foods", "en:baby-milks"], 30),
  ...brands("bebe", "food", ["bledina", "nestle-bebe", "guigoz", "gallia", "hipp", "babybio", "physiolac", "modilac", "good-gout", "popote", "nidal"], 8),
  ...brands("bebe", "beauty", ["mustela", "mixa-bebe", "cadum", "biolane"], 8),
  ...brands("bebe", "products", ["pampers", "huggies", "lotus-baby"], 8),

  // 18. Animaux (Open Pet Food Facts)
  q("animaux", "petfood", { take: 80 }),
  ...brands("animaux", "petfood", ["purina", "purina-one", "felix", "gourmet", "whiskas", "pedigree", "sheba", "friskies", "royal-canin", "ultima", "perfect-fit", "cesar", "canigou", "frolic", "fido"], 8),
];
