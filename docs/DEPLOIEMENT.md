# Déploiement

> Aucun déploiement en production n'est effectué automatiquement par ce dépôt.

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
