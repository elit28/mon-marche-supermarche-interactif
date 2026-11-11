import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processProductImage } from "../../scripts/catalog/lib/image-process";
import { createGuestToken, verifyGuestToken } from "@/lib/guest-token";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { computeQuality, isBusyBackground } from "@/server/catalog/quality";
import { generateDemoPrice, generateDemoPromotion, roundToShelfPrice } from "@/server/pricing/demo-prices";

/** Image de synthèse : un « emballage » coloré sur fond blanc studio. */
async function packshot(): Promise<Buffer> {
  const pack = await sharp({ create: { width: 180, height: 280, channels: 3, background: "#c0392b" } }).png().toBuffer();
  return sharp({ create: { width: 400, height: 400, channels: 3, background: "#ffffff" } })
    .composite([{ input: pack, left: 110, top: 60 }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** Photo « prise en main » : fond bruité et coloré. */
async function busyPhoto(): Promise<Buffer> {
  const noise = Buffer.alloc(400 * 400 * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 37 + (i % 7) * 91) % 255;
  return sharp(noise, { raw: { width: 400, height: 400, channels: 3 } }).jpeg().toBuffer();
}

describe("traitement des photos", () => {
  it("détoure un emballage posé sur fond blanc et le recadre", async () => {
    const result = await processProductImage(await packshot(), { maxSize: 300 });
    expect(result.isCutout).toBe(true);
    expect(result.backgroundScore).toBeGreaterThan(0.9);
    // Recadré au plus près de l'emballage (proportions 180×280 conservées).
    expect(result.width / result.height).toBeCloseTo(180 / 280, 1);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.hasAlpha).toBe(true);
  });

  it("conserve sans détourage une photo au fond chargé", async () => {
    const result = await processProductImage(await busyPhoto(), { maxSize: 300 });
    expect(result.isCutout).toBe(false);
    expect(isBusyBackground(result)).toBe(true);
  });

  it("rejette une image trop petite ou illisible (image indisponible)", async () => {
    const tiny = await sharp({ create: { width: 60, height: 60, channels: 3, background: "#fff" } }).png().toBuffer();
    await expect(processProductImage(tiny, { maxSize: 300 })).rejects.toThrow(/trop petite/);
    await expect(processProductImage(Buffer.from("ceci n'est pas une image"), { maxSize: 300 })).rejects.toThrow();
  });

  it("note la qualité d'une fiche selon sa photo et sa complétude", () => {
    const base = { site: "food" as const, quantityLabel: "400 g", nutrition: null, ingredientsText: null, nutriscoreGrade: null, brand: "Marque", popularity: 100 };
    const good = computeQuality(base, { isCutout: true, backgroundScore: 1, sourceWidth: 800, sourceHeight: 800 });
    const poor = computeQuality({ ...base, quantityLabel: null }, { isCutout: false, backgroundScore: 0.1, sourceWidth: 300, sourceHeight: 300 });
    expect(good.score).toBeGreaterThan(poor.score);
    expect(poor.issues).toEqual(expect.arrayContaining(["image_not_cutout", "image_busy_background", "image_low_resolution", "missing_quantity", "missing_nutrition"]));
  });
});

describe("prix fictifs de démonstration", () => {
  const input = { barcode: "3017620422003", category: "petit-dejeuner" as const, subshelf: "tartiner", netAmount: 400, netUnit: "g" as const, organic: false };

  it("sont déterministes, bornés et arrondis « façon magasin »", () => {
    const a = generateDemoPrice(input);
    expect(generateDemoPrice(input)).toBe(a);
    expect(a % 10).toBe(9);
    expect(a).toBeGreaterThanOrEqual(39);
    expect(a).toBeLessThanOrEqual(3999);
    expect(roundToShelfPrice(1)).toBe(39);
    expect(roundToShelfPrice(100_000)).toBe(3999);
  });

  it("majorent les produits bio et suivent le format", () => {
    expect(generateDemoPrice({ ...input, organic: true })).toBeGreaterThan(generateDemoPrice(input));
    expect(generateDemoPrice({ ...input, netAmount: 1000 })).toBeGreaterThan(generateDemoPrice(input));
  });

  it("génèrent des promotions déterministes et valides", () => {
    let count = 0;
    for (let i = 0; i < 500; i++) {
      const promo = generateDemoPromotion(String(3000000000000 + i));
      if (!promo) continue;
      count++;
      if (promo.kind === "percent") expect(promo.value).toBeLessThanOrEqual(40);
      else expect(promo.value).toBeLessThanOrEqual(100);
    }
    expect(count).toBeGreaterThan(20);
    expect(count).toBeLessThan(100);
  });
});

describe("sécurité", () => {
  it("signe l'identifiant invité et détecte toute falsification", async () => {
    const { id, token } = await createGuestToken();
    expect(await verifyGuestToken(token)).toBe(id);
    expect(await verifyGuestToken(`${id}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).toBeNull();
    expect(await verifyGuestToken(`autre-identifiant-xxxxx.${token.split(".")[1]}`)).toBeNull();
    expect(await verifyGuestToken("")).toBeNull();
    expect(await verifyGuestToken(undefined)).toBeNull();
  });

  it("hache les mots de passe avec scrypt et un sel unique", async () => {
    const hash = await hashPassword("un mot de passe très long");
    expect(hash).toMatch(/^scrypt\$/);
    expect(await hashPassword("un mot de passe très long")).not.toBe(hash);
    expect(await verifyPassword("un mot de passe très long", hash)).toBe(true);
    expect(await verifyPassword("mauvais mot de passe", hash)).toBe(false);
    expect(await verifyPassword("x", "format-invalide")).toBe(false);
  });
});

describe("promotions fictives", () => {
  it("ne propose jamais une remise en euros supérieure à 30 % du prix", () => {
    for (let i = 0; i < 2000; i++) {
      const promo = generateDemoPromotion(String(3000000000000 + i), 59);
      if (promo?.kind === "amount") expect(promo.value).toBeLessThanOrEqual(59 * 0.3);
    }
  });
});
