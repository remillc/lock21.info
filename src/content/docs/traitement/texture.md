---
title: Texture
sidebar:
  order: 5
---
La texture se calcule dans Agisoft Metashape, sur le modèle de chaque zone.

## Calibration des couleurs

Cette étape permet de normaliser les blancs et la luminosité à travers les photos.

Menu `Tools` > `Calibrate colors`...

1. Source data : `Model` ou `DEM` ?
2. Cocher `Calibrate white balance`

Cette calibration rend les photos d'un même chunk cohérentes entre elles, mais elle garde la teinte verte de l'eau. Pour le modèle publié, la correction de couleur se fait dans le visualiseur : les zones sont ramenées à une même couleur, et le vert dominant est retiré pixel par pixel. Les bandes claires et sombres laissées par les lampes peuvent aussi être atténuées par la chaîne de publication (essai en cours).

## Résolution des textures

### High res

21 025 px2 (145px x 145px) par 1 ft2

### Publication Web

Plus besoin d'une version basse résolution : la texture de l'export est publiée telle quelle, découpée en tuiles de 4096 px au plus et compressée (KTX2), et le visualiseur ne charge que les tuiles visibles. Une seule page de texture par zone, jusqu'à 16 384 px (ex. zone 4 refaite : 16 384 px).

## Les masques de la baguette

La baguette de mesure orange et blanche que je tiens devant la caméra se voit dans beaucoup d'images. Sans masque, Metashape la peindrait sur la texture, comme une rayure orange sur les moules. Pour chaque image, un masque en noir et blanc lui dit quoi laisser de côté : la baguette en noir, le reste en blanc. Metashape ne prend alors rien de la baguette quand il construit la texture.

Les masques sont faits par un script écrit à l'aide de l'outil d'intelligence artificielle Claude, en octobre 2026. Dans chaque image, il cherche le segment orange de la baguette, une barre droite et mince qui entre par le haut de l'image, puis il suit la même ligne vers le bas, sur le segment blanc et jusqu'au bout orange. Je les ai faits seulement pour les plongées qui servent aux zones en ligne, plus de 130 000 images. Ils servent quand je refais la texture d'une zone : la zone 3 est la première refaite avec eux, en octobre 2026.

## Génération de la texture

Menu `Workflow` > `Build texture...`

1. Texture type

*(à compléter)*
