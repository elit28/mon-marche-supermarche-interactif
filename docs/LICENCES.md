# Licences, attributions et marques

MON MARCHÉ assemble plusieurs éléments dont les licences **diffèrent**. La licence
MIT du code ne s'applique pas aux données ni aux photos.

| Élément | Emplacement | Licence | Obligations |
| --- | --- | --- | --- |
| Code de l'application | `src/`, `scripts/`, `tests/`… | MIT (`LICENSE`) | conserver la notice |
| Données produits | `data/catalog/products.json`, tables catalogue | ODbL 1.0 (contenus : DbCL 1.0) | attribuer Open Food Facts ; une base dérivée redistribuée reste sous ODbL |
| Photos d'emballages | `public/catalog/images/` | CC BY-SA 3.0 | citer l'auteur ; partager les adaptations (détourages) sous la même licence |
| Polices Fraunces, Figtree | `src/app/fonts/` | SIL OFL 1.1 | fournir la licence (incluse) |
| Modèle de détourage IS-Net (outil d'import, non distribué) | téléchargé par rembg | Apache 2.0 | — |

## Attribution affichée

- Pied de page et page « À propos » : sources, licences, mention des marques.
- Fiche produit : lien vers la fiche source, licence des données, auteur de la photo.
- `public/catalog/images/ATTRIBUTIONS.md` : auteur et URL d'origine de chaque photo.

## Séparation des données propriétaires

L'instantané ODbL ne contient que des données issues des bases ouvertes. Les prix
et promotions, propres à l'application (et fictifs), vivent dans des tables
séparées et ne sont jamais fusionnés dans l'instantané. Si un jour une source de
prix sous licence restrictive était branchée, elle resterait dans ces tables et ne
devrait pas être redistribuée avec la base ODbL sans vérification juridique.

## Marques

Les noms de marques, logos et emballages appartiennent à leurs propriétaires. Ils
apparaissent uniquement pour identifier les produits, sans affiliation, partenariat
ni approbation. Les marques de distributeurs sont volontairement exclues pour qu'aucun
prix fictif ne puisse être attribué à une enseigne.
