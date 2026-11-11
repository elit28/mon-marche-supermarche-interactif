/**
 * Étape 2 du pipeline : construction du catalogue à partir des données collectées.
 *
 *   pnpm catalog:build [--offline] [--no-ml]
 *
 * 1. Normalisation et contrôle qualité des fiches v3 mises en cache.
 * 2. Déduplication (code-barres, puis marque + nom + format).
 * 3. Détourage de chaque emballage (photo pleine résolution) :
 *    a. fond uni → détourage géométrique exact (« packshot ») ;
 *    b. sinon → segmentation par IA (rembg, modèles Apache 2.0) puis validation
 *       stricte du masque (silhouette unique, pleine, opaque).
 *    Règle MON MARCHÉ : un produit n'est mis en rayon QUE si son emballage est
 *    proprement détouré. Les photos prises en main ou en situation sont écartées.
 * 4. Revue visuelle : `scripts/catalog/image-review.json` liste les codes-barres
 *    dont le détourage a été refusé à l'œil (planches de contrôle dans .cache/catalog/qa/).
 * 5. Écriture de l'instantané versionné `data/catalog/products.json` (ODbL),
 *    des images WebP et du rapport d'import.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CATEGORIES, type CategorySlug } from "../../src/lib/catalog/categories";
import { dedupeProducts, normalizeOffProduct, toFullImageUrl, type NormalizedProduct, type RejectionReason } from "../../src/server/catalog/normalize";
import { computeQuality, type QualityIssue } from "../../src/server/catalog/quality";
import { OFF_SITE_HOSTS, OFF_SITE_LABELS, type OffSite, type OffV3ProductResponse } from "../../src/server/catalog/off-types";
import type { SnapshotFile, SnapshotProduct } from "../../src/server/catalog/snapshot";
import { downloadCached, limiters } from "../../src/server/catalog/http";
import { processMlCutout, processProductImage, type ProcessedImage } from "./lib/image-process";
import { CATEGORY_TARGETS } from "./sources";

const offline = process.argv.includes("--offline");
const noMl = process.argv.includes("--no-ml");
const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".cache/catalog");
const OUTPUT_IMAGES = path.join(ROOT, "public/catalog/images");
const SNAPSHOT_FILE = path.join(ROOT, "data/catalog/products.json");
const REPORT_FILE = path.join(ROOT, "data/catalog/report.json");
const REPORT_MD = path.join(ROOT, "docs/CATALOGUE-RAPPORT.md");
const REVIEW_FILE = path.join(ROOT, "scripts/catalog/image-review.json");
const IMAGE_MAX_SIZE = 560;
const PYTHON = process.env.REMBG_PYTHON ?? path.join(ROOT, ".cache/rembg-venv/bin/python");
const ML_MODEL = process.env.REMBG_MODEL ?? "isnet-general-use";

interface Candidate {
  code: string;
  site: OffSite;
  hint: CategorySlug;
  category: CategorySlug;
  popularity: number;
  imageClass?: "packshot" | "ml" | "busy";
  productFile?: string;
  error?: string;
}

type CutoutMethod = "fond-uni" | "ia";

interface Cut {
  product: NormalizedProduct;
  image: ProcessedImage;
  method: CutoutMethod;
  score: number;
  issues: QualityIssue[];
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]!, index);
      }
    }),
  );
  return results;
}

async function loadCandidates(): Promise<{ candidates: Candidate[]; screening: Record<string, number> }> {
  const merged = new Map<string, Candidate>();
  const screening: Record<string, number> = {};
  // Les collectes successives se complètent (la plus récente fait foi).
  for (const file of ["candidates-v1.json", "candidates.json"]) {
    const full = path.join(CACHE_DIR, file);
    if (!existsSync(full)) continue;
    const data = JSON.parse(await readFile(full, "utf8")) as { candidates: Candidate[]; report: { screeningRejections?: Record<string, number> } };
    for (const c of data.candidates) merged.set(c.code, { ...merged.get(c.code), ...c });
    for (const [k, v] of Object.entries(data.report.screeningRejections ?? {})) screening[k] = Math.max(screening[k] ?? 0, v);
  }
  return { candidates: [...merged.values()], screening };
}

async function main() {
  const { candidates, screening } = await loadCandidates();
  const review = existsSync(REVIEW_FILE) ? (JSON.parse(await readFile(REVIEW_FILE, "utf8")) as { rejected: string[] }) : { rejected: [] };
  const manuallyRejected = new Set(review.rejected);
  console.log(`📥 ${candidates.length} candidats issus de la collecte.`);

  const rejections: Record<string, number> = {};
  const reject = (reason: string) => {
    rejections[reason] = (rejections[reason] ?? 0) + 1;
  };

  // 1. Normalisation des fiches v3.
  const normalized: NormalizedProduct[] = [];
  for (const c of candidates) {
    if (!c.productFile || c.error?.startsWith("rejet")) {
      reject(c.error?.startsWith("rejet") ? "rejected_after_v3" : "fetch_error");
      continue;
    }
    const data = JSON.parse(await readFile(path.join(ROOT, c.productFile), "utf8")) as OffV3ProductResponse;
    if (!data.product) {
      reject("fetch_error");
      continue;
    }
    const hint = c.category === "produits-bio" ? "produits-bio" : c.hint;
    const result = normalizeOffProduct({ ...data.product, code: c.code }, c.site, hint);
    if (!result.ok) {
      reject(result.reason as RejectionReason);
      continue;
    }
    normalized.push(result.product);
  }

  // 2. Déduplication.
  const { kept, removed } = dedupeProducts(normalized);
  console.log(`🧹 ${normalized.length} fiches valides, ${removed.length} doublons écartés.`);

  // 3a. Photos pleine résolution + détourage géométrique (fond uni).
  console.log(`✂️  Détourage de ${kept.length} emballages (fond uni)…`);
  const fullFile = (code: string) => path.join(CACHE_DIR, "images-full", `${code}.jpg`);
  const cuts: Cut[] = [];
  const mlQueue: NormalizedProduct[] = [];
  let done = 0;
  await mapLimit(kept, 4, async (product) => {
    try {
      if (manuallyRejected.has(product.barcode)) {
        reject("manual_review");
        return;
      }
      let file = fullFile(product.barcode);
      if (!offline) {
        await downloadCached(toFullImageUrl(product.imageUrl), { limiter: limiters.image, cacheFile: file });
      } else if (!existsSync(file)) {
        file = path.join(CACHE_DIR, "previews", `${product.barcode}.jpg`);
      }
      const image = await processProductImage(file, { maxSize: IMAGE_MAX_SIZE, workSize: 900 });
      if (image.isCutout) {
        const q = computeQuality(product, { isCutout: true, backgroundScore: image.backgroundScore, sourceWidth: image.sourceWidth, sourceHeight: image.sourceHeight });
        cuts.push({ product, image, method: "fond-uni", score: q.score, issues: q.issues });
      } else {
        mlQueue.push(product);
      }
    } catch (error) {
      reject("image_error");
      console.warn(`  ⚠️ ${product.barcode} : ${(error as Error).message}`);
    }
    if (++done % 100 === 0) console.log(`  … ${done}/${kept.length}`);
  });
  console.log(`  ${cuts.length} packshots détourés, ${mlQueue.length} photos à confier à l'IA.`);

  // 3b. Segmentation par IA, puis validation stricte.
  const mlRejections: Record<string, number> = {};
  if (!noMl && mlQueue.length > 0) {
    if (!existsSync(PYTHON)) {
      console.warn(`⚠️  Détourage IA indisponible (${PYTHON} introuvable) : voir docs/CATALOGUE.md. Ces produits sont écartés.`);
    } else {
      const jobs = mlQueue
        .filter((p) => existsSync(fullFile(p.barcode)))
        .map((p) => ({ input: fullFile(p.barcode), output: path.join(CACHE_DIR, "ml", ML_MODEL, `${p.barcode}.png`) }));
      const jobsFile = path.join(CACHE_DIR, "ml-jobs.json");
      await writeFile(jobsFile, JSON.stringify(jobs));
      console.log(`🤖 Segmentation IA de ${jobs.length} photos (${ML_MODEL})…`);
      const run = spawnSync(PYTHON, [path.join(ROOT, "scripts/catalog/ml_cutout.py"), jobsFile, ML_MODEL], { stdio: "inherit" });
      if (run.status !== 0) console.warn("⚠️  La segmentation IA a échoué partiellement.");
      await mapLimit(mlQueue, 4, async (product) => {
        const png = path.join(CACHE_DIR, "ml", ML_MODEL, `${product.barcode}.png`);
        if (!existsSync(png)) {
          reject("ml_unavailable");
          return;
        }
        const image = await processMlCutout(png, { maxSize: IMAGE_MAX_SIZE });
        if (!image.isCutout) {
          mlRejections[image.rejectReason!] = (mlRejections[image.rejectReason!] ?? 0) + 1;
          reject("cutout_rejected");
          return;
        }
        const q = computeQuality(product, { isCutout: true, backgroundScore: image.backgroundScore, sourceWidth: image.sourceWidth, sourceHeight: image.sourceHeight });
        cuts.push({ product, image, method: "ia", score: q.score - 15, issues: q.issues });
      });
    }
  } else if (mlQueue.length > 0) {
    for (let i = 0; i < mlQueue.length; i++) reject("cutout_rejected");
  }
  console.log(`  ${cuts.filter((c) => c.method === "ia").length} détourages IA validés.`);

  // 4. Sélection par rayon : uniquement des emballages détourés.
  const selected: Cut[] = [];
  const categoryStats: Array<{ slug: CategorySlug; name: string; target: number; available: number; selected: number; packshot: number; ia: number }> = [];
  for (const category of CATEGORIES) {
    const target = CATEGORY_TARGETS[category.slug];
    const pool = cuts.filter((c) => c.product.category === category.slug).sort((a, b) => b.score - a.score || b.product.popularity - a.product.popularity);
    const brandCap = Math.max(3, Math.ceil(target / 9));
    const perBrand = new Map<string, number>();
    const picks: Cut[] = [];
    for (const c of pool) {
      if (picks.length >= target) break;
      const key = c.product.brandSlug ?? `_${c.product.barcode}`;
      if ((perBrand.get(key) ?? 0) >= brandCap) continue;
      perBrand.set(key, (perBrand.get(key) ?? 0) + 1);
      picks.push(c);
    }
    // Rayon encore clairsemé : on relâche le plafond par marque.
    for (const c of pool) {
      if (picks.length >= target) break;
      if (!picks.includes(c)) picks.push(c);
    }
    picks.sort((a, b) => b.score - a.score || b.product.popularity - a.product.popularity);
    selected.push(...picks);
    categoryStats.push({
      slug: category.slug,
      name: category.name,
      target,
      available: pool.length,
      selected: picks.length,
      packshot: picks.filter((p) => p.method === "fond-uni").length,
      ia: picks.filter((p) => p.method === "ia").length,
    });
    console.log(`🛒 ${category.name.padEnd(34)} ${String(picks.length).padStart(3)} / ${target}  (fond uni ${picks.filter((p) => p.method === "fond-uni").length}, IA ${picks.filter((p) => p.method === "ia").length})`);
  }

  // 5. Images finales et planches de contrôle.
  await mkdir(OUTPUT_IMAGES, { recursive: true });
  for (const c of selected) await writeFile(path.join(OUTPUT_IMAGES, `${c.product.barcode}.webp`), c.image.buffer);
  const keep = new Set(selected.map((c) => `${c.product.barcode}.webp`));
  for (const file of await readdir(OUTPUT_IMAGES)) {
    if (file.endsWith(".webp") && !keep.has(file)) await rm(path.join(OUTPUT_IMAGES, file));
  }
  await writeQaSheets(selected);

  // 6. Instantané versionné.
  const rankByCategory = new Map<string, number>();
  const products: SnapshotProduct[] = selected.map(({ product: p, image, method, score, issues }) => {
    const rank = (rankByCategory.get(p.category) ?? 0) + 1;
    rankByCategory.set(p.category, rank);
    return {
      barcode: p.barcode,
      source: p.site,
      sourceUrl: `${OFF_SITE_HOSTS[p.site]}/product/${p.barcode}`,
      name: p.name,
      rawName: p.rawName,
      genericName: p.genericName,
      brand: p.brand,
      brandSlug: p.brandSlug,
      rawBrands: p.rawBrands,
      quantityLabel: p.quantityLabel,
      netAmount: p.netAmount,
      netUnit: p.netUnit,
      category: p.category,
      subshelf: p.subshelf,
      categoriesTags: p.categoriesTags,
      labelsTags: p.labelsTags,
      organic: p.organic,
      nutriscoreGrade: p.nutriscoreGrade,
      novaGroup: p.novaGroup,
      ingredientsText: p.ingredientsText,
      allergens: p.allergens,
      traces: p.traces,
      nutrition: p.nutrition,
      servingSize: p.servingSize,
      popularity: p.popularity,
      lastModifiedAt: p.lastModifiedAt,
      shelfRank: rank,
      qualityScore: score,
      qualityIssues: issues,
      image: {
        path: `/catalog/images/${p.barcode}.webp`,
        originalUrl: p.imageUrl,
        width: image.width,
        height: image.height,
        isCutout: true,
        cutoutMethod: method,
        backgroundScore: image.backgroundScore,
        dominantColor: image.dominantColor,
        uploader: p.imageUploader,
        license: "CC-BY-SA-3.0",
        attribution: `Photo ${p.imageUploader ? `de ${p.imageUploader} ` : ""}— ${OFF_SITE_LABELS[p.site]}, CC BY-SA 3.0`,
      },
    };
  });

  const generatedAt = new Date().toISOString();
  const snapshot: SnapshotFile = {
    generatedAt,
    license: {
      data: "Open Database License (ODbL) 1.0 — https://opendatacommons.org/licenses/odbl/1-0/",
      images: "Creative Commons Attribution-ShareAlike 3.0 — https://creativecommons.org/licenses/by-sa/3.0/deed.fr",
      attribution:
        "Données et photos issues d'Open Food Facts, Open Beauty Facts, Open Products Facts et Open Pet Food Facts (contributeurs). Les marques citées appartiennent à leurs propriétaires respectifs.",
    },
    count: products.length,
    products,
  };
  await mkdir(path.dirname(SNAPSHOT_FILE), { recursive: true });
  await writeFile(SNAPSHOT_FILE, `${JSON.stringify(snapshot, null, 1)}\n`);

  const report = {
    generatedAt,
    totals: {
      candidates: candidates.length,
      valid: normalized.length,
      duplicates: removed.length,
      cutoutPackshot: cuts.filter((c) => c.method === "fond-uni").length,
      cutoutAi: cuts.filter((c) => c.method === "ia").length,
      selected: products.length,
      target: Object.values(CATEGORY_TARGETS).reduce((s, n) => s + n, 0),
    },
    rejections,
    aiRejections: mlRejections,
    screeningRejections: screening,
    categories: categoryStats,
    duplicates: removed.slice(0, 200).map((r) => ({ barcode: r.product.barcode, name: r.product.name, duplicateOf: r.duplicateOf })),
  };
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 1)}\n`);
  await writeFile(REPORT_MD, renderMarkdownReport(report));
  await writeAttributions(products);

  console.log(`\n✅ Catalogue construit : ${products.length} produits réels, tous détourés (${report.totals.cutoutPackshot} packshots, ${report.totals.cutoutAi} IA disponibles).`);
  console.log(`   Planches de contrôle : .cache/catalog/qa/ — rapport : docs/CATALOGUE-RAPPORT.md`);
  console.log(`   Étape suivante : pnpm db:seed`);
}

/** Planches de contrôle visuel par rayon (revue humaine des détourages). */
async function writeQaSheets(selected: Cut[]) {
  const dir = path.join(CACHE_DIR, "qa");
  await mkdir(dir, { recursive: true });
  for (const category of CATEGORIES) {
    const items = selected.filter((c) => c.product.category === category.slug);
    if (items.length === 0) continue;
    const cell = 150;
    const cols = 8;
    const rows = Math.ceil(items.length / cols);
    const tiles = await Promise.all(
      items.map(async (c) => {
        const img = await sharp(c.image.buffer).resize(cell - 20, cell - 34, { fit: "inside" }).toBuffer();
        const label = Buffer.from(
          `<svg width="${cell}" height="18"><text x="4" y="13" font-size="11" font-family="sans-serif" fill="${c.method === "ia" ? "#b93c0c" : "#14532d"}">${c.product.barcode}${c.method === "ia" ? " IA" : ""}</text></svg>`,
        );
        return sharp({ create: { width: cell, height: cell, channels: 4, background: "#f4f1e6" } })
          .composite([
            { input: img, gravity: "center" },
            { input: label, top: cell - 18, left: 0 },
          ])
          .png()
          .toBuffer();
      }),
    );
    await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: "#ffffff" } })
      .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * cell, top: Math.floor(i / cols) * cell })))
      .jpeg({ quality: 78 })
      .toFile(path.join(dir, `${category.slug}.jpg`));
  }
}

async function writeAttributions(products: SnapshotProduct[]) {
  const lines = [
    "# Attribution des photos",
    "",
    "Photos d'emballages issues des contributeurs d'Open Food Facts et de ses bases sœurs, sous licence CC BY-SA 3.0.",
    "Les versions publiées ici sont des adaptations (détourage automatique, recadrage, redimensionnement) sous la même licence.",
    "",
    "| Code-barres | Produit | Auteur (contributeur) | Source |",
    "| --- | --- | --- | --- |",
    ...products.map((p) => `| ${p.barcode} | ${p.name.replace(/\|/g, "/")} | ${p.image.uploader ?? "contributeurs"} | ${p.image.originalUrl} |`),
    "",
  ];
  await writeFile(path.join(OUTPUT_IMAGES, "ATTRIBUTIONS.md"), lines.join("\n"));
}

const REASON_LABELS: Record<string, string> = {
  invalid_barcode: "Code-barres invalide (clé de contrôle GTIN)",
  restricted_barcode: "Code interne magasin (préfixe 2)",
  missing_name: "Nom absent, numérique ou hors alphabet latin",
  name_is_brand: "Nom identique à la marque (non informatif)",
  missing_brand: "Marque absente",
  retailer_brand: "Marque de distributeur (exclue : prix fictifs)",
  missing_image: "Photo de face absente ou hors domaine officiel",
  not_sold_in_france: "Produit non référencé comme vendu en France",
  excluded_category: "Catégorie exclue (alcool, compléments, tabac…)",
  no_category: "Aucun rayon cohérent",
  fetch_error: "Fiche indisponible lors de la collecte",
  rejected_after_v3: "Fiche détaillée non conforme",
  image_error: "Photo illisible ou trop petite",
  cutout_rejected: "Emballage impossible à détourer proprement (photo en situation)",
  ml_unavailable: "Détourage IA non exécuté",
  manual_review: "Détourage refusé lors de la revue visuelle",
};

function renderMarkdownReport(report: {
  generatedAt: string;
  totals: Record<string, number>;
  rejections: Record<string, number>;
  aiRejections: Record<string, number>;
  screeningRejections: Record<string, number>;
  categories: Array<{ name: string; target: number; available: number; selected: number; packshot: number; ia: number }>;
}): string {
  const t = report.totals;
  const lines: string[] = [];
  lines.push("# Rapport d'import du catalogue");
  lines.push("");
  lines.push(`_Généré automatiquement par \`pnpm catalog:build\` le ${new Date(report.generatedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}._`);
  lines.push("");
  lines.push("## Synthèse");
  lines.push("");
  lines.push(`- **${t.selected} produits réels importés** (objectif indicatif : ${t.target}).`);
  lines.push(`- **Tous les emballages en rayon sont détourés** : ${t.cutoutPackshot} packshots sur fond uni détourés géométriquement, ${t.cutoutAi} détourages par IA validés (avant sélection).`);
  lines.push(`- ${t.candidates} candidats examinés, ${t.valid} fiches conformes, ${t.duplicates} doublons écartés.`);
  lines.push("- Les photos prises en main, en rayon ou sur une table, impossibles à détourer proprement, sont écartées.");
  lines.push("- Aucune donnée n'est inventée : les champs absents des fiches sources restent vides et sont signalés comme tels dans l'interface.");
  lines.push("");
  lines.push("## Rayons");
  lines.push("");
  lines.push("| Rayon | Importés | Objectif | Emballages détourés disponibles | Packshots | Détourage IA |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
  for (const c of report.categories) lines.push(`| ${c.name} | ${c.selected} | ${c.target} | ${c.available} | ${c.packshot} | ${c.ia} |`);
  lines.push("");
  const gaps = report.categories.filter((c) => c.selected < c.target);
  lines.push("## Manques et explications");
  lines.push("");
  if (gaps.length === 0) lines.push("Tous les rayons atteignent leur objectif.");
  else {
    for (const c of gaps) {
      lines.push(`- **${c.name}** : ${c.selected}/${c.target}. Seules ${c.available} fiches conformes disposent d'une photo d'emballage détourable proprement parmi les candidats collectés.`);
    }
    lines.push("");
    lines.push(
      "Pour combler un manque : ajouter des requêtes (catégories ou marques) dans `scripts/catalog/sources.ts` puis relancer `pnpm catalog:import`, ou contribuer une photo de face sur fond uni sur Open Food Facts : elle profitera à tous.",
    );
  }
  lines.push("");
  lines.push("## Motifs de rejet");
  lines.push("");
  lines.push("| Motif | Pré-sélection (recherche) | Fiches détaillées |");
  lines.push("| --- | ---: | ---: |");
  const reasons = new Set([...Object.keys(report.screeningRejections), ...Object.keys(report.rejections)]);
  for (const r of reasons) lines.push(`| ${REASON_LABELS[r] ?? r} | ${report.screeningRejections[r] ?? 0} | ${report.rejections[r] ?? 0} |`);
  if (Object.keys(report.aiRejections).length > 0) {
    lines.push("");
    lines.push("Détourages IA refusés par le contrôle qualité :");
    lines.push("");
    for (const [reason, count] of Object.entries(report.aiRejections)) lines.push(`- ${reason} : ${count}`);
  }
  lines.push("");
  lines.push("## Licences");
  lines.push("");
  lines.push("- Données : Open Database License (ODbL) 1.0 — © contributeurs Open Food Facts et bases sœurs.");
  lines.push("- Photos : Creative Commons BY-SA 3.0 — auteur et source de chaque photo dans `public/catalog/images/ATTRIBUTIONS.md`.");
  lines.push("- Les prix affichés par MON MARCHÉ ne proviennent pas de ces bases : ce sont des prix fictifs de démonstration.");
  lines.push("");
  return lines.join("\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
