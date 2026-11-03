---
title: Publication du modèle
description: "Comment chaque zone passe de Metashape au visualiseur 3D du site : assemblage dans Blender, simplification, relief, tuiles et mise en ligne."
sidebar:
  order: 6
---
Un export de Metashape est beaucoup trop lourd pour un navigateur : la zone 12 compte plus de 12 millions de faces. La publication en fait des tuiles, et le [visualiseur](/modele) ne charge que celles qu'on regarde, plus ou moins détaillées selon la distance.

## Le fichier Blender

Toutes les zones sont assemblées dans un seul fichier Blender, avec le terrain et les maquettes des zones pas encore relevées. C'est là que chaque zone est placée et que ses découpes sont dessinées. Dans ce fichier, une zone peut rester en basse résolution : elle garde seulement le chemin de son export haute résolution, et c'est cet export qui sera publié. Les deux doivent venir du même modèle Metashape, sinon ils ne se superposent pas.

Chaque zone publiée garde une empreinte de son état dans le fichier, et la commande compare : seules les zones modifiées sont refaites.

## Les étapes d'une zone

1. L'export haute résolution est recalé automatiquement sur la zone du fichier Blender.
2. Les découpes du fichier s'appliquent et ce qui dépasse de la zone est retiré.
3. Le maillage descend à 3 000 triangles par mètre carré, sauf exception. La zone 12 passe de 12,5 millions à moins d'un million de faces, à 0,7 mm en médiane du maillage complet.
4. Les moules, les joints et les aspérités perdus à la simplification sont cuits dans une carte des normales, à partir de l'export complet. Ils ne changent pas la forme, seulement la façon dont la lumière accroche la surface.
5. La zone est découpée en tuiles à plusieurs niveaux de détail, avec Obj2Tiles, puis la géométrie et les textures sont compressées. La zone 12 donne 68 tuiles pour 81 Mo.

Chaque zone a aussi un jeu léger pour les téléphones et les tablettes, avec une texture réduite de moitié et sans relief. Les zones restent indépendantes : refaire une zone ne touche pas aux autres.

## La mise en ligne

Le résultat se contrôle d'abord dans le visualiseur, sur l'ordinateur. Les tuiles partent ensuite sur le serveur, et les visiteurs voient la nouvelle version dans la minute, sans que le site lui-même soit republié.

Les téléchargements de la [page du modèle](/modele) et les modèles de réalité augmentée sont refaits à part, parce qu'ils contiennent tout le modèle, chaque zone simplifiée davantage.
