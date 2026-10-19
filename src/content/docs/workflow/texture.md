---
title: Texture
sidebar:
  order: 5
---
## Calibration des couleurs

Cette étape permet de normaliser les blancs et la luminosité à travers les photos.

Menu `Tools` > `Calibrate colors`...

1. Source data: `Model` ou `DEM` ?
2. Cocher `Calibrate white balance`

Cette calibration rend les photos d'un même chunk cohérentes entre elles, mais elle garde la teinte verte de l'eau. Pour le modèle publié, la correction de couleur se fait dans le visualiseur: les zones sont ramenées à une même couleur, et le vert dominant est retiré pixel par pixel. Les bandes claires et sombres laissées par les lampes peuvent aussi être atténuées par la chaîne de publication (essai en cours).

## Résolution des textures

### High res

21 025 px2 (145px x 145px) par 1 ft2

### Publication Web

Plus besoin d'une version basse résolution: la texture de l'export est publiée telle quelle, découpée en tuiles de 4096 px au plus et compressée (KTX2), et le visualiseur ne charge que les tuiles visibles. Une seule page de texture par zone, jusqu'à 16 384 px (ex. zone 4 refaite: 16 384 px).

## Génération de la texture

Menu `Workflow` > `Build texture...`

1. Texture type
2.
