---
title: Alignement de chunks
description: Pourquoi les modèles des zones s'alignent mal entre eux, et comment des cibles leur donnent leur taille réelle.
---

Chaque zone est traitée à part dans Metashape, dans son propre *chunk* (un bloc de photos traité à part), et chaque
modèle sort un peu déformé du processus. Ces déformations rendent difficile d'aligner les modèles les uns par rapport
aux autres.

La taille doit aussi être la bonne : un modèle qui n'est pas exactement à l'échelle ne s'aligne pas avec ses voisins.
J'ai donc utilisé des cibles pour établir des échelles de mesure sur chaque modèle et le ramener à ses dimensions
réelles exactes.

<figure>

![Une cible posée au plancher, vue par la caméra](./effet-banane/assets/exemple-cible-GX010197.007.webp)

<figcaption>Une des cibles, au plancher</figcaption>
</figure>

La déformation, elle, n'est pas encore entièrement réglée : voir [Effet de banane](/problemes/effet-banane).
