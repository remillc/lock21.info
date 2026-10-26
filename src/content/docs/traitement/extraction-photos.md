---
title: Extraction des photos
sidebar:
  order: 1
---
Cette opération consiste à extraire des fichiers photos des vidéos tournés. L'opération s'effectue à l'aide du logiciel DaVinci Resolve Studio.

## Balance des blancs

awef

## Le chevauchement des images

La documentation de Metashape recommande un chevauchement de 80% frontal et 60% latéral, et 90% frontal et 80% latéral pour un relevé au-dessus d'une forêt. J'ai choisi de viser un chevauchement frontal et latéral de 85%.

### Chevauchement latéral

Le chevauchement latéral est contrôlé au moment de la collecte des données. Il est donc important qu'au moment où on filme un objet on garde en tête la trajectoire qu'on est en train de dessiner afin de prévoir celle qui suit en fonction d'obtenir un recoupement des trajets d'environ 80%.

<figure>

![Deux passages parallèles de la caméra, décalés de 25 cm, qui ont 80 % de leur largeur en commun](./extraction-photos/assets/chevauchement-lateral.svg)

<figcaption>Deux passages recoupés à 80 % : à 70 cm du sujet, chaque passage couvre une bande de 1,25 m ; on décale le suivant de 25 cm (voir <a href="/problemes/dimensions-rig">Dimensions du rig de caméra</a>).</figcaption>
</figure>

### Chevauchement frontal

Le chevauchement frontal, lui, est obtenu au moment d'extraire les images des vidéos. En visionnant les prises de vues, on estime l'intervalle nécessaire entre 2 images pour obtenir un recoupement d'environ 85%.

[Expliquer comment j'utilise les effets dans Davinci Resolve pour afficher un cadre à 85% qui aide à évaluer le facteur d'échantillonage.]

<figure>

![Une bande de film où l'on garde l'image 1 et l'image 9 ; les zones filmées par ces deux images ont 85 % en commun](./extraction-photos/assets/chevauchement-frontal.svg)

<figcaption>Deux images d'un film qui se recoupent à 85 % : entre les images gardées (ici à 8 images d'intervalle, n8), la caméra n'a avancé que de 15 % de la zone filmée.</figcaption>
</figure>

Règle du pouce :

| Conditions                                                                   | Facteur d'échantillonage |
| ---------------------------------------------------------------------------- | :----------------------: |
| Collecte en scooter, vitesse 1                                               |            n8            |
| Collecte en scooter, vitesse 1, caméra en mode portrait (tourné à 90 degrés) |         n6 - n8          |
| À la palme, sans courant                                                     |         n6 - n10         |
| À la palme, sans courant, caméra en mode portrait (tourné à 90 degrés)       |            n8            |
| En dérive                                                                    |                          |

## Compression des fichiers

Cette étape permet de réduire considérablement la taille des images sans aucune perte de données.
