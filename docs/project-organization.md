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
  → visualiseur 3D (src\viewer\), dans la page https://lock21.info/modele
```

Le détail des étapes: le guide **Traiter le fichier .blend**.

## Les dossiers du projet (Git)

| Dossier ou fichier | Contenu |
| --- | --- |
| `src\` | **Le site** (Astro + Starlight). `src\content\docs\`: les pages, en Markdown; `src\components\`: les éléments de page (en-tête, pied de page, page du modèle, accueil); `src\data\site.js`: les réglages du site (coordonnées, adresses des téléchargements, identifiant Google Analytics); `src\styles\`: les couleurs et la mise en page; `src\viewer\`: **le visualiseur 3D** (three.js), partie de la page `/modele` |
| `public\` | Copié tel quel sur le site: `robots.txt`, l'icône, le KMZ de Google Earth (`downloads\lock-21.kmz`), et les fichiers du visualiseur (`viewer\`: les animaux, le bras du plongeur, le courant, le ciel) |
| `tools\publish-model\` | **Les outils de publication**: préparer les zones, cuire le relief, tuiler, envoyer sur le serveur. Leur `README.md` explique chaque étape et les leçons apprises |
| `tools\google-earth\` | Le modèle complet pour Google Earth, le GLB téléchargeable, les modèles de réalité augmentée |
| `tools\model-analysis\` | Analyse de la résolution des zones; ses rapports datés sont gardés |
| `modeles\` | Les fichiers Blender, stockés avec Git LFS: `lock-21-publishing.blend` (le fichier de travail de la publication; la maquette `lock-21-mockup.blend`, dont il est la copie, retirée le 2026-10-27, reste dans l'historique Git) |
| `docs\` | Les guides pour les personnes: celui-ci, **Installation**, **Traiter le fichier .blend**, **Réalité augmentée**, **Documents de SOS Ottawa** (`sos-ottawa-files.md`, résumé des documents numérisés de `docs\sos-files\`) |
| `AGENTS.md` | Les consignes pour les assistants d'IA (Claude) qui travaillent dans le projet |
| `docs/guidelines.md`, `docs/system-design.md` | Les règles du code du site, et le design (couleurs, typographie, mouvement) |
| `TODO.md` | Ce qui reste à faire, numéroté |
| `CHANGELOG.md` | Ce qui a changé, version par version |

## Les données (disque `O:`)

Hors de Git, car elles pèsent des centaines de gigaoctets: les projets Metashape (`O:\photogrammetry\`, à ne jamais
modifier), les exports des zones (`O:\modeles\`), et ce que produisent les outils avant la mise en ligne
(`O:\publishing\`, dont les zones préparées) ou en passant (`O:\temp\`, qu'on peut vider à tout moment hors
traitement). Le détail: le guide **Installation**, section 5.

## Les branches et les versions

- **`main`**: la version de référence du code et des pages. La pousser ne publie rien.
- **Une branche par travail** (`feature/…`, `docs/…`), fusionnée dans `main` une fois terminée, puis supprimée.
- **Les versions** : `0.x.y` jusqu'au 26 octobre 2026, puis `1.0.0-beta.N` pendant l'essai public (la première,
  `1.0.0-beta.1`), et `1.0.0` au lancement. Une version (« release ») a sa section datée dans `CHANGELOG.md` et une
  étiquette Git `vX.Y.Z` ; l'étiquette déclenche la publication du site.
- **Avant une release** :
  1. `npm run model:check` : les zones et le contexte changés dans le `.blend` depuis leur publication (le `.blend`
     enregistré). Le modèle se publie à part (`npm run model:upload`), sans release.
  2. `npm run i18n:status` : les pages anglaises en retard.
  3. `CHANGELOG.md` : tout ce qui a changé sous la version et sa date, un court résumé en tête ; `package.json`.
  4. `npm run build` : sans erreur.
- **Après la publication** : les anciennes adresses redirigent, `/modele`, la lightbox et la page 404 en ligne, la
  version affichée dans À propos, puis `npm run bing:submit` pour signaler les adresses à Bing.
- **Publier sans version**: sur GitHub, onglet **Actions**, **Deploy**, **Run workflow** sur `main`.
- **Essayer une branche en ligne**: même chose, en choisissant la branche. Cloudflare la met à une adresse d'essai
  (`<branche>-lock21-info.<compte>.workers.dev`, affichée dans le journal de l'action); `lock21.info` ne change pas.

Attention au fichier `.blend`: changer de branche remplace le fichier sur le disque si les deux branches n'en ont pas la
même version. Ne pas changer de branche pendant qu'un outil lit le `.blend`, ni avec le fichier ouvert dans Blender.

## Les services en ligne

| Service | Rôle | Adresse |
| --- | --- | --- |
| **GitHub** | le code (dépôt `remillc/lock21.info`) et la publication (action **Deploy**, qui envoie le site à Cloudflare) | <https://github.com/remillc/lock21.info> |
| **Cloudflare** | l'hébergement du site (Worker `lock21-info`, fichiers statiques, domaine `lock21.info`) et le journal du visualiseur 3D (Workers Logs), le nom de domaine `lock21.info`, l'adresse `info@lock21.info` (Email Routing: renvoyée vers la boîte Gmail de Christian), et le stockage R2 (bucket `lock21-tiles`): tuiles, téléchargements, réalité augmentée | <https://lock21.info/>, <https://tiles.lock21.info/> |
| **Google Analytics** | la mesure d'audience, avec témoins; les visiteurs peuvent la refuser sur la page Confidentialité (propriété `G-796S6VL5P8`) | <https://analytics.google.com/> |

Les identifiants du stockage R2 sont dans `.env.local`, à la racine du projet, hors de Git (guide **Installation**,
section 4). La publication du site sur GitHub n'a besoin d'aucun secret.

## Ce que fait l'IA

Une partie du travail est faite par une IA, **Claude** (Anthropic), dans Claude Code: elle écrit du code, lance des
commandes et rédige des textes à la demande de Christian, qui décide, vérifie et approuve. Le partage est le suivant.

**Fait par Christian, sans IA:**

- les plongées, le tournage et les réglages de la caméra; le journal des plongées;
- la photogrammétrie dans Metashape: alignement, nuage dense, maillage, texture (projets dans `O:\photogrammetry\`);
- dans Blender, `modeles\lock-21-publishing.blend`: la place des zones, leurs découpes (booléens), les maquettes et
  leurs matériaux, le terrain;
- les textes des pages du site en français (carnet de terrain), sauf les passages notés plus bas;
- les choix: ce qui est publié, l'aspect du site et du visualiseur, les réglages (lumière, saisons, visibilité).

**Fait par l'IA, à la demande et sous le contrôle de Christian:**

- le code: le visualiseur 3D (`src\viewer\`), les composants et les styles du site (`src\`), les outils de publication
  (`tools\`, scripts Blender, Node et PowerShell), la configuration (Cloudflare, GitHub Actions);
- l'exécution des étapes de publication sur l'ordinateur de Christian (guide **Traiter le fichier .blend**: vérifier,
  tuiles, relief, contrôle, téléchargements); la mise en ligne (envoi vers R2, publication du site, versions) et toute
  fusion dans `main` seulement après l'accord de Christian;
- les traductions anglaises des pages (`src\content\docs\en\`);
- les guides de `docs\`, les README des outils, `CHANGELOG.md`, `TODO.md` et `AGENTS.md`, tenus à jour à chaque
  changement; quelques passages de pages du site rédigés à sa demande (Remerciements, À propos), relus par lui;
- les vérifications: tests dans des navigateurs sans écran (Chrome, WebKit) et sur appareils loués (BrowserStack),
  lecture du journal du visualiseur (Workers Logs) pour trouver les problèmes des visiteurs.

**Jamais fait par l'IA:** modifier les projets Metashape d'origine (`O:\photogrammetry\`); enregistrer le `.blend`
(elle le lit seulement, une fois qu'il est enregistré et fermé); afficher ou copier les secrets de `.env.local`;
publier les adresses privées des documents de Save Ontario Shipwrecks. Ces règles sont dans `AGENTS.md`, que l'IA lit
au début de chaque session.

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
| savoir ce que fait l'IA | la section **Ce que fait l'IA**, plus haut |
