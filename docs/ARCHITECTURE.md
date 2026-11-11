# Architecture

## Vue d'ensemble

```
Navigateur ─────────────► Next.js 16 (App Router, React 19, Node.js)
  │  Zustand (panier,          │  Server Components : pages, rayons, fiches
  │  favoris, vus récemment)   │  Route handlers /api/* : étagères, recherche, panier, listes, commande
  │  localStorage              │  Server Actions : administration
  │                            │  Proxy : identifiant invité anonyme signé
  ▼                            ▼
 /catalog/images (WebP locaux)   PostgreSQL 16 (Drizzle ORM + SQL paramétré, pg_trgm, unaccent)
                                  ▲
 Pipeline d'import (scripts/) ────┘  Open Food Facts & bases sœurs (API v2/v3) — hors ligne pour les visiteurs
```

## Choix techniques

| Besoin | Choix | Pourquoi |
| --- | --- | --- |
| Application | Next.js 16, App Router, TypeScript strict | rendu serveur, routes API et actions serveur dans un seul projet |
| Styles | Tailwind CSS 4 (configuration CSS `@theme`) | système de design en variables, aucun CSS mort |
| Base | PostgreSQL 16 + Drizzle ORM | schéma typé, migrations SQL lisibles, aucun moteur binaire à télécharger ; SQL direct (postgres.js) pour la recherche |
| Recherche | `pg_trgm` + texte normalisé | tolérance aux fautes et aux accents, index GIN, pas de service supplémentaire |
| État client | Zustand (persisté) | panier instantané, sans fournisseur de contexte |
| Animations | CSS + Web Animations API, Motion pour le tiroir | uniquement `transform`/`opacity`, respect de `prefers-reduced-motion` |
| Validation | Zod | toutes les entrées serveur (API, actions, URL) |
| Tests | Vitest (unitaires + intégration PostgreSQL), Playwright + axe-core | logique, base réelle, navigateur réel, accessibilité |

## Arborescence

```
src/
  app/
    (store)/            pages publiques (accueil, rayon, recherche, fiche, panier, commande, listes…)
      @modal/(.)produit fiche produit ouverte par-dessus les rayons (route interceptée)
    admin/              administration (connexion + espace protégé)
    api/                routes JSON (étagères, recherche, panier, favoris, listes, commande, santé)
  components/
    shelves/            étagères, gondoles, chargement progressif
    products/           emplacement produit, prix, fiche, Nutri-Score, favoris
    cart/               bouton +/compteur, panier visuel, barre mobile, tiroir
    navigation/         en-tête, recherche, filtres, plan du magasin, allées
    checkout/ lists/ admin/ layout/ ui/
  lib/                  code partagé navigateur/serveur (prix, recherche, rayons, validation)
  server/
    db/                 schéma Drizzle et connexions
    catalog/            normalisation, qualité, import, mise à jour incrémentale, client HTTP OFF
    pricing/            générateur de prix fictifs
    search/             moteur de filtres/facettes/tri (pur)
    services/           accès aux données (catalogue, recherche, panier, listes, commandes, admin)
    auth/ security/     sessions admin, identifiant invité, mots de passe, limitation de débit
  stores/               état client (Zustand)
  types/                types partagés
scripts/                pipeline catalogue, migrations, import, création d'administrateur
drizzle/                migrations SQL
data/catalog/           instantané versionné du catalogue (ODbL)
public/catalog/images/  emballages détourés (CC BY-SA)
tests/                  unit/, integration/, e2e/, fixtures/
```

## Modèle de données

Le catalogue (données ouvertes) est séparé de la couche commerciale et des données
des visiteurs :

- **Catalogue** : `categories`, `brands`, `products`, `product_images`,
  `product_nutrition` ; provenance brute et licence dans `product_sources`.
- **Commercial (fictif)** : `prices` (centimes entiers), `price_history`, `promotions`.
- **Visiteurs** : `carts`/`cart_items`, `favorites`, `shopping_lists`/`shopping_list_items`,
  `demo_orders`/`demo_order_items`, rattachés à une clé invitée anonyme.
- **Comptes** : `users` (administrateurs ; prêt pour des comptes clients), `sessions`.
- **Imports** : `import_jobs` (type, statut, statistiques, journal).

Contraintes : unicité des codes-barres, slugs, jetons de partage ; quantités 1–99 ;
prix > 0 ; promotions bornées ; Nutri-Score et unités contrôlés ; index sur les
parcours chauds (rayon + rang, recherche trigramme, propriétaire).

## Flux principaux

**Étagères** — l'accueil rend côté serveur les promotions, la sélection et les trois
premiers rayons ; les suivants se chargent à l'approche de l'écran
(`/api/shelves/:rayon`, pagination serveur, cache HTTP court). Chaque étagère charge
la suite de ses produits au défilement horizontal.

**Panier** — l'ajout met à jour Zustand immédiatement (compteur, total, annonce
pour lecteur d'écran) ; l'animation part ensuite sans rien bloquer. Le panier est
persisté localement et synchronisé en arrière-plan (`PUT /api/cart`), puis restauré
depuis le serveur si l'appareil n'en a pas. Les prix des lignes sont rafraîchis au
chargement.

**Commande simulée** — le navigateur n'envoie que des identifiants et des quantités.
`/api/checkout/quote` et `/api/orders` recalculent prix, promotions, frais et totaux
depuis la base. C'est le point d'extension pour stocks, TVA et paiement.

**Recherche** — PostgreSQL sélectionne les candidats (texte normalisé sans accents,
racinisation des pluriels, similarité trigramme, code-barres), puis le moteur pur
`src/server/search/engine.ts` applique filtres, facettes et tri. Sans tri explicite,
les résultats sont regroupés par rayon (« 3 sur 42 »), comme une allée filtrée.

## Sécurité

- Validation Zod de toutes les entrées ; SQL exclusivement paramétré.
- Prix et totaux jamais repris du navigateur.
- Identifiant invité aléatoire signé HMAC (cookie httpOnly, SameSite=Lax).
- Administration : mots de passe scrypt, sessions aléatoires dont seule l'empreinte
  SHA-256 est stockée, cookie httpOnly SameSite=Strict, rôle vérifié dans chaque page
  **et** chaque action serveur, limitation des tentatives de connexion.
- Vérification d'origine sur les API d'écriture ; limitation de débit (recherche,
  panier, listes, commandes).
- En-têtes : CSP stricte (aucun domaine tiers), HSTS, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`.
- Images : seuls les domaines officiels Open Food Facts en HTTPS sont acceptés à
  l'import ; les visiteurs ne chargent que des images locales.
- Aucun secret dans le dépôt (`.env.example` documente les variables).

## Performances

- Images WebP pré-optimisées (≤ 560 px), puis AVIF/WebP à la bonne taille via
  `next/image`, chargement paresseux hors de l'écran, cache 30 jours.
- Étagères et rayons chargés progressivement ; pagination serveur partout.
- Aucun appel externe au runtime.
- Animations en `transform`/`opacity` uniquement, plafonnées, désactivées si
  l'utilisateur préfère réduire les animations.
