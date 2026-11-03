---
title: Matériel utilisé
description: "La GoPro Hero6 Black et ses réglages pour filmer l'écluse 21 sous l'eau (vidéo 4K 4:3, Protune, blancs à 6500 K), et les logiciels du traitement."
sidebar:
  order: 2
---
La caméra et ses réglages pour la collecte, puis les logiciels du traitement.

<div class="facts">
<p class="fact"><span>Caméra</span><b>GoPro Hero6 Black</b></p>
<p class="fact"><span>Vidéo</span><b>4K 4:3 · 29,97 i/s</b></p>
<p class="fact"><span>Protune</span><b>activé</b></p>
<p class="fact"><span>Blancs</span><b>6500 K</b></p>
</div>

## Caméra

Caméra GoPro Hero6 Black avec boîtier étanche d'origine.

<figure>

![La caméra GoPro Hero6 Black, hors de son boîtier étanche](./materiel-utilise/assets/gopro-hero6-black.webp)

<figcaption>La GoPro Hero6 Black. Photo : GoPro</figcaption>
</figure>

Le support qui la porte devant le scooter, avec les lampes : [Le rig](/collecte/rig).

Mode de capture : **vidéo 4k 4:3** (4000 pixels x 3000 pixels). La résolution a été choisie en fonction d'une capture plein capteur.

<figure>

![Comparaison des résolutions offertes en mode vidéo par la caméra GoPro Hero 6](./assets/gopro-hero6-video-resolutions.webp)

<figcaption>Comparaison des résolutions offertes en mode vidéo par la caméra GoPro Hero 6. Source : <cite><a href="https://gopro.com/content/dam/help/hero6-black/manuals/HERO6Black_UM_ENG_REVB.pdf">Hero 6 Black User Manual</a></cite></figcaption>
</figure>

### Paramètres de capture vidéo

| Paramètre                                              | Valeur                          |
| ------------------------------------------------------ | ------------------------------- |
| Résolution                                             | 4k 4:3                          |
| Images par seconde                                     | 29.97                           |
| Stabilisation vidéo                                    | désactivé                       |
| Faible luminosité automatique (_Auto low light_)       | _non disponible_                |
| _Protune_                                              | activé                          |
| Couleur (profil colorimétrique)<sup>1</sup>                    | _Couleur GoPro_                 |
| Équilibre des blancs<sup>1</sup>                               | 6500K                       |
| ISO Minimum<sup>1</sup>                                        | *(à compléter)*                 |
| ISO Maximum<sup>1</sup>                                        | 1600 (valeur par défaut)        |
| Vitesse d'obturateur<sup>1</sup>                               | automatique (valeur par défaut) |
| Compensation de la valeur d’exposition (Comp V.E.)<sup>1</sup> | 0 (valeur par défaut)           |
| Netteté<sup>1</sup>                                            | Élevée (valeur par défaut)      |

<div class="table-notes">
<p><sup>1</sup> Disponible lorsque le paramètre Protune est activé</p>
</div>

## Logiciels

[DaVinci Resolve Studio 21.1](https://www.blackmagicdesign.com/ca/products/davinciresolve)

[Metashape](https://www.agisoft.com/)

[Inkscape v1.3.2](https://inkscape.org/)

[Blender v5.2](https://www.blender.org/)

[ImageMagick v7.1](https://imagemagick.org/) : compression des images TIFF, sans perte

[Navionics Boating](https://www.navionics.com/) (Garmin) : carte des profondeurs des abords de l'écluse, d'où vient le terrain qui entoure le modèle 3D

Scripts Node.js, Python et PowerShell

[Claude Code](https://claude.com/claude-code) (Anthropic, modèle Claude Opus) : assistant de programmation, pour le site, le visualiseur 3D et la chaîne de publication du modèle
