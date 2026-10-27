---
title: Étalonnage des couleurs
description: "Pourquoi les vidéos sous l'eau tirent sur le vert-jaune et comment DaVinci Resolve corrige leurs couleurs : la charte, puis une correction par plongée."
sidebar:
  order: 0
---

Sous l'eau, deux lumières éclairent ce que je filme : celle du jour, qui descend de la surface, et celle des quatre lampes du [rig](/collecte/rig#les-lampes), des DEL blanches à 6000 K. L'eau ne laisse pas passer toutes les couleurs de la même façon : elle absorbe d'abord le rouge, et dans l'eau chargée du canal, une bonne partie du bleu aussi. Plus la lumière traverse d'eau, plus l'image tire sur le vert-jaune. La lumière du jour change donc avec la profondeur, et celle des lampes avec la distance entre le rig et ce qu'il filme.

<figure id="absorption">

![Coupe sous l'eau : la lumière du jour descend vers le mur, son rouge s'éteint en premier, puis son bleu, seul le vert-jaune atteint le mur. Les lampes du rig éclairent le mur sur un trajet court, toutes leurs couleurs arrivent](./etalonnage-couleurs/assets/absorption-couleurs.svg)

<figcaption>L'eau absorbe les couleurs de la lumière, le rouge en premier. Le jour, qui traverse toute la profondeur, arrive vert-jaune. Les lampes, situées à courte distance du sujet, gardent presque toutes les couleurs, ce qui permet de restaurer les couleurs perdues par l'éclairage ambiant.</figcaption>
</figure>

Dans la caméra, la balance des blancs reste fixe, à 6500 K ([Matériel utilisé](/collecte/materiel-utilise)). La correction se fait ensuite dans DaVinci Resolve, d'après la charte de couleurs filmée au début de chaque plongée, sous-exposée d'un stop ([La charte de couleurs est surexposée](/problemes/charte-couleurs-surexposee)). Pour certaines plongées, j'ai filmé la charte à deux hauteurs, sur le plancher et à mi-hauteur, et fait un étalonnage pour chacune ([Calibration des couleurs](/problemes/calibration-couleurs)).

## La correction ajoutée

En octobre 2026, une correction commune s'est ajoutée à l'étalonnage de la charte, à l'aide de l'outil d'intelligence artificielle Claude, une par plongée. La couleur moyenne de chaque passage, mesurée sur une vingtaine d'images, est ramenée aux trois quarts du chemin vers le gris neutre, et la correction de la plongée est la médiane des passages. Une seule correction par plongée évite les bandes de couleur dans la texture, là où les images de deux passages se mélangent. Pour la plongée 21 et celle du 14 juillet, plus plates que les autres, le contraste est remonté au niveau des autres plongées.

La correction de chaque plongée est enregistrée dans un fichier LUT (_look-up table_, une table de correspondance qui donne, pour chaque couleur de l'image, la couleur corrigée). Dans une copie du projet Resolve de la plongée, nommée `… - graded`, ce fichier est posé sur le nœud de la timeline, qui s'applique à toutes les images après leur propre étalonnage, puis les images sont rendues dans un nouveau dossier, sous les mêmes noms. Les projets et les images d'origine restent tels quels. Les images corrigées passent ensuite à l'[extraction des photos](/traitement/extraction-photos).
