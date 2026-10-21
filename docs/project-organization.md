---
title: Organisation du projet
description: Où se trouve chaque partie de lock21.info, du relevé en plongée au site en ligne.
---

Ce guide donne la carte du projet: les dossiers, les branches, les services en ligne, et le chemin que suit le modèle
3D, du relevé en plongée jusqu'au visiteur.

## Le chemin du modèle

```text
Plongées (vidéo GoPro)
  → Metashape: projets dans O:\photogrammetry\, exports des zones dans O:\modeles\ (basse et haute résolution)
  → Blender: modeles\lock-21-publishing.blend place les zones, dessine leurs découpes (version basse résolution)
  → outils de publication (tools\publish-model\): tuiles dans O:\publishing\tiles\
  → Cloudflare R2: https://tiles.lock21.info/ (tuiles, téléchargements, réalité augmentée)
  → visualiseur 3D (viewer\), dans la page https://lock21.info/modele/
```

Le détail des étapes: le guide **Traiter le fichier .blend**.

## Les dossiers du projet (Git)

| Dossier ou fichier | Contenu |
| --- | --- |
| `src\` | **Le site** (Astro + Starlight). `src\content\docs\`: les pages, en Markdown; `src\components\`: les éléments de page (en-tête, pied de page, page du modèle, accueil); `src\data\site.ts`: les réglages du site (coordonnées, adresses des téléchargements, identifiant Google Analytics); `src\styles\`: les couleurs et la mise en page |
| `public\` | Copié tel quel sur le site: `robots.txt`, l'icône, le KMZ de Google Earth (`downloads\lock-21.kmz`), et le visualiseur construit (`modele\viewer\`, refait à chaque publication, hors de Git) |
| `viewer\` | **Le visualiseur 3D**, une application à part (three.js), intégrée à la page `/modele/` |
| `tools\publish-model\` | **Les outils de publication**: préparer les zones, cuire le relief, tuiler, envoyer sur le serveur. Leur `README.md` explique chaque étape et les leçons apprises |
| `tools\google-earth\` | Le modèle complet pour Google Earth, le GLB téléchargeable, les modèles de réalité augmentée |
| `tools\model-analysis\` | Analyse de la résolution des zones; ses rapports datés sont gardés |
| `modeles\` | Les fichiers Blender, stockés avec Git LFS: `lock-21-publishing.blend` (le fichier de travail de la publication) et `lock-21-mockup.blend` (la maquette) |
| `docs\` | Les guides pour les personnes: celui-ci, **Installation**, **Traiter le fichier .blend**, **Réalité augmentée** |
| `AGENTS.md` | Les consignes pour les assistants d'IA (Claude) qui travaillent dans le projet |
| `GUIDELINES.md`, `SYSTEM-DESIGN.md` | Les règles du code du site, et le design (couleurs, typographie, mouvement) |
| `TODO.md` | Ce qui reste à faire, numéroté |
| `CHANGELOG.md` | Ce qui a changé, version par version |

## Les données (disque `O:`)

Hors de Git, car elles pèsent des centaines de gigaoctets: les projets Metashape (`O:\photogrammetry\`, à ne jamais
modifier), les exports des zones (`O:\modeles\`), et ce que produisent les outils avant la mise en ligne
(`O:\publishing\`) ou en passant (`O:\temp\`, qu'on peut effacer). Le détail: le guide **Installation**, section 5.

## Les branches et les versions

- **`main`**: la version de référence du code et des pages. La pousser ne publie rien.
- **Une branche par travail** (`feature/…`, `docs/…`), fusionnée dans `main` une fois terminée, puis supprimée.
- **`gh-pages`**: le site construit, écrit par la publication; on n'y touche pas.
- **Les versions**: `0.x.y` tant que le site n'est pas public. Une version (« release ») a sa section datée dans
  `CHANGELOG.md` et une étiquette Git `vX.Y.Z`; l'étiquette déclenche la publication du site.
- **Publier sans version**: sur GitHub, onglet **Actions**, **Deploy to GitHub Pages**, **Run workflow**.

Attention au fichier `.blend`: changer de branche remplace le fichier sur le disque si les deux branches n'en ont pas la
même version. Ne pas changer de branche pendant qu'un outil lit le `.blend`, ni avec le fichier ouvert dans Blender.

## Les services en ligne

| Service | Rôle | Adresse |
| --- | --- | --- |
| **GitHub** | le code (dépôt `remillc/lock21.info`) et l'hébergement du site (GitHub Pages) | <https://github.com/remillc/lock21.info>, <https://lock21.info/> |
| **Cloudflare** | le nom de domaine `lock21.info`, l'adresse `info@lock21.info` (Email Routing: renvoyée vers la boîte Gmail de Christian), et le stockage R2 (bucket `lock21-tiles`): tuiles, téléchargements, réalité augmentée | <https://tiles.lock21.info/> |
| **Google Analytics** | la mesure d'audience, après consentement (propriété `G-796S6VL5P8`) | <https://analytics.google.com/> |

Les identifiants du stockage R2 sont dans `.env.local`, à la racine du projet, hors de Git (guide **Installation**,
section 4). La publication du site sur GitHub n'a besoin d'aucun secret.

## Où regarder pour…

| Je veux… | Voir |
| --- | --- |
| préparer un ordinateur | `docs\installation.md` |
| publier une zone modifiée ou nouvelle | `docs\processing-the-blend-file.md` |
| comprendre ou refaire la réalité augmentée | `docs\augmented-reality.md` |
| le détail technique de la publication 3D | `tools\publish-model\README.md` |
| Google Earth et le GLB téléchargeable | `tools\google-earth\README.md` |
| modifier une page du site | `src\content\docs\` (et `AGENTS.md`, section *Conventions for docs*) |
| ce qui reste à faire | `TODO.md` |
