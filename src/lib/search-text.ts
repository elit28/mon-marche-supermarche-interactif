/**
 * Normalisation de texte pour la recherche : minuscules, sans accents,
 * ligatures françaises dépliées (œ → oe, æ → ae), espaces compactés.
 * Utilisée côté serveur (indexation) et côté client (surlignage, filtres).
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLocaleLowerCase("fr-FR")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`´]/g, " ")
    .replace(/[^a-z0-9%&+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set(["de", "du", "des", "la", "le", "les", "l", "d", "et", "a", "au", "aux", "en", "un", "une", "pour", "avec"]);

/** Racine très simple pour le français : retire le pluriel (s, x) des mots longs. */
export function stemFr(token: string): string {
  if (token.length > 4 && /(eaux|aux)$/.test(token)) return token.replace(/x$/, "");
  if (token.length > 3 && /[sx]$/.test(token) && !/(ss|us|is)$/.test(token)) return token.slice(0, -1);
  return token;
}

/** Découpe une requête en jetons utiles (sans mots vides, racinisés). */
export function tokenizeQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(" ")
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))
    .map(stemFr)
    .slice(0, 8);
}
