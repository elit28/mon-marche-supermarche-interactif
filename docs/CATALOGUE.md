# Le catalogue : sources, pipeline d'import et qualité

MON MARCHÉ ne présente **que de vrais produits** vendus en France, issus des bases
ouvertes de la communauté Open Food Facts. Aucun code-barres, aucune photo, aucun
format ni aucune valeur nutritionnelle n'est inventé.

## Sources

| Base | Rayons alimentés | API |
| --- | --- | --- |
| [Open Food Facts](https://world.openfoodfacts.org) | 14 rayons alimentaires, bébé (alimentation) | recherche v2, fiche v3 |
| [Open Beauty Facts](https://world.openbeautyfacts.org) | Hygiène et beauté, soins bébé | recherche v2, fiche v3 |
| [Open Products Facts](https://world.openproductsfacts.org) | Entretien de la maison, change bébé | recherche v2, fiche v3 |
| [Open Pet Food Facts](https://world.openpetfoodfacts.org) | Produits pour animaux | recherche v2, fiche v3 |

Bonnes pratiques respectées (voir la [documentation officielle](https://openfoodfacts.github.io/documentation/)) :

- **User-Agent personnalisé** (`OFF_USER_AGENT`, ajoutez-y un contact) ;
- **limites d'usage** : 10 recherches / minute, 100 lectures de fiche / minute,
  attente exponentielle sur les réponses 429 et 5xx ;
- **cache disque** de toutes les réponses (`.cache/catalog/`) : un import interrompu
  reprend là où il s'était arrêté, et un nouvel import ne refait que le nécessaire ;
- l'API v2 sert à la **découverte structurée** (filtres catégorie / marque / label /
  pays, tri par popularité) ; l'API v3 sert à la **lecture des fiches**.

La recherche textuelle des visiteurs ne sollicite **jamais** l'API externe : elle
s'exécute sur notre base PostgreSQL (index trigrammes, tolérance aux accents et
aux fautes de frappe).

## Pipeline

```
pnpm catalog:fetch   → découverte, tri des photos, lecture des fiches (réseau, cache)
pnpm catalog:build   → normalisation, déduplication, détourage, sélection, instantané, rapport
pnpm db:seed         → import de l'instantané en base (idempotent)
# ou tout d'un coup :
pnpm catalog:import
```

### 1. Découverte (`scripts/catalog/sources.ts`)
Requêtes par catégorie Open Food Facts (deux pages de 100 produits) et par marque
(groupées par trois avec la syntaxe « OU » de l'API), limitées aux produits vendus
en France et triées par nombre de scans (les produits les plus courants d'abord).
La liste des marques n'est qu'un point de départ : seules les fiches existantes et
conformes sont retenues.

### 2. Contrôle qualité des fiches (`src/server/catalog/normalize.ts`)
Une fiche est écartée, avec un motif comptabilisé dans le rapport, si :

- le code-barres n'a pas une clé de contrôle GTIN valide (EAN-8, UPC-A, EAN-13, GTIN-14)
  ou s'il s'agit d'un code interne magasin (préfixe 2) ;
- le nom est absent, numérique, identique à la marque ou hors alphabet latin ;
- la marque est absente (sauf fruits et légumes) ou est une **marque de distributeur**
  (exclue : nos prix sont fictifs, ils ne doivent pas évoquer le tarif d'une enseigne) ;
- le produit n'est pas référencé comme vendu en France ;
- la catégorie est exclue (alcool, compléments alimentaires, tabac…) ou ne correspond
  à aucun rayon ;
- aucune photo de face n'est disponible sur un domaine officiel en HTTPS.

Normalisation **sans invention** : casse des noms écrits en capitales, marque et
quantité retirées du nom quand elles y sont répétées (elles sont affichées à part),
quantité nette calculée en g / ml pour le prix au kilo ou au litre. Les valeurs
absentes restent `null` et l'interface l'indique (« Information non renseignée »).

### 3. Rayons (`src/lib/catalog/categories.ts`)
18 rayons et leurs étagères. Des règles ordonnées (du plus spécifique au plus
général) associent les catégories Open Food Facts à nos rayons. Le rayon « Produits
bio » n'accueille que des produits dont le **label bio est déclaré** dans la fiche.
Toute correction faite dans l'administration est verrouillée et respectée par les
imports suivants.

### 4. Déduplication
Doublons exacts (même code-barres) puis quasi-doublons (même marque, même nom
normalisé, même format) : la fiche la plus consultée est conservée.

### 5. Photos : uniquement des emballages détourés
Comme dans les rayons de la vidéo de référence, un produit n'est mis en rayon que si
son emballage est **proprement détouré** :

1. **Tri** : l'aperçu 400 px de chaque candidat est analysé ; les photos sur fond
   clair et uni (« packshots ») sont prioritaires.
2. **Détourage géométrique** (`scripts/catalog/lib/image-process.ts`) : remplissage
   depuis les bords à tolérance adaptative, arrêt sur les contours, contrôle de la
   solidité de la silhouette (une fuite dans un emballage blanc est détectée et
   refusée), liseré adouci, recadrage au plus près, export WebP avec transparence.
3. **Détourage par IA, en secours** (`scripts/catalog/ml_cutout.py`) : segmentation
   IS-Net via [rembg](https://github.com/danielgatis/rembg) (licence MIT, modèle
   Apache 2.0), exécutée localement. Le résultat n'est accepté que si la silhouette est
   unique, pleine, opaque et si le fond d'origine a réellement été retiré ; sinon le
   produit est écarté.
4. **Revue visuelle** : des planches par rayon sont générées dans `.cache/catalog/qa/`.
   Les codes-barres refusés à l'œil sont listés dans `scripts/catalog/image-review.json`.

Les photos ne sont jamais redessinées ni générées : le détourage ne fait que retirer
le fond. Leur auteur est conservé (fiche produit, `ATTRIBUTIONS.md`).

Installation du détourage IA (facultatif, une fois) :

```bash
python3 -m venv .cache/rembg-venv
```

```bash
.cache/rembg-venv/bin/pip install "rembg[cpu]==2.0.67"
```

Sans cet outil, `pnpm catalog:build` n'utilise que le détourage géométrique (option
`--no-ml` pour l'imposer) ; le catalogue est alors plus restreint.

### 6. Sélection et instantané
Par rayon : fiches les mieux notées (photo, popularité, complétude), plafond par
marque pour la diversité. Résultat versionné dans le dépôt :

- `data/catalog/products.json` — l'instantané (ODbL, **sans aucun prix**) ;
- `public/catalog/images/*.webp` — les emballages détourés (CC BY-SA) ;
- `data/catalog/report.json` et [`docs/CATALOGUE-RAPPORT.md`](./CATALOGUE-RAPPORT.md) —
  le rapport d'import (effectifs par rayon, motifs de rejet, manques expliqués).

Grâce à cet instantané, **l'application fonctionne sans aucun accès à l'API
externe** : `pnpm db:setup` suffit après un clone.

### 7. Import en base et mises à jour
`pnpm db:seed` est idempotent : il insère ou met à jour par code-barres, conserve
les corrections de l'administration, ne crée un prix de démonstration que pour les
nouveaux produits et désactive (sans les supprimer) les produits sortis du catalogue.
Chaque exécution est tracée dans `import_jobs`.

`pnpm catalog:refresh` (ou le bouton de l'administration) relit les fiches existantes
via l'API v3 et n'applique que les modifications réelles de la source (`last_modified_t`).

## Prix : une couche indépendante et fictive

Open Food Facts n'est pas une base de prix. Les prix sont générés par
`src/server/pricing/demo-prices.ts` à partir d'un barème indicatif par étagère
(€/kg ou €/L) et du format du produit, de façon déterministe, arrondis « façon
magasin ». Ils sont stockés dans la table `prices` (source `demo-…`), historisés dans
`price_history` et modifiables dans l'administration. **Ils sont présentés partout
comme fictifs.** Pour brancher un fournisseur autorisé, il suffit d'alimenter `prices`
avec une autre `source`, sans toucher au catalogue.
