---
title: Installation
description: Préparer un ordinateur pour travailler sur lock21.info, du site au modèle 3D et aux téléchargements.
---

Ce guide prépare un ordinateur (Windows) pour travailler sur le projet: un nouvel ordinateur, ou une personne qui se
joint au projet. Il n'est pas nécessaire de tout installer: le tableau ci-dessous dit quoi installer selon le travail.

## Prérequis

**Système:** Windows 10 ou 11. Les scripts de publication sont écrits pour PowerShell (inclus dans Windows). Le site
et le visualiseur fonctionnent aussi sur macOS ou Linux, mais pas la publication du modèle 3D.

**Matériel**, selon le travail:

| Travail | Mémoire vive | Carte graphique | Espace disque |
| --- | --- | --- | --- |
| Le site et le visualiseur | 8 Go | n'importe laquelle qui affiche du WebGL 2 (tout navigateur récent) | environ 3 Go: le projet, ses bibliothèques et les fichiers `.blend` |
| La publication du modèle 3D et les téléchargements | 64 Go (Blender charge des zones jusqu'à 36 millions de faces) | NVIDIA RTX avec 16 Go de mémoire, pour cuire le relief en 16 384 px (OptiX) | environ 5 Go dans `O:\publishing\`, en plus des exports des zones |
| Les exports des zones (Metashape) | selon Agisoft: beaucoup, pour les grandes zones | NVIDIA recommandée | des centaines de gigaoctets dans `O:\photogrammetry\` et `O:\modeles\` |

L'ordinateur du projet: Windows 11 Pro, Intel Core i9-13900K (24 cœurs), 64 Go de mémoire, NVIDIA GeForce RTX 4080
SUPER (16 Go). La cuisson du relief en 16 384 px y occupe presque toute la mémoire de la carte: elle échoue si un
autre Blender utilise la carte en même temps (fenêtre ouverte, rendu). Fermer Blender pendant les cuissons.

**Accès:**

| Service | Pour | Remarque |
| --- | --- | --- |
| **GitHub**, dépôt `remillc/lock21.info` | récupérer le projet; enregistrer et publier le travail | droits d'écriture pour pousser |
| **Cloudflare**, compte du domaine `lock21.info` | mettre le modèle et les téléchargements en ligne (R2); domaine, cache, courriel `info@lock21.info` | les clés R2 vont dans `.env.local` (section 4) |
| **Agisoft Metashape Professional** | produire les exports des zones | licence du projet |
| **Google Analytics** | consulter la mesure d'audience | facultatif |

**Connexion Internet:** le clone télécharge environ 2 Go (fichiers `.blend` compris), et une mise en ligne du modèle
envoie de quelques centaines de mégaoctets à plus d'un gigaoctet.

## Quoi installer selon le travail

| Travail | Git + Git LFS | Node.js | Blender | Python | Obj2Tiles | Disque `O:` | `.env.local` | Metashape |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Modifier les textes et les pages du site | oui | oui | | | | | | |
| Travailler sur le visualiseur 3D | oui | oui | | | | | | |
| Publier le modèle 3D (le guide *Traiter le fichier .blend*) | oui | oui | oui | oui | oui | oui | oui | |
| Refaire les téléchargements (Google Earth, GLB) | oui | oui | oui | oui | | oui | oui | |
| Produire les exports des zones | | | | | | oui | | oui |

Toutes les commandes se tapent dans **PowerShell**. Le dossier du projet est ici `F:\projets\lock21.info`; si c'est un
autre dossier, remplacer ce chemin partout.

## 1. Les logiciels

| Logiciel | Version | Où le trouver | Remarque |
| --- | --- | --- | --- |
| **Git** et **Git LFS** | récente | [git-scm.com](https://git-scm.com/), Git LFS est inclus | les fichiers `.blend` sont stockés avec Git LFS |
| **Node.js** | 22.12 ou plus (24 en usage) | [nodejs.org](https://nodejs.org/) | installe aussi `npm` |
| **Blender** | 5.2 | [blender.org](https://www.blender.org/download/) | une carte graphique NVIDIA accélère les cuissons (OptiX) |
| **Python** | 3.12 | Microsoft Store, ou [python.org](https://www.python.org/) | seulement pour les outils; pas de bibliothèque à installer, sauf pour Google Earth (étape 3) |
| **Obj2Tiles** | 1.8.0 | [github.com/OpenDroneMap/Obj2Tiles/releases](https://github.com/OpenDroneMap/Obj2Tiles/releases) | décompresser dans `O:\publishing\bin\obj2tiles-1.8.0\` (l'exécutable et `ktx.dll`) |
| **GitHub CLI** (`gh`) | récente | [cli.github.com](https://cli.github.com/) | facultatif: publier le site en ligne de commande. Se connecter une fois: `gh auth login` |
| **Agisoft Metashape Professional** | 1.7.1 | licence du projet |  |

Pour vérifier, dans PowerShell:

```powershell
git --version
git lfs version
node --version
python --version
```

Chaque commande doit afficher une version.

## 2. Récupérer le projet

```powershell
git lfs install
git clone https://github.com/remillc/lock21.info.git F:\projets\lock21.info
cd F:\projets\lock21.info
```

Le clone télécharge aussi les fichiers `.blend` (environ 1 Go pour `lock-21-publishing.blend`): compter quelques
minutes.

## 3. Les dépendances

Le projet a trois parties qui ont chacune leurs bibliothèques. Dans le dossier du projet:

```powershell
npm install                               # le site
npm --prefix viewer install               # le visualiseur 3D
npm --prefix tools\publish-model install  # les outils de publication (compression, envoi vers le serveur)
```

Pour Google Earth seulement, un petit environnement Python à part, avec deux bibliothèques:

```powershell
python -m venv tools\google-earth\.venv
tools\google-earth\.venv\Scripts\python -m pip install pycollada==0.9.2 numpy
```

Ces dossiers (`node_modules`, `.venv`) ne vont jamais dans Git.

## 4. Le fichier `.env.local`

Il contient les **identifiants du serveur** où sont rangés le modèle 3D et les téléchargements (Cloudflare R2). Sans
lui, tout fonctionne sauf la mise en ligne (`npm run model:upload`, `npm run downloads:upload`).

Créer, à la racine du projet, un fichier texte nommé `.env.local` avec ces quatre lignes:

```text
R2_ENDPOINT=https://<identifiant du compte>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<clé>
R2_SECRET_ACCESS_KEY=<clé secrète>
R2_BUCKET=lock21-tiles
```

Les valeurs viennent du tableau de bord Cloudflare: **R2** › **Manage API tokens** (un jeton avec les droits de lecture
et d'écriture sur le bucket `lock21-tiles`). Ce fichier est **secret**: il est exclu de Git, et il ne faut jamais le
copier dans un message, un courriel ou une capture.

## 5. Le disque `O:`

Les données du projet (projets Metashape, exports, tuiles, téléchargements) sont sur le disque `O:`, pas dans Git: elles
pèsent des centaines de gigaoctets.

| Dossier | Contenu |
| --- | --- |
| `O:\photogrammetry\` | projets Metashape originaux. **Ne jamais les modifier** |
| `O:\modeles\zone-N\` | exports des zones (`.glb`), basse et haute résolution |
| `O:\publishing\bin\` | Obj2Tiles |
| `O:\publishing\tiles\` | tuiles produites sur l'ordinateur, avant leur mise en ligne |
| `O:\publishing\downloads\` | téléchargements produits (Google Earth, GLB) |
| `O:\publishing\prepared\` | zones préparées (une par dossier, celles des tuiles en ligne): les téléchargements, la réalité augmentée et le relief en sont faits. À garder: les refaire prend plus d'une heure |
| `O:\temp\` | fichiers intermédiaires et journaux: on peut tout effacer à tout moment (sauf pendant un traitement) |

Sur un autre ordinateur sans le disque `O:`, on peut encore travailler sur le site et le visualiseur (avec les tuiles en
ligne, voir plus bas), mais pas publier le modèle.

## 6. Les serveurs de travail

Pour voir le site ou le visualiseur pendant qu'on travaille, on lance de petits serveurs sur l'ordinateur. Chacun occupe
**sa propre fenêtre PowerShell** tant qu'il tourne (ouvrir une fenêtre par serveur, aller dans le dossier du projet avec
`cd F:\projets\lock21.info`, lancer la commande, laisser la fenêtre ouverte; **Ctrl+C** pour l'arrêter).

| Serveur | Commande | Adresse | Sert à |
| --- | --- | --- | --- |
| Le site | `npm run dev` | <http://localhost:4321/> | voir les pages; se recharge à chaque modification |
| Le visualiseur 3D | `npm run viewer:dev` | <http://localhost:3100/modele/viewer/> | travailler sur le visualiseur; **nécessaire aussi pour la page `/modele/` du site** |
| Les tuiles de l'ordinateur | `npm run model:serve-tiles` | <http://localhost:8081/> | montrer au visualiseur les tuiles produites sur l'ordinateur, avant leur mise en ligne |

**D'où viennent les tuiles du visualiseur?** Pendant le travail, le visualiseur prend celles de l'ordinateur (port
8081): lancer le troisième serveur. Pour voir plutôt le modèle en ligne, ajouter à l'adresse
`?tiles=https://tiles.lock21.info`, par exemple
<http://localhost:3100/modele/viewer/?tiles=https://tiles.lock21.info>.

## 7. Le serveur en ligne (Cloudflare R2)

Rien à faire sur un nouvel ordinateur, sauf dans un cas: le serveur n'accepte que les pages venant d'adresses
autorisées (**CORS**). Sont autorisées `https://lock21.info`, `http://localhost:3100` et `http://localhost:4321`.
Si un visualiseur lancé sur un autre port affiche une erreur « blocked by CORS policy », ajouter son adresse dans le
tableau de bord Cloudflare: **R2** › `lock21-tiles` › **Settings** › **CORS Policy**.

Le cache de Cloudflare garde les fichiers de `tiles.lock21.info` près des visiteurs: règle **Tuiles R2** (domaine
`lock21.info` › **Caching** › **Cache Rules**: *Hostname equals `tiles.lock21.info`*, *Eligible for cache*). Il suit
l'en-tête `Cache-Control` des fichiers: un an pour les tuiles (chaque publication a son propre dossier daté),
60 secondes pour `manifest.json`. Pour vérifier, faire une requête GET (`curl -s -o NUL -D - <adresse>`), deux fois:
`cf-cache-status: HIT` la deuxième fois. Une requête HEAD (`curl -I`) affiche toujours `DYNAMIC`.

Les navigateurs et Google Earth reçoivent les mêmes durées: **Caching** › **Configuration** › **Browser Cache TTL**
est réglé sur *Respect Existing Headers*. Avec une durée fixe (4 heures par défaut), Cloudflare remplaçait les
5 minutes de la liste Google Earth (`lock-21.kml`) et les 60 secondes du manifeste: après un envoi, Google Earth Pro
pouvait garder l'ancienne liste pendant 4 heures.

## 8. Vérifier que tout fonctionne

```powershell
npm run build:viewer   # construit le visualiseur
npm run build          # construit le site: doit finir par « Complete! »
npm run dev            # puis ouvrir http://localhost:4321/
```

Pour la publication du modèle, en plus:

```powershell
npm run model:check    # lit le .blend (sauvegardé) et liste les zones: doit afficher une ligne par zone
```

Si tout cela fonctionne, l'ordinateur est prêt. La suite: le guide **Traiter le fichier .blend**
(`docs/processing-the-blend-file.md`).

## Problèmes fréquents

- **`npm` n'est pas reconnu**: Node.js n'est pas installé, ou PowerShell a été ouvert avant l'installation. Fermer et
  rouvrir PowerShell.
- **« Port 4321 is in use »** (ou 3100, 8081): le serveur tourne déjà dans une autre fenêtre. Utiliser celle-là, ou
  l'arrêter (Ctrl+C) avant de le relancer.
- **Le fichier `.blend` fait quelques centaines d'octets**: Git LFS n'était pas installé au moment du clone. Lancer
  `git lfs install`, puis `git lfs pull`.
- **Blender est installé ailleurs**: les scripts prennent l'option `-Blender "<chemin vers blender.exe>"`.
- **La page `/modele/` est vide en développement**: le serveur du visualiseur (`npm run viewer:dev`) ne tourne pas.
