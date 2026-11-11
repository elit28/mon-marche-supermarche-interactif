/**
 * Définition des rayons de MON MARCHÉ.
 *
 * Ce fichier est partagé entre l'application (navigation, affichage) et le
 * pipeline d'import (cartographie des catégories Open Food Facts vers nos
 * rayons locaux). Les règles sont évaluées dans l'ordre de `CATEGORY_RULE_ORDER` :
 * la première règle qui correspond attribue le rayon.
 */

export type CategorySlug =
  | "fruits-legumes"
  | "produits-laitiers-oeufs"
  | "fromages"
  | "viandes-charcuterie"
  | "poissons-produits-mer"
  | "boulangerie-patisserie"
  | "pates-riz-feculents"
  | "conserves-epicerie-salee"
  | "biscuits-gateaux"
  | "chocolats-confiseries"
  | "petit-dejeuner"
  | "boissons-eaux"
  | "surgeles"
  | "produits-bio"
  | "hygiene-beaute"
  | "entretien-maison"
  | "bebe"
  | "animaux";

export interface SubshelfDefinition {
  slug: string;
  name: string;
  /** Tags Open Food Facts (taxonomie) qui rangent un produit sur cette étagère. */
  tags: string[];
}

export interface CategoryDefinition {
  slug: CategorySlug;
  name: string;
  /** Nom court pour les puces de navigation sur mobile. */
  shortName: string;
  description: string;
  /** Couleur d'accent du panneau de rayon (contraste vérifié sur fond crème). */
  accent: string;
  /** Étagères du rayon, dans l'ordre d'affichage. La dernière sert de repli. */
  subshelves: SubshelfDefinition[];
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    slug: "fruits-legumes",
    name: "Fruits et légumes",
    shortName: "Fruits & légumes",
    description: "Fruits, légumes et salades conditionnés, référencés avec leur code-barres.",
    accent: "#2F7D32",
    subshelves: [
      { slug: "fruits", name: "Fruits", tags: ["en:fresh-fruits", "en:fruits", "en:bananas", "en:apples", "en:citrus"] },
      { slug: "salades", name: "Salades & herbes", tags: ["en:salads", "en:leaf-vegetables", "en:lettuces", "en:aromatic-plants"] },
      { slug: "legumes", name: "Légumes", tags: ["en:fresh-vegetables", "en:vegetables", "en:potatoes", "en:tomatoes", "en:carrots"] },
      { slug: "fruits-secs", name: "Fruits secs & graines", tags: ["en:dried-fruits", "en:nuts", "en:seeds"] },
    ],
  },
  {
    slug: "produits-laitiers-oeufs",
    name: "Produits laitiers et œufs",
    shortName: "Crèmerie",
    description: "Lait, yaourts, beurre, crème, desserts lactés et œufs.",
    accent: "#2563A8",
    subshelves: [
      { slug: "yaourts", name: "Yaourts & fromages blancs", tags: ["en:yogurts", "en:fromages-blancs", "en:fermented-milk-products", "en:fermented-dairy-desserts"] },
      { slug: "desserts", name: "Desserts lactés", tags: ["en:dairy-desserts", "en:desserts", "en:puddings", "en:creme-brulee"] },
      { slug: "laits", name: "Laits", tags: ["en:milks", "en:plant-based-milk-alternatives", "en:flavoured-milks"] },
      { slug: "beurres-cremes", name: "Beurres & crèmes", tags: ["en:butters", "en:creams", "en:fresh-creams", "en:margarines"] },
      { slug: "oeufs", name: "Œufs", tags: ["en:eggs", "en:chicken-eggs"] },
    ],
  },
  {
    slug: "fromages",
    name: "Fromages",
    shortName: "Fromages",
    description: "Fromages à pâte molle, pressée, fondus, à tartiner et râpés.",
    accent: "#A16207",
    subshelves: [
      { slug: "pates-molles", name: "Pâtes molles", tags: ["en:soft-cheeses", "en:camemberts", "en:bries", "en:cheeses-with-bloomy-rind"] },
      { slug: "pates-pressees", name: "Pâtes pressées", tags: ["en:hard-cheeses", "en:cooked-pressed-cheeses", "en:uncooked-pressed-cheeses", "en:emmentaler", "en:comte", "en:goudas", "en:raclette-cheeses"] },
      { slug: "fondus-tartiner", name: "Fondus & à tartiner", tags: ["en:processed-cheese", "en:cream-cheeses", "en:spreadable-cheeses", "en:fresh-cheeses", "en:cheese-spreads"] },
      { slug: "rapes", name: "Râpés & cuisine", tags: ["en:grated-cheese", "en:mozzarella", "en:feta", "en:parmigiano-reggiano"] },
      { slug: "fromages", name: "Plateau de fromages", tags: ["en:cheeses"] },
    ],
  },
  {
    slug: "viandes-charcuterie",
    name: "Viandes et charcuterie",
    shortName: "Boucherie",
    description: "Jambons, saucissons, lardons, volailles et viandes conditionnées.",
    accent: "#B42318",
    subshelves: [
      { slug: "jambons", name: "Jambons", tags: ["en:hams", "en:white-hams", "en:cooked-hams", "en:dry-hams"] },
      { slug: "saucissons", name: "Saucissons & apéritif", tags: ["en:dry-sausages", "en:salamis", "en:chorizos", "en:saucissons"] },
      { slug: "volailles", name: "Volailles", tags: ["en:poultries", "en:chickens", "en:turkeys", "en:chicken-breasts"] },
      { slug: "lardons-saucisses", name: "Lardons & saucisses", tags: ["en:bacons", "en:lardons", "en:sausages", "en:frankfurters"] },
      { slug: "viandes", name: "Viandes & charcuteries", tags: ["en:meats", "en:prepared-meats"] },
    ],
  },
  {
    slug: "poissons-produits-mer",
    name: "Poissons et produits de la mer",
    shortName: "Marée",
    description: "Saumon fumé, surimi, crevettes et poissons conditionnés.",
    accent: "#0E7490",
    subshelves: [
      { slug: "fumes", name: "Saumons & poissons fumés", tags: ["en:smoked-salmons", "en:smoked-fishes", "en:smoked-trouts"] },
      { slug: "surimi", name: "Surimi & tartinables", tags: ["en:surimi", "en:fish-spreads", "en:taramasalata"] },
      { slug: "crustaces", name: "Crevettes & fruits de mer", tags: ["en:shrimps", "en:crustaceans", "en:mussels", "en:seafood"] },
      { slug: "poissons", name: "Poissons", tags: ["en:fishes", "en:fish-and-meat-and-eggs"] },
    ],
  },
  {
    slug: "boulangerie-patisserie",
    name: "Boulangerie et pâtisserie",
    shortName: "Boulangerie",
    description: "Pains de mie, viennoiseries, brioches, crêpes et pâtisseries.",
    accent: "#9A5B13",
    subshelves: [
      { slug: "pains-de-mie", name: "Pains de mie", tags: ["en:sandwich-breads", "en:sliced-breads", "en:white-sandwich-breads"] },
      { slug: "brioches", name: "Brioches & viennoiseries", tags: ["en:brioches", "en:viennoiseries", "en:croissants", "en:pains-au-chocolat"] },
      { slug: "crepes", name: "Crêpes & pancakes", tags: ["en:crepes", "en:pancakes", "en:crepes-and-galettes", "en:waffles"] },
      { slug: "pains", name: "Pains & pâtisseries", tags: ["en:breads", "en:pastries", "en:special-breads", "en:toasts", "en:rusks"] },
    ],
  },
  {
    slug: "pates-riz-feculents",
    name: "Pâtes, riz et féculents",
    shortName: "Pâtes & riz",
    description: "Pâtes sèches et fraîches, riz, semoules, purées et légumineuses.",
    accent: "#B45309",
    subshelves: [
      { slug: "pates", name: "Pâtes", tags: ["en:pastas", "en:dry-pastas", "en:spaghetti", "en:fresh-pastas", "en:gnocchi"] },
      { slug: "riz", name: "Riz", tags: ["en:rices", "en:basmati-rices", "en:long-grain-rices"] },
      { slug: "semoules-cereales", name: "Semoules, quinoa & céréales", tags: ["en:semolinas", "en:couscous", "en:quinoa", "en:bulgur", "en:cereal-grains"] },
      { slug: "purees-legumineuses", name: "Purées & légumineuses", tags: ["en:mashed-potatoes", "en:dehydrated-mashed-potatoes", "en:legumes", "en:lentils", "en:pulses", "en:potato-preparations"] },
    ],
  },
  {
    slug: "conserves-epicerie-salee",
    name: "Conserves et épicerie salée",
    shortName: "Épicerie salée",
    description: "Sauces, condiments, conserves, huiles, bouillons et épices.",
    accent: "#9F1239",
    subshelves: [
      { slug: "sauces-tomate", name: "Sauces & tomates", tags: ["en:tomato-sauces", "en:pasta-sauces", "en:tomato-pastes", "en:tomato-purees", "en:pesto"] },
      { slug: "condiments", name: "Moutardes, mayonnaises & ketchups", tags: ["en:mustards", "en:mayonnaises", "en:ketchup", "en:condiments", "en:vinaigrettes", "en:salad-dressings", "en:pickles", "en:gherkins"] },
      { slug: "conserves", name: "Conserves de légumes & plats", tags: ["en:canned-vegetables", "en:canned-legumes", "en:canned-meals", "en:canned-foods", "en:corn", "en:green-beans"] },
      { slug: "poissons-conserve", name: "Thon, sardines & maquereaux", tags: ["en:canned-fishes", "en:tunas", "en:sardines", "en:mackerels"] },
      { slug: "bouillons", name: "Soupes, bouillons & épices", tags: ["en:soups", "en:broths", "en:bouillon-cubes", "en:spices", "en:salts", "en:herbs-and-spices"] },
      { slug: "huiles", name: "Huiles & vinaigres", tags: ["en:vegetable-oils", "en:olive-oils", "en:vinegars", "en:sunflower-oils"] },
      { slug: "epicerie", name: "Épicerie salée", tags: ["en:sauces", "en:groceries"] },
    ],
  },
  {
    slug: "biscuits-gateaux",
    name: "Biscuits et gâteaux",
    shortName: "Biscuits",
    description: "Biscuits, gâteaux moelleux et l'incontournable rayon apéritif.",
    accent: "#A2531B",
    subshelves: [
      { slug: "biscuits", name: "Biscuits", tags: ["en:biscuits", "en:chocolate-biscuits", "en:shortbread-cookies", "en:filled-biscuits", "en:cookies", "en:dry-biscuits"] },
      { slug: "gateaux", name: "Gâteaux & moelleux", tags: ["en:cakes", "en:sponge-cakes", "en:madeleines", "en:muffins", "en:pound-cakes", "en:brownies"] },
      { slug: "aperitif", name: "Apéritif & snacks salés", tags: ["en:salty-snacks", "en:crisps", "en:chips-and-fries", "en:appetizers", "en:crackers", "en:popcorn", "en:pretzels"] },
      { slug: "biscuits-gateaux", name: "Biscuits & gâteaux", tags: ["en:biscuits-and-cakes", "en:sweet-snacks"] },
    ],
  },
  {
    slug: "chocolats-confiseries",
    name: "Chocolats et confiseries",
    shortName: "Chocolats",
    description: "Tablettes, barres chocolatées, bonbons et confiseries.",
    accent: "#6B3A1E",
    subshelves: [
      { slug: "tablettes", name: "Tablettes de chocolat", tags: ["en:chocolate-bars", "en:dark-chocolates", "en:milk-chocolates", "en:white-chocolates", "en:chocolate-tablets"] },
      { slug: "barres", name: "Barres & bouchées", tags: ["en:chocolate-candies", "en:candy-bars", "en:filled-chocolates", "en:bonbons", "en:pralines"] },
      { slug: "bonbons", name: "Bonbons", tags: ["en:candies", "en:gummies", "en:lollipops", "en:chewing-gum", "en:marshmallows"] },
      { slug: "chocolats", name: "Chocolats & confiseries", tags: ["en:chocolates", "en:confectioneries", "en:cocoa-and-its-products"] },
    ],
  },
  {
    slug: "petit-dejeuner",
    name: "Petit-déjeuner",
    shortName: "Petit-déj",
    description: "Céréales, pâtes à tartiner, confitures, miels, cafés et thés.",
    accent: "#C2410C",
    subshelves: [
      { slug: "cereales", name: "Céréales", tags: ["en:breakfast-cereals", "en:mueslis", "en:granolas", "en:flakes", "en:chocolate-cereals"] },
      { slug: "tartiner", name: "Pâtes à tartiner, confitures & miels", tags: ["en:sweet-spreads", "en:hazelnut-spreads", "en:jams", "en:honeys", "en:fruit-preserves", "en:spreads", "en:marmalades"] },
      { slug: "cafes-thes", name: "Cafés, thés & chocolats en poudre", tags: ["en:coffees", "en:teas", "en:herbal-teas", "en:instant-coffees", "en:cocoa-powders", "en:chocolate-powders", "en:instant-breakfast-drinks", "en:hot-beverages"] },
      { slug: "petit-dejeuner", name: "Petit-déjeuner", tags: ["en:breakfasts", "en:breakfast-biscuits", "en:compotes"] },
    ],
  },
  {
    slug: "boissons-eaux",
    name: "Boissons et eaux",
    shortName: "Boissons",
    description: "Eaux plates et gazeuses, sodas, jus de fruits, thés glacés et sirops.",
    accent: "#1D4ED8",
    subshelves: [
      { slug: "eaux", name: "Eaux", tags: ["en:waters", "en:mineral-waters", "en:spring-waters", "en:sparkling-waters", "en:natural-mineral-waters", "en:flavored-waters"] },
      { slug: "sodas", name: "Sodas & boissons gazeuses", tags: ["en:sodas", "en:colas", "en:carbonated-drinks", "en:lemonade", "en:energy-drinks"] },
      { slug: "jus", name: "Jus & nectars", tags: ["en:fruit-juices", "en:orange-juices", "en:nectars", "en:smoothies", "en:fruit-based-beverages"] },
      { slug: "boissons", name: "Thés glacés, sirops & boissons", tags: ["en:iced-teas", "en:syrups", "en:beverages", "en:plant-based-beverages"] },
    ],
  },
  {
    slug: "surgeles",
    name: "Surgelés",
    shortName: "Surgelés",
    description: "Glaces, pizzas, frites, légumes et plats cuisinés surgelés.",
    accent: "#0369A1",
    subshelves: [
      { slug: "glaces", name: "Glaces & desserts glacés", tags: ["en:ice-creams", "en:frozen-desserts", "en:ice-cream-tubs", "en:ice-cream-bars", "en:sorbets"] },
      { slug: "pizzas", name: "Pizzas & tartes", tags: ["en:frozen-pizzas", "en:pizzas", "en:quiches"] },
      { slug: "frites-legumes", name: "Frites & légumes", tags: ["en:frozen-fries", "en:french-fries", "en:frozen-vegetables", "en:potato-products"] },
      { slug: "surgeles", name: "Plats & poissons surgelés", tags: ["en:frozen-foods", "en:frozen-fishes", "en:frozen-ready-made-meals"] },
    ],
  },
  {
    slug: "produits-bio",
    name: "Produits bio",
    shortName: "Bio",
    description: "Une sélection de produits issus de l'agriculture biologique (label vérifié dans la fiche).",
    accent: "#4D7C0F",
    subshelves: [
      { slug: "bio-petit-dejeuner", name: "Petit-déjeuner bio", tags: ["en:breakfast-cereals", "en:breakfasts", "en:sweet-spreads", "en:jams", "en:honeys", "en:teas", "en:coffees"] },
      { slug: "bio-boissons", name: "Boissons végétales & jus bio", tags: ["en:plant-based-milk-alternatives", "en:beverages", "en:fruit-juices"] },
      { slug: "bio-biscuits", name: "Biscuits & douceurs bio", tags: ["en:biscuits", "en:biscuits-and-cakes", "en:chocolates", "en:sweet-snacks"] },
      { slug: "bio-epicerie", name: "Épicerie bio", tags: ["en:plant-based-foods-and-beverages", "en:groceries"] },
    ],
  },
  {
    slug: "hygiene-beaute",
    name: "Hygiène et beauté",
    shortName: "Hygiène",
    description: "Gels douche, shampooings, soins, dentifrices et déodorants (Open Beauty Facts).",
    accent: "#7E22CE",
    subshelves: [
      { slug: "douche", name: "Douche & bain", tags: ["en:shower-gels", "en:bath-products", "en:soaps", "en:liquid-soaps", "en:body-washes"] },
      { slug: "cheveux", name: "Cheveux", tags: ["en:shampoos", "en:conditioners", "en:hair-care", "en:hair-masks"] },
      { slug: "dents", name: "Hygiène dentaire", tags: ["en:toothpastes", "en:toothbrushes", "en:mouthwashes", "en:oral-care"] },
      { slug: "deodorants", name: "Déodorants", tags: ["en:deodorants", "en:antiperspirants"] },
      { slug: "soins", name: "Soins du visage & du corps", tags: ["en:creams", "en:body-care", "en:face-care", "en:lip-care", "en:moisturizers", "en:body-milks"] },
      { slug: "hygiene", name: "Hygiène & beauté", tags: [] },
    ],
  },
  {
    slug: "entretien-maison",
    name: "Entretien de la maison",
    shortName: "Entretien",
    description: "Lessives, liquides vaisselle, nettoyants ménagers et désinfectants (Open Products Facts).",
    accent: "#0F766E",
    subshelves: [
      { slug: "lessives", name: "Lessives & adoucissants", tags: ["en:laundry-detergents", "en:liquid-detergent", "en:detergents", "en:fabric-softeners", "en:laundry"] },
      { slug: "vaisselle", name: "Vaisselle", tags: ["en:dishwashing-liquids", "en:dishwasher-tablets", "en:dishwashing-products"] },
      { slug: "nettoyants", name: "Nettoyants & désinfectants", tags: ["en:household-cleaning-products", "en:multi-purpose-cleaners", "en:disinfectants", "en:bathroom-cleaners", "en:kitchen-cleaners", "en:wipes"] },
      { slug: "entretien", name: "Entretien de la maison", tags: [] },
    ],
  },
  {
    slug: "bebe",
    name: "Produits pour bébé",
    shortName: "Bébé",
    description: "Petits pots, laits infantiles, céréales bébé et soins pour les tout-petits.",
    accent: "#BE185D",
    subshelves: [
      { slug: "repas", name: "Petits pots & repas", tags: ["en:baby-foods", "en:baby-meals", "en:baby-dinners", "en:baby-desserts", "en:baby-fruit-purees"] },
      { slug: "laits", name: "Laits & céréales bébé", tags: ["en:baby-milks", "en:infant-formulas", "en:follow-on-milks", "en:baby-cereals", "en:growing-up-milks"] },
      { slug: "soins", name: "Soins & change", tags: ["en:baby-care", "en:baby-hygiene", "en:diapers", "en:baby-wipes"] },
      { slug: "bebe", name: "Bébé", tags: [] },
    ],
  },
  {
    slug: "animaux",
    name: "Produits pour animaux",
    shortName: "Animaux",
    description: "Croquettes, pâtées et friandises pour chats et chiens (Open Pet Food Facts).",
    accent: "#57534E",
    subshelves: [
      { slug: "chats", name: "Chats", tags: ["en:cat-food", "en:dry-cat-food", "en:wet-cat-food", "en:cat-treats", "en:cat-biscuits"] },
      { slug: "chiens", name: "Chiens", tags: ["en:dog-food", "en:dry-dog-food", "en:wet-dog-food", "en:dog-treats"] },
      { slug: "animaux", name: "Animaux", tags: [] },
    ],
  },
];

export const CATEGORY_BY_SLUG: ReadonlyMap<string, CategoryDefinition> = new Map(
  CATEGORIES.map((c) => [c.slug, c]),
);

export function getCategoryDefinition(slug: string): CategoryDefinition | undefined {
  return CATEGORY_BY_SLUG.get(slug);
}

/** Choisit l'étagère (sous-rayon) d'un produit à partir de ses tags OFF. */
export function pickSubshelf(category: CategoryDefinition, tags: readonly string[]): string {
  const tagSet = new Set(tags);
  for (const shelf of category.subshelves) {
    if (shelf.tags.some((t) => tagSet.has(t))) return shelf.slug;
  }
  return category.subshelves[category.subshelves.length - 1]!.slug;
}
