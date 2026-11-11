# Rapport d'import du catalogue

_Généré automatiquement par `pnpm catalog:build` le 11/11/2026 20:51:57._

## Synthèse

- **588 produits réels importés** (objectif indicatif : 618).
- **Tous les emballages en rayon sont détourés** : 746 packshots sur fond uni détourés géométriquement, 287 détourages par IA validés (avant sélection).
- 1823 candidats examinés, 1543 fiches conformes, 8 doublons écartés.
- Les photos prises en main, en rayon ou sur une table, impossibles à détourer proprement, sont écartées.
- Aucune donnée n'est inventée : les champs absents des fiches sources restent vides et sont signalés comme tels dans l'interface.

## Rayons

| Rayon | Importés | Objectif | Emballages détourés disponibles | Packshots | Détourage IA |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fruits et légumes | 27 | 30 | 27 | 25 | 2 |
| Produits laitiers et œufs | 40 | 40 | 95 | 40 | 0 |
| Fromages | 35 | 35 | 65 | 35 | 0 |
| Viandes et charcuterie | 32 | 32 | 44 | 32 | 0 |
| Poissons et produits de la mer | 25 | 25 | 33 | 19 | 6 |
| Boulangerie et pâtisserie | 28 | 28 | 62 | 28 | 0 |
| Pâtes, riz et féculents | 36 | 36 | 56 | 36 | 0 |
| Conserves et épicerie salée | 45 | 45 | 91 | 45 | 0 |
| Biscuits et gâteaux | 45 | 45 | 80 | 45 | 0 |
| Chocolats et confiseries | 36 | 36 | 58 | 36 | 0 |
| Petit-déjeuner | 45 | 45 | 98 | 45 | 0 |
| Boissons et eaux | 45 | 45 | 95 | 45 | 0 |
| Surgelés | 15 | 30 | 15 | 12 | 3 |
| Produits bio | 30 | 30 | 43 | 25 | 5 |
| Hygiène et beauté | 36 | 36 | 59 | 20 | 16 |
| Entretien de la maison | 28 | 28 | 47 | 14 | 14 |
| Produits pour bébé | 26 | 26 | 51 | 24 | 2 |
| Produits pour animaux | 14 | 26 | 14 | 3 | 11 |

## Manques et explications

- **Fruits et légumes** : 27/30. Seules 27 fiches conformes disposent d'une photo d'emballage détourable proprement parmi les candidats collectés.
- **Surgelés** : 15/30. Seules 15 fiches conformes disposent d'une photo d'emballage détourable proprement parmi les candidats collectés.
- **Produits pour animaux** : 14/26. Seules 14 fiches conformes disposent d'une photo d'emballage détourable proprement parmi les candidats collectés.

Pour combler un manque : ajouter des requêtes (catégories ou marques) dans `scripts/catalog/sources.ts` puis relancer `pnpm catalog:import`, ou contribuer une photo de face sur fond uni sur Open Food Facts : elle profitera à tous.

## Motifs de rejet

| Motif | Pré-sélection (recherche) | Fiches détaillées |
| --- | ---: | ---: |
| Nom identique à la marque (non informatif) | 45 | 0 |
| Photo de face absente ou hors domaine officiel | 417 | 0 |
| Code-barres invalide (clé de contrôle GTIN) | 214 | 0 |
| Nom absent, numérique ou hors alphabet latin | 390 | 0 |
| Marque de distributeur (exclue : prix fictifs) | 2737 | 163 |
| Marque absente | 542 | 0 |
| Catégorie exclue (alcool, compléments, tabac…) | 61 | 0 |
| Code interne magasin (préfixe 2) | 190 | 0 |
| Produit non référencé comme vendu en France | 0 | 57 |
| Fiche détaillée non conforme | 0 | 27 |
| Aucun rayon cohérent | 0 | 33 |
| Détourage refusé lors de la revue visuelle | 0 | 103 |
| Photo illisible ou trop petite | 0 | 4 |
| Emballage impossible à détourer proprement (photo en situation) | 0 | 395 |

Détourages IA refusés par le contrôle qualité :

- silhouette trop petite (détail isolé) : 100
- silhouette fragmentée : 209
- silhouette irrégulière : 61
- masque incertain (zones semi-transparentes) : 24
- aucun fond retiré : 1

## Licences

- Données : Open Database License (ODbL) 1.0 — © contributeurs Open Food Facts et bases sœurs.
- Photos : Creative Commons BY-SA 3.0 — auteur et source de chaque photo dans `public/catalog/images/ATTRIBUTIONS.md`.
- Les prix affichés par MON MARCHÉ ne proviennent pas de ces bases : ce sont des prix fictifs de démonstration.
