# MON MARCHÉ

**Vos courses, rayon par rayon.** Supermarché virtuel français et open source : on
parcourt de vraies étagères, on touche « + » sous un vrai produit, il file dans le
panier.

- **De vrais produits vendus en France**, avec leur marque, leur format et leur
  emballage réel, issus d'[Open Food Facts](https://world.openfoodfacts.org) et de ses
  bases sœurs : 18 rayons, de la crèmerie aux produits pour animaux.
- **Uniquement des emballages détourés**, posés sur des étagères horizontales qu'on
  fait défiler au doigt ou à la souris, comme dans un magasin.
- **Un panier immédiat** : compteur sur le produit, total en direct, animation vers
  le panier, tiroir latéral sur ordinateur, barre flottante sur mobile, panier
  conservé d'une visite à l'autre.
- **Recherche tolérante** (accents, fautes, codes-barres) qui filtre les rayons sur
  place, filtres (marque, prix, bio, Nutri-Score, promotions, favoris) et tris.
- Fiches détaillées (ingrédients, allergènes, valeurs nutritionnelles, source),
  favoris, listes de courses partageables, vus récemment, promotions, commande
  simulée, administration.

> ⚠️ **Démonstration.** Les produits sont réels ; **les prix et promotions sont
> fictifs**. Aucune commande n'est transmise, aucun paiement n'est demandé ni encaissé.

## Démarrage rapide

Prérequis : Node.js ≥ 20.9 (22 recommandé), pnpm 10, PostgreSQL 16 (ou Docker).

```bash
pnpm install
```

```bash
cp .env.example .env
```

Démarrez PostgreSQL (ou utilisez le vôtre et ajustez `DATABASE_URL`) :

```bash
docker compose up -d db
```

Créez le schéma et importez le catalogue depuis l'instantané versionné (aucun accès
réseau nécessaire) :

```bash
pnpm db:setup
```

```bash
pnpm dev
```

Ouvrez http://localhost:3000.

Démonstration complète sous Docker (base, import et application) :

```bash
docker compose --profile app up --build
```

### Mettre le site en ligne

Gratuitement avec Vercel + Neon, en quelques clics : voir le guide pas à pas
[docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md).

### Administration

```bash
pnpm admin:create admin@exemple.fr "un mot de passe d'au moins 12 caractères"
```

Puis http://localhost:3000/admin : produits, rayons, prix et promotions de
démonstration, contrôle des photos, mise en avant, imports.

## Scripts

| Commande | Rôle |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | développement, build de production, serveur |
| `pnpm lint` / `pnpm typecheck` | ESLint, TypeScript strict |
| `pnpm test` | tests unitaires et d'intégration (Vitest ; `TEST_DATABASE_URL` pour l'intégration) |
| `pnpm test:e2e` | tests de bout en bout Playwright (ordinateur et mobile, axe-core) |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:setup` | migrations, import de l'instantané, les deux |
| `pnpm catalog:import` | régénère le catalogue depuis Open Food Facts (collecte, détourage, instantané, import) |
| `pnpm catalog:refresh` | met à jour les fiches existantes (API v3, incrémental) |
| `pnpm admin:create` | crée un compte administrateur |

## Documentation

- [Analyse de la vidéo de référence et choix d'expérience](docs/ANALYSE-VIDEO.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Catalogue : sources, pipeline, détourage, prix fictifs](docs/CATALOGUE.md)
- [Rapport du dernier import](docs/CATALOGUE-RAPPORT.md)
- [Licences et attributions](docs/LICENCES.md)
- [Déploiement](docs/DEPLOIEMENT.md)
- [Contribuer](CONTRIBUTING.md)

## Pile technique

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 ·
PostgreSQL 16 + Drizzle ORM · Zod · Zustand · Motion · Vitest · Playwright ·
Docker. Détails et justifications dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Licences

- **Code** : [MIT](LICENSE).
- **Données produits** (`data/catalog/`) : [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), © contributeurs Open Food Facts.
- **Photos** (`public/catalog/images/`) : [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.fr), auteurs listés dans `ATTRIBUTIONS.md`.
- Les marques citées appartiennent à leurs propriétaires et ne sont pas associées au projet.

Voir [docs/LICENCES.md](docs/LICENCES.md).
