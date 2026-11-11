import { describe, expect, it } from "vitest";
import {
  cleanBrand,
  cleanProductName,
  cleanQuantityLabel,
  dedupeProducts,
  isAllowedImageUrl,
  isValidGtin,
  mapCategory,
  normalizeBarcode,
  normalizeOffProduct,
  parseQuantity,
  pickFrontImageUrl,
  toFullImageUrl,
} from "@/server/catalog/normalize";
import type { OffProduct } from "@/server/catalog/off-types";

const nutella: OffProduct = {
  code: "3017620422003",
  product_name_fr: "Nutella",
  brands: "Ferrero, Nutella",
  brands_tags: ["ferrero", "nutella"],
  quantity: "400 g e",
  product_quantity: 400,
  product_quantity_unit: "g",
  categories_tags: ["en:breakfasts", "en:spreads", "en:sweet-spreads", "en:hazelnut-spreads"],
  labels_tags: ["en:vegetarian"],
  countries_tags: ["en:france", "en:belgium"],
  nutriscore_grade: "e",
  nova_group: 4,
  ingredients_text_fr: "Sucre, huile de palme, NOISETTES 13%, lait écrémé en poudre 8,7%",
  allergens_tags: ["en:milk", "en:nuts", "en:soybeans"],
  nutriments: { "energy-kcal_100g": 539, fat_100g: 30.9, "saturated-fat_100g": 10.6, sugars_100g: 56.3, proteins_100g: 6.3, salt_100g: 0.107 },
  nutrition_data_per: "100g",
  selected_images: { front: { display: { fr: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.1024.400.jpg" } } },
  images: { front_fr: { uploader: "contributeur-test" } },
  unique_scans_n: 804,
  last_modified_t: 1794233882,
  lang: "fr",
};

describe("codes-barres", () => {
  it("valide la clé de contrôle des EAN-13, EAN-8 et UPC-A", () => {
    expect(isValidGtin("3017620422003")).toBe(true);
    expect(isValidGtin("3017620422004")).toBe(false);
    expect(isValidGtin("96385074")).toBe(true);
    expect(isValidGtin("036000291452")).toBe(true);
    expect(isValidGtin("12345")).toBe(false);
    expect(isValidGtin("30176204220A3")).toBe(false);
  });

  it("normalise un UPC-A en EAN-13", () => {
    expect(normalizeBarcode("036000291452")).toBe("0036000291452");
    expect(normalizeBarcode(" 3017620422003 ")).toBe("3017620422003");
  });
});

describe("marques et noms", () => {
  it("garde la première marque et corrige la casse « tout en majuscules »", () => {
    expect(cleanBrand("Lustucru, Lustucru")).toBe("Lustucru");
    expect(cleanBrand("BARILLA")).toBe("Barilla");
    expect(cleanBrand("LU")).toBe("LU");
    expect(cleanBrand("")).toBeNull();
  });

  it("retire la marque répétée et la quantité du nom, sans inventer", () => {
    expect(cleanProductName("Lustucru gnocchi a poêler 520g", "Lustucru")).toBe("Gnocchi a poêler");
    expect(cleanProductName("BARILLA LASAGNE ALL'UOVO 500g", "Barilla")).toBe("Lasagne all'uovo");
    expect(cleanProductName("Spaghetti n°5", "Barilla")).toBe("Spaghetti n°5");
    expect(cleanProductName("Nutella", "Ferrero")).toBe("Nutella");
  });
});

describe("quantités", () => {
  it("nettoie le libellé (signe ℮, unités, virgule française)", () => {
    expect(cleanQuantityLabel("400 g e")).toBe("400 g");
    expect(cleanQuantityLabel("1.5L")).toBe("1,5 L");
    expect(cleanQuantityLabel("6x33cl")).toBe("6 x 33 cl");
    expect(cleanQuantityLabel("")).toBeNull();
  });

  it("calcule la quantité nette en g ou ml", () => {
    expect(parseQuantity({ product_quantity: 400, product_quantity_unit: "g" })).toMatchObject({ netAmount: 400, netUnit: "g" });
    expect(parseQuantity({ quantity: "6 x 33 cl" })).toMatchObject({ netAmount: 1980, netUnit: "ml" });
    expect(parseQuantity({ quantity: "1,5 L" })).toMatchObject({ netAmount: 1500, netUnit: "ml" });
    expect(parseQuantity({ quantity: "12 oeufs" })).toMatchObject({ netAmount: null, netUnit: null });
  });
});

describe("cartographie des rayons", () => {
  it("range les produits alimentaires selon leurs catégories OFF", () => {
    expect(mapCategory({ site: "food", tags: ["en:sweet-spreads"], brandSlug: "ferrero", organic: false })).toBe("petit-dejeuner");
    expect(mapCategory({ site: "food", tags: ["en:dairies", "en:cheeses"], brandSlug: "president", organic: false })).toBe("fromages");
    expect(mapCategory({ site: "food", tags: ["en:frozen-foods", "en:pizzas"], brandSlug: "buitoni", organic: false })).toBe("surgeles");
    expect(mapCategory({ site: "food", tags: ["en:canned-fishes", "en:fishes"], brandSlug: "petit-navire", organic: false })).toBe("conserves-epicerie-salee");
    expect(mapCategory({ site: "food", tags: ["en:biscuits-and-cakes", "en:brioches"], brandSlug: "pasquier", organic: false })).toBe("boulangerie-patisserie");
  });

  it("exclut l'alcool et les compléments alimentaires", () => {
    expect(mapCategory({ site: "food", tags: ["en:beverages", "en:alcoholic-beverages"], brandSlug: null, organic: false })).toBeNull();
    expect(mapCategory({ site: "food", tags: ["en:dietary-supplements"], brandSlug: null, organic: false })).toBeNull();
  });

  it("n'attribue le rayon bio qu'avec un label bio vérifié", () => {
    expect(mapCategory({ site: "food", tags: ["en:breakfast-cereals"], brandSlug: "bjorg", hint: "produits-bio", organic: true })).toBe("produits-bio");
    expect(mapCategory({ site: "food", tags: ["en:breakfast-cereals"], brandSlug: "bjorg", hint: "produits-bio", organic: false })).toBe("petit-dejeuner");
  });

  it("range les bases sœurs (beauté, entretien, animaux)", () => {
    expect(mapCategory({ site: "beauty", tags: ["en:shower-gels"], brandSlug: "dove", organic: false })).toBe("hygiene-beaute");
    expect(mapCategory({ site: "beauty", tags: [], brandSlug: "mustela", organic: false })).toBe("bebe");
    expect(mapCategory({ site: "products", tags: ["en:laundry-detergents"], brandSlug: "ariel", organic: false })).toBe("entretien-maison");
    expect(mapCategory({ site: "products", tags: ["en:books"], brandSlug: null, organic: false })).toBeNull();
    expect(mapCategory({ site: "petfood", tags: ["en:cat-food"], brandSlug: "whiskas", organic: false })).toBe("animaux");
  });
});

describe("images", () => {
  it("n'accepte que les domaines officiels en HTTPS", () => {
    expect(isAllowedImageUrl("https://images.openfoodfacts.org/images/products/301/front_fr.4.400.jpg")).toBe(true);
    expect(isAllowedImageUrl("http://images.openfoodfacts.org/images/products/301/front_fr.4.400.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://evil.example.com/front.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://images.openfoodfacts.org.evil.com/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("javascript:alert(1)")).toBe(false);
  });

  it("préfère l'emballage français et sait obtenir la pleine résolution", () => {
    const url = pickFrontImageUrl({ ...nutella, image_front_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg" });
    expect(url).toContain("front_fr");
    expect(toFullImageUrl(url!)).toMatch(/front_fr\.1024\.full\.jpg$/);
  });

  it("signale une fiche sans photo exploitable", () => {
    const result = normalizeOffProduct({ ...nutella, selected_images: undefined, image_front_url: "https://example.com/x.jpg" }, "food");
    expect(result).toEqual({ ok: false, reason: "missing_image" });
  });
});

describe("normalizeOffProduct", () => {
  it("produit une fiche normalisée fidèle à la source", () => {
    const result = normalizeOffProduct(nutella, "food");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const p = result.product;
    expect(p).toMatchObject({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      quantityLabel: "400 g",
      netAmount: 400,
      netUnit: "g",
      category: "petit-dejeuner",
      subshelf: "tartiner",
      nutriscoreGrade: "e",
      novaGroup: 4,
      imageUploader: "contributeur-test",
    });
    expect(p.allergens).toEqual(["en:milk", "en:nuts", "en:soybeans"]);
    expect(p.nutrition?.energyKcal).toBe(539);
    // Valeur absente de la source : reste nulle, jamais inventée.
    expect(p.nutrition?.fiber).toBeNull();
  });

  it("rejette les fiches non conformes avec un motif explicite", () => {
    expect(normalizeOffProduct({ ...nutella, code: "3017620422004" }, "food")).toEqual({ ok: false, reason: "invalid_barcode" });
    expect(normalizeOffProduct({ ...nutella, code: "2000000000008" }, "food")).toEqual({ ok: false, reason: "restricted_barcode" });
    expect(normalizeOffProduct({ ...nutella, product_name_fr: "", product_name: "" }, "food")).toEqual({ ok: false, reason: "missing_name" });
    expect(normalizeOffProduct({ ...nutella, product_name_fr: "كريمي" }, "food")).toEqual({ ok: false, reason: "missing_name" });
    expect(normalizeOffProduct({ ...nutella, countries_tags: ["en:germany"] }, "food")).toEqual({ ok: false, reason: "not_sold_in_france" });
    expect(normalizeOffProduct({ ...nutella, brands: "Carrefour", brands_tags: ["carrefour"] }, "food")).toEqual({ ok: false, reason: "retailer_brand" });
    expect(normalizeOffProduct({ ...nutella, brands: "", brands_tags: [] }, "food")).toEqual({ ok: false, reason: "missing_brand" });
  });
});

describe("dedupeProducts", () => {
  const base = { brandSlug: "barilla", name: "Spaghetti n°5", quantityLabel: "500 g" };
  it("élimine les doublons de code-barres et les quasi-doublons en gardant le plus populaire", () => {
    const { kept, removed } = dedupeProducts([
      { ...base, barcode: "8076800195057", popularity: 237 },
      { ...base, barcode: "8076800195057", popularity: 10 },
      { ...base, barcode: "8076809513753", popularity: 50, name: "SPAGHETTI N°5" },
      { ...base, barcode: "8076802085738", popularity: 224, name: "Penne Rigate N°73" },
    ]);
    expect(kept.map((p) => p.barcode).sort()).toEqual(["8076800195057", "8076802085738"]);
    expect(removed).toHaveLength(2);
    expect(removed.every((r) => r.duplicateOf === "8076800195057")).toBe(true);
  });
});

describe("règles anti-confusion", () => {
  it("écarte les marques de distributeurs par préfixe GS1 et les codes internes d'enseigne", async () => {
    const { isRetailerBarcode, isForeignMarketBarcode } = await import("@/server/catalog/normalize");
    expect(isRetailerBarcode("3560070123456")).toBe(true); // Carrefour
    expect(isRetailerBarcode("4056489095736")).toBe(true); // Lidl
    expect(isRetailerBarcode("20150907")).toBe(true); // EAN-8 interne
    expect(isRetailerBarcode("3017620422003")).toBe(false); // Nutella
    expect(isForeignMarketBarcode("6111242100305")).toBe(true);
    expect(isForeignMarketBarcode("5449000000996")).toBe(false);
  });

  it("ne range pas en « Surgelés » un produit sec marqué « surgelé » par erreur", () => {
    expect(mapCategory({ site: "food", tags: ["en:frozen-foods", "en:breads", "en:sliced-breads"], brandSlug: "harrys", organic: false })).toBe("boulangerie-patisserie");
    expect(mapCategory({ site: "food", tags: ["en:frozen-foods", "en:mustards"], brandSlug: "amora", organic: false })).toBe("conserves-epicerie-salee");
    expect(mapCategory({ site: "food", tags: ["en:frozen-foods", "en:ice-creams", "en:dairies"], brandSlug: "magnum", organic: false })).toBe("surgeles");
    expect(mapCategory({ site: "food", tags: ["en:frozen-foods", "en:frozen-vegetables", "en:vegetables"], brandSlug: "bonduelle", organic: false })).toBe("surgeles");
  });

  it("exige une vraie catégorie ou marque pour les bases animaux et entretien", () => {
    expect(mapCategory({ site: "petfood", tags: ["en:wines"], brandSlug: "domaine-x", organic: false })).toBeNull();
    expect(mapCategory({ site: "petfood", tags: [], brandSlug: "whiskas", organic: false })).toBe("animaux");
    expect(mapCategory({ site: "products", tags: ["en:office-supplies"], brandSlug: "stabilo-boss", hint: "entretien-maison", organic: false })).toBeNull();
    expect(mapCategory({ site: "products", tags: [], brandSlug: "rainett", organic: false })).toBe("entretien-maison");
  });
});
