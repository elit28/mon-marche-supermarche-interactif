# Contribuer à MON MARCHÉ

Merci de votre intérêt ! Ce projet vise à devenir une référence ouverte des courses
en ligne « rayon par rayon ».

## Démarrer

1. Lisez le [README](./README.md) pour installer le projet, puis
   [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) pour comprendre son organisation.
2. Créez une branche à partir de la branche principale.
3. Avant d'ouvrir une demande de fusion :

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

```bash
pnpm test:e2e
```

## Règles du projet

- **Aucune donnée inventée.** Pas de code-barres, de photo, de format, d'allergène ni de
  valeur nutritionnelle fictifs. Une information absente s'affiche comme absente.
- **Les prix sont fictifs** et doivent toujours être présentés comme tels.
- **Uniquement des emballages détourés en rayon** (voir docs/CATALOGUE.md).
- **Montants en centimes entiers** ; jamais de prix ou de total fourni par le navigateur
  côté serveur.
- **Accessibilité** : tout élément interactif est utilisable au clavier, nommé, et
  fonctionne sans animation.
- **Mobile d'abord** : vérifiez de 320 px à 1920 px, sans défilement horizontal parasite.
- Interface et documentation en français ; code commenté en français lorsque c'est utile.
- Dépendances : ajoutez-en le moins possible et justifiez chaque ajout.

## Améliorer le catalogue

- Ajoutez des requêtes (catégories, marques) dans `scripts/catalog/sources.ts`, puis
  `pnpm catalog:import`.
- Une photo mal détourée ? Ajoutez son code-barres à `scripts/catalog/image-review.json`.
- Le meilleur moyen d'enrichir un produit reste de **contribuer sur Open Food Facts** :
  tout le monde en profite.

## Signaler un problème

Ouvrez un ticket en décrivant le comportement attendu, le comportement observé, le
navigateur et la largeur d'écran. Pour une faille de sécurité, contactez les
mainteneurs en privé plutôt que de l'exposer publiquement.
