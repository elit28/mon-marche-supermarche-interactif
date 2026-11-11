/**
 * Contrôle qualité et détourage automatique des photos d'emballage.
 *
 * Méthode (sans IA générative, sans altérer le produit) :
 * 1. On estime la couleur du fond à partir des bords de l'image.
 * 2. Si le fond est clair et homogène (photo « packshot »), on le supprime par
 *    remplissage depuis les bords, en s'arrêtant sur les contours du produit
 *    (seuil de couleur + seuil de gradient), puis on adoucit le liseré.
 * 3. Sinon, la photo est conservée telle quelle (non détourée) et signalée.
 *
 * Le résultat est une image WebP (avec transparence si détourée), recadrée
 * au plus près de l'emballage, proportions d'origine conservées.
 */
import sharp, { type Sharp } from "sharp";

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  isCutout: boolean;
  /** Homogénéité du fond (0–1) : proportion des bords proches de la couleur de fond. */
  backgroundScore: number;
  /** Part de l'image occupée par le produit après détourage (0–1). */
  foregroundRatio: number;
  /** Solidité de la silhouette détourée (0–1), 0 si non détourée. */
  solidity: number;
  dominantColor: string;
  sourceWidth: number;
  sourceHeight: number;
}

export interface ProcessOptions {
  /** Taille maximale du plus grand côté de l'image produite. */
  maxSize: number;
  /** Taille de travail (analyse) ; l'image est réduite avant traitement. */
  workSize?: number;
  quality?: number;
  /** Solidité minimale de la silhouette pour accepter le détourage (0–1). */
  minSolidity?: number;
}

const EDGE_SOFTNESS = 38;
const GRADIENT_LIMIT = 26;

function colorDistance(data: Uint8Array, i: number, r: number, g: number, b: number): number {
  const dr = data[i]! - r;
  const dg = data[i + 1]! - g;
  const db = data[i + 2]! - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

export async function processProductImage(input: Buffer | string, options: ProcessOptions): Promise<ProcessedImage> {
  const workSize = options.workSize ?? Math.max(options.maxSize, 640);
  const base = sharp(input, { failOn: "error" }).rotate();
  const meta = await base.metadata();
  const sourceWidth = meta.autoOrient?.width ?? meta.width ?? 0;
  const sourceHeight = meta.autoOrient?.height ?? meta.height ?? 0;
  if (sourceWidth < 120 || sourceHeight < 120) throw new Error(`image trop petite (${sourceWidth}×${sourceHeight})`);

  const { data, info } = await base
    .clone()
    .resize({ width: workSize, height: workSize, fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  // 1. Analyse des bords : un fond « packshot » est clair, neutre et continu.
  const frame = 3;
  const borderIdx: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < frame || y < frame || x >= w - frame || y >= h - frame) borderIdx.push((y * w + x) * 4);
    }
  }
  const lum = (i: number) => 0.2126 * px[i]! + 0.7152 * px[i + 1]! + 0.0722 * px[i + 2]!;
  const chr = (i: number) => Math.max(px[i]!, px[i + 1]!, px[i + 2]!) - Math.min(px[i]!, px[i + 1]!, px[i + 2]!);
  const isNeutralLight = (i: number, minLum: number, maxChroma: number) => lum(i) > minLum && chr(i) < maxChroma;
  const lightBorderIdx = borderIdx.filter((i) => isNeutralLight(i, 150, 30));
  const backgroundScore = lightBorderIdx.length / borderIdx.length;
  const ref = lightBorderIdx.length > 0 ? lightBorderIdx : borderIdx;
  const bgR = median(ref.map((i) => px[i]!));
  const bgG = median(ref.map((i) => px[i + 1]!));
  const bgB = median(ref.map((i) => px[i + 2]!));
  // Tolérance adaptative : serrée pour un fond blanc pur (packshot fabricant),
  // plus large pour un fond clair éclairé en dégradé.
  const spread = ref.map((i) => colorDistance(px, i, bgR, bgG, bgB)).sort((a, b) => a - b);
  const p90 = spread[Math.floor(spread.length * 0.9)] ?? 0;
  const tolerance = Math.min(42, Math.max(12, p90 * 1.5 + 8));
  const canCutout = backgroundScore > 0.62;

  let isCutout = false;
  let alpha: Uint8Array | null = null;
  let foregroundRatio = 1;
  let solidity = 0;

  if (canCutout) {
    // 2. Remplissage « baguette magique » depuis les bords : on avance de proche en
    //    proche tant que le pixel reste clair, neutre et sans contour franc. Le fond
    //    peut ainsi présenter un léger dégradé d'éclairage.
    const bg = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0;
    let tail = 0;
    for (const i of borderIdx) {
      const p = i / 4;
      if (!bg[p] && isNeutralLight(i, 150, 30) && colorDistance(px, i, bgR, bgG, bgB) <= tolerance) {
        bg[p] = 1;
        queue[tail++] = p;
      }
    }
    while (head < tail) {
      const p = queue[head++]!;
      const x = p % w;
      const y = (p - x) / w;
      const i = p * 4;
      const neighbors = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const n of neighbors) {
        if (n < 0 || bg[n]) continue;
        const j = n * 4;
        if (!isNeutralLight(j, 135, 34)) continue;
        if (colorDistance(px, j, bgR, bgG, bgB) > tolerance) continue;
        const gradient = Math.abs(px[j]! - px[i]!) + Math.abs(px[j + 1]! - px[i + 1]!) + Math.abs(px[j + 2]! - px[i + 2]!);
        if (gradient > GRADIENT_LIMIT) continue;
        bg[n] = 1;
        queue[tail++] = n;
      }
    }

    // 3. Suppression des petites taches isolées (poussières, reflets du fond).
    const label = new Int32Array(w * h).fill(-1);
    const sizes: number[] = [];
    for (let p = 0; p < w * h; p++) {
      if (bg[p] || label[p] !== -1) continue;
      const id = sizes.length;
      let size = 0;
      head = 0;
      tail = 0;
      queue[tail++] = p;
      label[p] = id;
      while (head < tail) {
        const q = queue[head++]!;
        size++;
        const x = q % w;
        const y = (q - x) / w;
        const neighbors = [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1];
        for (const n of neighbors) {
          if (n >= 0 && !bg[n] && label[n] === -1) {
            label[n] = id;
            queue[tail++] = n;
          }
        }
      }
      sizes.push(size);
    }
    const minComponent = Math.max(40, w * h * 0.004);
    let fgCount = 0;
    const fg = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      if (!bg[p] && sizes[label[p]!]! >= minComponent) {
        fg[p] = 1;
        fgCount++;
      }
    }
    foregroundRatio = fgCount / (w * h);

    // Contrôle de « solidité » de la silhouette : si le remplissage a mordu dans un
    // emballage clair (fuite), la silhouette présente des creux anormaux. On compare
    // l'aire détourée à l'aire comprise entre les extrémités de chaque ligne et colonne.
    let rowSpan = 0;
    for (let y = 0; y < h; y++) {
      let min = -1;
      let max = -1;
      for (let x = 0; x < w; x++) {
        if (fg[y * w + x]) {
          if (min < 0) min = x;
          max = x;
        }
      }
      if (min >= 0) rowSpan += max - min + 1;
    }
    let colSpan = 0;
    for (let x = 0; x < w; x++) {
      let min = -1;
      let max = -1;
      for (let y = 0; y < h; y++) {
        if (fg[y * w + x]) {
          if (min < 0) min = y;
          max = y;
        }
      }
      if (min >= 0) colSpan += max - min + 1;
    }
    solidity = fgCount > 0 ? Math.min(fgCount / Math.max(rowSpan, 1), fgCount / Math.max(colSpan, 1)) : 0;

    if (foregroundRatio > 0.08 && foregroundRatio < 0.95 && solidity >= (options.minSolidity ?? 0.9)) {
      // 4. Liseré adouci : flou 3×3 du masque + transparence progressive près du fond.
      alpha = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          let sum = 0;
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              sum += fg[ny * w + nx]!;
              count++;
            }
          }
          let a = (sum / count) * 255;
          if (fg[p] && sum < count) {
            // Pixel de bord : plus il ressemble au fond, plus il devient transparent.
            const d = colorDistance(px, p * 4, bgR, bgG, bgB);
            a *= Math.min(1, 0.35 + d / (EDGE_SOFTNESS * 2.2));
          }
          alpha[p] = Math.round(a);
        }
      }
      isCutout = true;
    }
  }

  // Couleur dominante (pixels du produit, pondérés par la saturation).
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sw = 0;
  for (let p = 0; p < w * h; p += 3) {
    if (alpha && alpha[p]! < 200) continue;
    const i = p * 4;
    const r = px[i]!;
    const g = px[i + 1]!;
    const b = px[i + 2]!;
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    const weight = 0.05 + sat * sat;
    sr += r * weight;
    sg += g * weight;
    sb += b * weight;
    sw += weight;
  }
  const dominantColor = sw > 0 ? toHex(sr / sw, sg / sw, sb / sw) : "#cccccc";

  let pipeline: Sharp;
  if (alpha) {
    const rgba = Buffer.from(px);
    for (let p = 0; p < w * h; p++) rgba[p * 4 + 3] = alpha[p]!;
    const png = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    pipeline = sharp(png).trim({ threshold: 1 });
  } else {
    // Photo non détourée : on retire seulement les marges unies éventuelles.
    const png = await sharp(Buffer.from(px), { raw: { width: w, height: h, channels: 4 } }).removeAlpha().png().toBuffer();
    pipeline = sharp(png).trim({ background: toHex(bgR, bgG, bgB), threshold: 18 });
  }

  const trimmed = await pipeline.png().toBuffer();
  const output = await sharp(trimmed)
    .resize({ width: options.maxSize, height: options.maxSize, fit: "inside", withoutEnlargement: true })
    .webp({ quality: options.quality ?? 80, alphaQuality: 90, effort: 5, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    width: output.info.width,
    height: output.info.height,
    isCutout,
    backgroundScore: Math.round(backgroundScore * 1000) / 1000,
    foregroundRatio: Math.round(foregroundRatio * 1000) / 1000,
    solidity: Math.round(solidity * 1000) / 1000,
    dominantColor,
    sourceWidth,
    sourceHeight,
  };
}

/**
 * Analyse rapide d'un aperçu : la photo est-elle un « packshot » (fond uni,
 * détourage automatique réussi) ? Sert au tri des candidats avant collecte.
 */
export async function analyzeBackground(input: Buffer | string): Promise<{ packshot: boolean; backgroundScore: number }> {
  const result = await processProductImage(input, { maxSize: 240, workSize: 400 });
  return { packshot: result.isCutout, backgroundScore: result.backgroundScore };
}

/* -------------------------------------------------------------------------- */
/* Détourage par IA : validation stricte du masque produit par le modèle       */
/* -------------------------------------------------------------------------- */

export interface MlCutoutResult extends ProcessedImage {
  /** Motif de rejet si le détourage n'est pas jugé fiable. */
  rejectReason: string | null;
  semiTransparentRatio: number;
  largestComponentShare: number;
  borderBackgroundRatio: number;
}

/**
 * Valide et finalise un détourage produit par le modèle de segmentation.
 * On n'accepte qu'une silhouette unique, pleine, nettement opaque, et dont le
 * fond d'origine a bien été retiré (sinon l'IA a probablement découpé un détail
 * de l'emballage plutôt que l'emballage).
 */
export async function processMlCutout(pngFile: string, options: ProcessOptions): Promise<MlCutoutResult> {
  const workSize = options.workSize ?? 900;
  const meta = await sharp(pngFile).metadata();
  const { data, info } = await sharp(pngFile)
    .resize({ width: workSize, height: workSize, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const total = w * h;

  // Masque binaire et composantes connexes.
  const fg = new Uint8Array(total);
  let opaque = 0;
  let semi = 0;
  for (let p = 0; p < total; p++) {
    const a = px[p * 4 + 3]!;
    if (a > 128) fg[p] = 1;
    if (a > 30) {
      opaque++;
      if (a < 225) semi++;
    }
  }
  const label = new Int32Array(total).fill(-1);
  const sizes: number[] = [];
  const queue = new Int32Array(total);
  for (let p = 0; p < total; p++) {
    if (!fg[p] || label[p] !== -1) continue;
    const id = sizes.length;
    let size = 0;
    let head = 0;
    let tail = 0;
    queue[tail++] = p;
    label[p] = id;
    while (head < tail) {
      const q = queue[head++]!;
      size++;
      const x = q % w;
      const y = (q - x) / w;
      for (const n of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1]) {
        if (n >= 0 && fg[n] && label[n] === -1) {
          label[n] = id;
          queue[tail++] = n;
        }
      }
    }
    sizes.push(size);
  }
  const fgTotal = sizes.reduce((s, n) => s + n, 0);
  const largest = sizes.length > 0 ? Math.max(...sizes) : 0;
  const largestId = sizes.indexOf(largest);
  // On ne garde que la silhouette principale (et les pièces significatives).
  const keepMin = Math.max(40, largest * 0.08);
  let kept = 0;
  for (let p = 0; p < total; p++) {
    if (fg[p] && sizes[label[p]!]! < keepMin) fg[p] = 0;
    if (fg[p]) kept++;
  }

  let rowSpan = 0;
  for (let y = 0; y < h; y++) {
    let min = -1;
    let max = -1;
    for (let x = 0; x < w; x++) {
      if (fg[y * w + x]) {
        if (min < 0) min = x;
        max = x;
      }
    }
    if (min >= 0) rowSpan += max - min + 1;
  }
  let colSpan = 0;
  for (let x = 0; x < w; x++) {
    let min = -1;
    let max = -1;
    for (let y = 0; y < h; y++) {
      if (fg[y * w + x]) {
        if (min < 0) min = y;
        max = y;
      }
    }
    if (min >= 0) colSpan += max - min + 1;
  }
  const solidity = kept > 0 ? Math.min(kept / Math.max(rowSpan, 1), kept / Math.max(colSpan, 1)) : 0;

  let borderTotal = 0;
  let borderBg = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x > 1 && y > 1 && x < w - 2 && y < h - 2) continue;
      borderTotal++;
      if (px[(y * w + x) * 4 + 3]! < 50) borderBg++;
    }
  }

  const foregroundRatio = kept / total;
  const semiTransparentRatio = opaque > 0 ? semi / opaque : 1;
  const largestComponentShare = fgTotal > 0 ? largest / fgTotal : 0;
  const borderBackgroundRatio = borderBg / Math.max(borderTotal, 1);

  let rejectReason: string | null = null;
  if (largestId < 0 || foregroundRatio < 0.12) rejectReason = "silhouette trop petite (détail isolé)";
  else if (foregroundRatio > 0.95) rejectReason = "aucun fond retiré";
  else if (semiTransparentRatio > 0.07) rejectReason = "masque incertain (zones semi-transparentes)";
  else if (largestComponentShare < 0.93) rejectReason = "silhouette fragmentée";
  else if (solidity < 0.88) rejectReason = "silhouette irrégulière";
  else if (borderBackgroundRatio < 0.55) rejectReason = "photo recadrée au ras de l'emballage";

  // Alpha nettoyé (composantes parasites retirées) puis liseré légèrement adouci.
  const rgba = Buffer.from(px);
  for (let p = 0; p < total; p++) if (!fg[p]) rgba[p * 4 + 3] = 0;
  const cleaned = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  const alphaSoft = await sharp(cleaned).extractChannel(3).blur(0.6).toBuffer();
  const rgb = await sharp(cleaned).removeAlpha().toBuffer();
  // Attention : `trim` dans le même pipeline que `joinChannel` assombrit les couleurs
  // (bogue de libvips) — on matérialise l'image avant de la recadrer.
  const joinedFull = await sharp(rgb).joinChannel(alphaSoft).png().toBuffer();
  const joined = await sharp(joinedFull).trim({ threshold: 1 }).png().toBuffer();
  const output = await sharp(joined)
    .resize({ width: options.maxSize, height: options.maxSize, fit: "inside", withoutEnlargement: true })
    .webp({ quality: options.quality ?? 80, alphaQuality: 90, effort: 5, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });

  // Couleur dominante du produit.
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sw = 0;
  for (let p = 0; p < total; p += 3) {
    if (!fg[p]) continue;
    const r = px[p * 4]!;
    const g = px[p * 4 + 1]!;
    const b = px[p * 4 + 2]!;
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    const weight = 0.05 + sat * sat;
    sr += r * weight;
    sg += g * weight;
    sb += b * weight;
    sw += weight;
  }

  return {
    buffer: output.data,
    width: output.info.width,
    height: output.info.height,
    isCutout: rejectReason === null,
    backgroundScore: Math.round(borderBackgroundRatio * 1000) / 1000,
    foregroundRatio: Math.round(foregroundRatio * 1000) / 1000,
    solidity: Math.round(solidity * 1000) / 1000,
    dominantColor: sw > 0 ? toHex(sr / sw, sg / sw, sb / sw) : "#cccccc",
    sourceWidth: meta.width ?? w,
    sourceHeight: meta.height ?? h,
    rejectReason,
    semiTransparentRatio: Math.round(semiTransparentRatio * 1000) / 1000,
    largestComponentShare: Math.round(largestComponentShare * 1000) / 1000,
    borderBackgroundRatio: Math.round(borderBackgroundRatio * 1000) / 1000,
  };
}
