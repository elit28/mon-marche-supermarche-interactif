import localFont from "next/font/local";

/** Fraunces (axes graisse + douceur) pour les titres : chaleur d'une enseigne peinte. */
export const fraunces = localFont({
  src: "./fonts/fraunces-soft.woff2",
  variable: "--font-fraunces",
  weight: "300 900",
  display: "swap",
  preload: true,
});

/** Figtree pour le texte et les prix : géométrique, très lisible en petit. */
export const figtree = localFont({
  src: "./fonts/figtree.woff2",
  variable: "--font-figtree",
  weight: "300 900",
  display: "swap",
  preload: true,
});
