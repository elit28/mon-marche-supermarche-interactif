# Déploiement

> Aucun déploiement en production n'est effectué automatiquement par ce dépôt.

## Mettre le site en ligne gratuitement (Vercel + Neon) — recommandé

Vercel héberge l'application Next.js, Neon fournit la base PostgreSQL gratuite.
Le projet est prêt : au premier déploiement, la base est créée et les 588 produits
sont importés automatiquement (script `vercel-build`). Compter une dizaine de minutes.

1. **Code sur la branche principale.** Vercel publie la branche par défaut du dépôt
   (`Branche-principale`). Fusionnez-y la branche de travail (pull request → « Merge »).
2. **Compte Vercel.** Sur [vercel.com](https://vercel.com), « Sign up » → « Continue with GitHub ».
3. **Importer le projet.** « Add New… » → « Project » → choisir
   `mon-marche-supermarche-interactif-` → « Import ».
4. **Variable secrète.** Dans « Environment Variables », ajouter :
   - `SESSION_SECRET` = une longue phrase aléatoire (au moins 32 caractères) ;
   - `ADMIN_IMPORT_ENABLED` = `false`.
   Puis « Deploy ». Ce premier déploiement réussit mais affiche « magasin fermé » :
   la base n'est pas encore branchée, c'est normal.
5. **Base de données.** Dans le projet Vercel : onglet « Storage » → « Create Database »
   → **Neon** (Serverless Postgres) → offre gratuite → région Europe (Francfort ou Paris)
   → « Connect ». Vercel ajoute seul `DATABASE_URL` (et `DATABASE_URL_UNPOOLED`).
6. **Redéployer.** Onglet « Deployments » → « … » sur le dernier → « Redeploy ».
   Cette fois, le build crée les tables et importe le catalogue.
7. **C'est en ligne** : l'adresse `https://<nom-du-projet>.vercel.app` s'affiche
   dans « Domains ». Un nom de domaine personnalisé peut s'y ajouter.

Chaque nouveau `git push` sur la branche principale redéploie le site ; chaque
autre branche reçoit sa propre adresse de prévisualisation.

**Administration** : créez un compte depuis votre ordinateur, avec l'URL de la base
copiée depuis Vercel (« Storage » → Neon → « .env.local ») :

```bash
DATABASE_URL="postgresql://…" pnpm admin:create admin@exemple.fr "un mot de passe long"
```

Notes :
- Les images du catalogue, déjà optimisées à l'import, sont servies telles quelles
  (aucun quota d'optimisation d'images consommé).
- La connexion « poolée » de Neon est détectée : les requêtes préparées sont
  désactivées automatiquement ; les migrations utilisent la connexion directe.
- La mise à jour depuis Open Food Facts doit se lancer en ligne de commande
  (`pnpm catalog:refresh` avec `DATABASE_URL` de production), pas depuis l'admin.

## Autres hébergements

## Prérequis

- Node.js ≥ 20.9 (22 recommandé) et pnpm 10, ou Docker.
- PostgreSQL 16 avec les extensions `pg_trgm` et `unaccent` (créées par `pnpm db:migrate`
  si l'utilisateur a les droits ; sinon, demandez-les à votre hébergeur).

## Variables d'environnement

Voir `.env.example`. En production :

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | oui | connexion PostgreSQL |
| `SESSION_SECRET` | oui (≥ 32 caractères) | signature de l'identifiant invité |
| `NEXT_PUBLIC_SITE_URL` | recommandé | URL publique (liens de partage, métadonnées) |
| `DATABASE_POOL_SIZE` | non | taille du pool (10 par défaut) |
| `ADMIN_IMPORT_ENABLED` | non | `false` pour interdire la mise à jour en ligne depuis l'admin |
| `OFF_USER_AGENT` | pour les imports | User-Agent envoyé à Open Food Facts |

## Avec Docker Compose

```bash
docker compose --profile app up --build
```

Le service `setup` applique les migrations et importe l'instantané, puis `app`
démarre sur http://localhost:3000. Créez ensuite un administrateur :

```bash
docker compose --profile app run --rm setup pnpm admin:create admin@exemple.fr "mot de passe long"
```

## Sur un serveur Node.js

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm db:setup
```

```bash
pnpm build
```

```bash
pnpm start
```

`next build` produit aussi un serveur autonome (`.next/standalone`, utilisé par
l'image Docker). Servez l'application derrière un proxy HTTPS (HSTS activé).

## Limites connues d'une instance unique

- La limitation de débit et le cache court des rayons sont en mémoire : derrière
  plusieurs instances, utilisez un stockage partagé (Redis) et un verrou d'import.
- La mise à jour depuis Open Food Facts lancée depuis l'administration s'exécute dans
  le processus web ; pour de gros volumes, préférez `pnpm catalog:refresh` en tâche planifiée.
