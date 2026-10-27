---
title: Génération des modèles
sidebar:
  order: 4
---
Les modèles de chaque zone sont générés dans Agisoft Metashape, puis exportés pour la publication.

## Densités pour haute résolution

La taille d'une face pour les modèles haute résolution a été définie 2mm `<sup>`2 `</sup>, soit:`

| Maillage | Nb faces / pi2 |
| :-----: | :------------: |
| Modèle |     1 475     |
| Terrain |                |

### Résolution des textures

48 400 px2 (220px x 220px) par 1 ft2

## Résolution pour publication Web

La publication sur [lock21.info/modele](/modele) part de l'export le plus détaillé de chaque zone. La chaîne de publication (`tools/publish-model/`) le simplifie elle-même : je n'ai plus à exporter un modèle « web » à part.

### Ratio faces / surface

| Maillage | Nb faces / m2 | Nb faces / pi2 |
| :-----: | :-----------: | :------------: |
| Modèle (niveau le plus détaillé) |     3 000     |     ≈ 279      |
| Terrain |               |                |

Les niveaux éloignés sont allégés encore plus : environ 40 000 faces par zone pour le plus grossier et 150 000 pour l'intermédiaire. Le détail fin vient surtout de la texture.

### Relief (moules zébrées)

Pour que le relief des moules (1 à 3 cm) ressorte dans le visualiseur, il faut un export géométrique fin, avec des arêtes d'environ 1 cm ou moins (ex. zone 12 : 13 M faces, environ 7 mm). Cet export n'a pas besoin de texture et doit venir du même chunk que l'export publié. Avec des *depth maps* en qualité `low`, le modèle reste trop grossier, même avec beaucoup de faces : c'est pourquoi je refais la zone 4 en qualité `medium`.
