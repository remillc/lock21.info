---
title: Publication du modèle
description: "Comment chaque zone passe de Metashape au visualiseur 3D du site : assemblage dans Blender, simplification, relief, tuiles et mise en ligne."
sidebar:
  order: 6
---
## La problématique

Un export de Metashape est beaucoup trop lourd pour un navigateur. Par exemple, la zone 12 compte plus de 12 millions de faces. Afin de contourner ce problème, la publication en fait des tuiles, et le [visualiseur](/modele) ne charge que celles qu'on regarde. Les tuiles proches de la caméra sont chargées avec beaucoup de détails, celles plus éloignées avec moins. Le navigateur économise ainsi sa mémoire et ses calculs, et la navigation reste fluide.

## Le fichier Blender

Toutes les zones sont assemblées dans un seul fichier Blender, avec le terrain et les maquettes des zones pas encore relevées. C'est là que chaque zone est placée et que ses découpes sont dessinées. Dans ce fichier, une zone peut rester en basse résolution : elle garde seulement le chemin de son export haute résolution, et c'est cet export qui sera publié. Les deux doivent venir du même modèle Metashape, sinon ils ne se superposent pas.

À chaque publication, une empreinte de la zone est enregistrée avec ses tuiles : sa position, son maillage, ses découpes et l'export haute résolution utilisé. À la publication suivante, cette empreinte est comparée à l'état du fichier Blender : si on a seulement retouché une découpe de la zone 12, seule la zone 12 repasse par les étapes ci-dessous, et les autres zones gardent leurs tuiles déjà en ligne.

## Les étapes d'une zone

1. L'export haute résolution est recalé automatiquement sur la zone du fichier Blender.
2. Les découpes du fichier s'appliquent et ce qui dépasse de la zone est retiré.
3. Le maillage descend à 3 000 triangles par mètre carré, sauf exception. La zone 12 passe de 12,5 millions à moins d'un million de faces, à 0,7 mm en médiane du maillage complet.
4. Les moules, les joints et les aspérités perdus à la simplification sont cuits dans une carte des normales, à partir de l'export complet. Ils ne changent pas la forme, seulement la façon dont la lumière accroche la surface.
5. La zone est découpée en tuiles à plusieurs niveaux de détail, avec Obj2Tiles, puis la géométrie et les textures sont compressées. La zone 12 donne 68 tuiles pour 81 Mo.

Chaque zone a aussi un jeu léger pour les téléphones et les tablettes, avec une texture réduite de moitié et sans relief. Les zones restent indépendantes : refaire une zone ne touche pas aux autres.

## La mise en ligne

Après une étape de validation locale dans le visualiseur, les tuiles sont téléchargées sur le serveur, et les visiteurs voient la nouvelle version dans la minute, sans que le site lui-même soit republié.

Les fichiers à télédécharger situés sur la [page du modèle](/modele) et les modèles de réalité augmentée sont refaits à part, parce qu'ils contiennent tout le modèle, chaque zone simplifiée davantage.
