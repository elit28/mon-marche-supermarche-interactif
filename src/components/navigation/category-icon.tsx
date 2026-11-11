/** Pictogrammes des rayons (dessinés pour MON MARCHÉ, trait 1,75 px). */
import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  "fruits-legumes": (
    <>
      <path d="M12 7.5c-1.2-1.6-4.6-1.8-6 .6-1.6 2.7-.4 7.9 2.6 10.6 1.3 1.2 2.4.8 3.4.3 1 .5 2.1.9 3.4-.3 3-2.7 4.2-7.9 2.6-10.6-1.4-2.4-4.8-2.2-6-.6Z" />
      <path d="M12 7.5c0-2 .8-3.4 2.5-4" />
    </>
  ),
  "produits-laitiers-oeufs": (
    <>
      <path d="M9 3.5h6M9.5 3.5v2.6L7.5 9.5V20a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V9.5l-2-3.4V3.5" />
      <path d="M7.5 13h9" />
    </>
  ),
  fromages: (
    <>
      <path d="M3.5 15.5 13 6.5l7.5 6v6a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-3Z" />
      <path d="M3.5 15.5h17M8 18v.1M15 17v.1M12.5 13v.1" />
    </>
  ),
  "viandes-charcuterie": (
    <>
      <path d="M15.5 4.5c2.7 1.4 4 4.6 2.6 7.4-1.2 2.4-4 3.3-5.6 5.2-1.6 1.9-4.6 2.5-6.3.6-1.8-1.9-1.2-4.9.8-6.3 1.9-1.4 2.5-4.3 4.5-6 1.3-1.1 2.9-1.6 4-.9Z" />
      <circle cx="13" cy="10" r="1.6" />
    </>
  ),
  "poissons-produits-mer": (
    <>
      <path d="M3.5 12c2.8-3.6 6-5.2 9.3-5.2 3.4 0 6 2.3 7.7 5.2-1.7 2.9-4.3 5.2-7.7 5.2-3.3 0-6.5-1.6-9.3-5.2Z" />
      <path d="M3.5 12 2 9M3.5 12 2 15M16.5 11.2v.1" />
    </>
  ),
  "boulangerie-patisserie": (
    <>
      <path d="M4 12.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5c0 3-1.7 5.5-4 5.5H8c-2.3 0-4-2.5-4-5.5Z" />
      <path d="M8.5 8.5 10 11M12 7.5V11M15.5 8.5 14 11" />
    </>
  ),
  "pates-riz-feculents": (
    <>
      <path d="M6 20.5 16 3.5M9 20.5 18.5 4.5M12 20.5l8.5-14" />
      <path d="M4.5 20.5h15" />
    </>
  ),
  "conserves-epicerie-salee": (
    <>
      <ellipse cx="12" cy="6" rx="6.5" ry="2.2" />
      <path d="M5.5 6v12c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2V6M5.5 10.5c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2" />
    </>
  ),
  "biscuits-gateaux": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 9v.1M14.5 8.5v.1M15.5 14v.1M10 15v.1M12 12v.1" />
    </>
  ),
  "chocolats-confiseries": (
    <>
      <rect x="5.5" y="3.5" width="13" height="17" rx="1.5" />
      <path d="M5.5 9.2h13M5.5 14.8h13M12 3.5v17" />
    </>
  ),
  "petit-dejeuner": (
    <>
      <path d="M4.5 9.5h12v4.5a5.5 5.5 0 0 1-5.5 5.5H10A5.5 5.5 0 0 1 4.5 14V9.5Z" />
      <path d="M16.5 11h1.2a2.3 2.3 0 0 1 0 4.6h-1.6M8 3.5c-.6.9.6 1.6 0 2.5M11.5 3.5c-.6.9.6 1.6 0 2.5" />
    </>
  ),
  "boissons-eaux": (
    <>
      <path d="M10 3.5h4v3l1.5 2.5v10.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V9L10 6.5v-3Z" />
      <path d="M8.5 12.5h7" />
    </>
  ),
  surgeles: (
    <>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
      <path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" />
    </>
  ),
  "produits-bio": (
    <>
      <path d="M5 19c0-8 5-13.5 15-14-.4 9.6-6 15-14 15" />
      <path d="M5 19c3-4 6-6.5 10-8.5" />
    </>
  ),
  "hygiene-beaute": (
    <>
      <path d="M9 7.5h6l1 3v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9l1-3Z" />
      <path d="M10.5 7.5v-4h3v4M13.5 4.5h3" />
    </>
  ),
  "entretien-maison": (
    <>
      <path d="M8 9.5h6.5l1.5 2.5v8a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-8L8 9.5Z" />
      <path d="M9.5 9.5v-3h3.5l3.5 1.5M18.5 5.5l1.5-1M18.5 8l2 .3" />
    </>
  ),
  bebe: (
    <>
      <path d="M10 3.5h4v2.5h-4zM9 6h6l.5 2v11a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 19V8l.5-2Z" />
      <path d="M9 11.5h6.5M9 15h6.5" />
    </>
  ),
  animaux: (
    <>
      <ellipse cx="12" cy="15.5" rx="3.6" ry="3" />
      <circle cx="6.5" cy="11" r="1.6" />
      <circle cx="9.5" cy="6.8" r="1.6" />
      <circle cx="14.5" cy="6.8" r="1.6" />
      <circle cx="17.5" cy="11" r="1.6" />
    </>
  ),
};

export function CategoryIcon({ slug, size = 20, className }: { slug: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[slug] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}
