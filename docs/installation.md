---
title: Installation
description: Préparer un ordinateur pour travailler sur lock21.info, du site au modèle 3D et aux téléchargements.
---

Ce guide prépare un ordinateur (Windows) pour travailler sur le projet: un nouvel ordinateur, ou une personne qui se
joint au projet. Il n'est pas nécessaire de tout installer: le tableau ci-dessous dit quoi installer selon le travail.

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
| **Blender** | 5.2 | [blender.org](https://www.blender.org/download/) | installé à l'endroit proposé: `C:\Program Files\Blender Foundation\Blender 5.2\`. Une carte graphique NVIDIA accélère les cuissons (OptiX) |
| **Python** | 3.12 | Microsoft Store, ou [python.org](https://www.python.org/) | seulement pour les outils; pas de bibliothèque à installer, sauf pour Google Earth (étape 3) |
| **Obj2Tiles** | 1.8.0 | [github.com/OpenDroneMap/Obj2Tiles/releases](https://github.com/OpenDroneMap/Obj2Tiles/releases) | décompresser dans `O:\publishing\bin\obj2tiles-1.8.0\` (l'exécutable et `ktx.dll`) |
| **GitHub CLI** (`gh`) | récente | [cli.github.com](https://cli.github.com/) | facultatif: publier le site en ligne de commande. Se connecter une fois: `gh auth login` |
| **Agisoft Metashape Professional** | 1.7.1 | licence du projet | lancer d'abord le serveur de licence RLM (raccourci `rlm` du menu Démarrer) |

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
| `O:\temp\` | fichiers intermédiaires et journaux, qu'on peut effacer et refaire |

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
