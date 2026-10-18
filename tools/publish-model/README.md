# Publication du modèle 3D

Chaîne de traitement qui transforme les modèles photogrammétriques de chaque zone en **tuiles 3D** (OGC 3D Tiles 1.1) affichées par le visualiseur du site (`/model-preview` pour l'instant).

> **État:** preuve de concept sur la zone 12, en cours. Ce document décrit ce qui existe et le restera à mesure que la chaîne évolue.

## Principes

- **Les originaux ne sont jamais modifiés.** Les projets Metashape (`O:\photogrammetry\`), les exports (`O:\modeles\`) et les fichiers Blender (`modeles/*.blend`) ne sont ouverts qu'en lecture: aucun script ne les sauvegarde.
- **Blender est la référence.** Le fichier de travail est **`modeles/lock-21-publishing.blend`** (copie de `lock-21-mockup.blend` du 2026-10-18, que la chaîne ne touche pas). Chaque objet de sa collection `zones` est importé d'un export de `O:\modeles\` et porte une propriété personnalisée **`source`**: le chemin de l'export `.glb` à publier (normalement le plus détaillé). Sa transformation (échelle, position, ajustées à la main) donne la mise en place; ses modificateurs donnent les retouches: **booléens** pour retirer le bruit et rogner entre zones voisines, **Lattice** pour corriger une déformation. La chaîne reporte ces retouches sur l'export haute résolution, sans jamais modifier le `.blend`.
- **La texture porte le détail, la géométrie reste légère.** La texture photo contient déjà l'éclairage: le visualiseur l'affiche sans calcul de lumière. La géométrie est simplifiée tant que l'écart avec le maillage complet reste sous un seuil mesuré.
- **Une zone = un tileset indépendant**, versionné par date et inscrit dans `manifest.json`. Mettre à jour une zone ne touche pas aux autres. Les zones sont un découpage de travail: le visiteur voit un seul modèle continu.

## Étapes

**En pratique**, depuis la racine du dépôt, après une retouche dans `lock-21-publishing.blend` (sauvegardé):

| Commande | Effet |
| --- | --- |
| `npm run model:check` | liste les zones modifiées depuis leur dernière publication, sans rien publier |
| `npm run model:publish-changed` | republie seulement les zones modifiées |
| `npm run model:publish -- -Zones "zone 2","zone 3"` | republie une liste de zones |
| `npm run model:serve-tiles` | sert `O:\publishing\tiles` en local (port 8081, CORS) |
| `npm run viewer:dev` | visualiseur sur `http://localhost:3100/` |
| `npm run viewer:build` | construit le visualiseur dans `viewer/dist` |

Ces scripts appellent `publish_zones.ps1` (options `-Zones`, `-Changed`, `-DryRun`, `-Version`, `-Density`), `serve-tiles.ps1` et le projet `viewer/`.

Le script enchaîne les étapes 5 et 6 pour chaque zone (le recalage de l'étape 4 se fait automatiquement), puis supprime les versions de tuiles qui ne sont plus dans le manifeste. Journal par zone: `O:\temp\<zone>-publish.log`.

**Détection des changements:** à la préparation, `blend_state.py` calcule une empreinte de l'état de la zone dans le `.blend` (transformation, mesh, `source`, modificateurs visibles, et pour les volumes de coupe et lattices: position et forme). Elle est enregistrée avec les tuiles (`fingerprint.json`). `check_changes.py` la compare au `.blend` courant et liste les zones à republier, avec ce qui a changé. On peut donc retoucher le `.blend` pendant une publication: chaque zone garde l'empreinte de l'état qu'elle a réellement utilisé, et la prochaine exécution de `-Changed` rattrape les retouches arrivées entre-temps.

| # | Étape | Script | Entrées | Sorties |
| --- | --- | --- | --- | --- |
| 0 | Analyse de résolution | `../model-analysis/run.ps1` | `.blend` | `../model-analysis/reports/<date>.{json,md}` |
| 1 | Inventaire des projets Metashape | `scan_projects.py` | `O:\photogrammetry\*.psx` | `projects-scan.json` |
| 2 | Source de chaque zone | propriété `source` des objets de zone dans le `.blend` (`zones.json`: inventaire de travail) | | |
| 3 | Vérification du repère des exports | `verify_sources.py` | `O:\modeles\zone-*\*.glb` + `.blend` | `sources-check.json` |
| 4 | Recalage (automatique à l'étape 5) | `register_zone.py` | export `source` + `.blend` | `transforms/<zone>.json` (cache) |
| 5 | Préparation | `prepare_zone.py --zone "zone N" [--density 3000] --out …` | `.blend` (+ export `source`) | `O:\temp\<zone>\...\<zone>.obj` + `.jpg` + `<zone>-prepare.json` |
| 6 | Tuilage + manifeste | `tile_zone.ps1` (+ `update_manifest.py`) | sortie de 5 | `O:\publishing\tiles\<zone>\<version>\` + `manifest.json` |
| 7 | Aperçu local | `serve-tiles.ps1` + `viewer/`: `npm run dev` | `O:\publishing\tiles\` | `http://localhost:3100/` |
| 8 | Mise en ligne | *à venir* (rclone vers Cloudflare R2) | | |

### 3. Vérification du repère

Échantillonne 20 000 sommets de chaque export et mesure la distance au sommet le plus proche du mesh Blender, en coordonnées locales de l'objet:

- **même maillage**: plus de 90 % des points à distance nulle;
- **même repère**: médiane sous 0,5 unité (pieds), pour un export d'une autre résolution du même modèle;
- **repère différent**: le mesh Blender a été déplacé après l'import; passer à l'étape 4.

### 4. Recalage

Cherche d'abord la meilleure des 24 orientations à angle droit sur un petit échantillon, puis raffine par ICP (*iterative closest point*) avec estimation de l'échelle, en ignorant les 20 % de paires les plus éloignées (parties sans recouvrement). Le résultat donne la matrice export → coordonnées monde de la scène Blender, l'échelle, l'angle de rotation et le résidu. La même matrice vaut pour tous les exports du même chunk Metashape, ce que le script vérifie sur les exports passés en argument supplémentaire.

`prepare_zone.py` l'appelle automatiquement et met le résultat en cache dans `transforms/<zone>.json`; il n'est recalculé que si l'export `source`, sa date ou le mesh de la zone changent.

Résultat zone 12: échelle 0,977, rotation 0,57°, résidu médian 0,033 pi (1 cm), identique pour les exports 4,5 M et 13 M.

### 5. Préparation

1. importe l'export désigné par la propriété `source` de la zone;
2. le recale sur le mesh de la zone (étape 4, avec cache) et le place comme l'objet de la zone;
3. copie et applique, dans l'ordre, les modificateurs de **déformation** de la zone (tout sauf les booléens, ex. Lattice): un Lattice déforme selon la position de l'objet Lattice dans la scène, donc la version haute résolution, placée au même endroit, reçoit exactement la même correction;
4. **reporte le nettoyage par proximité**: Blender calcule le mesh final de la zone tel qu'affiché (tous modificateurs appliqués: booléens, etc.); les sommets de la version haute résolution à plus de `--max-distance` (5 cm par défaut) de ce mesh sont supprimés. Toute retouche faite dans le `.blend` (booléen de n'importe quelle forme, suppression à la main) est ainsi reportée, sans appliquer de booléen sur des maillages ouverts de plusieurs millions de faces (lent et peu fiable);
5. décime (`Decimate`, mode *collapse*) vers `--density` triangles par m² de surface (3 000 par défaut: zones 10 et 12 restent à quelques millimètres du maillage complet), ou selon `--ratio`;
6. retire les fragments de moins de `--min-island` sommets (100 par défaut);
7. **mesure l'écart** entre le maillage décimé et le maillage complet, dans les deux sens (point le plus proche sur la surface), et le consigne dans le rapport;
8. exporte en OBJ avec la texture en JPEG, redimensionnée à un **multiple de 16 px**: Obj2Tiles divise la texture par 2 à chaque niveau de détail, et une texture compressée pour la carte graphique (KTX2) dont la taille n'est pas un multiple de 4 s'affiche en noir (zone 10: 6600 → 3300 → 1650 px). **Axe Y vers le haut**: Obj2Tiles suit la convention OBJ/glTF et convertit lui-même en Z vers le haut (3D Tiles). Un OBJ exporté Z vers le haut donne un modèle couché sur le côté.

### Zone refaite dans Metashape: `swap_zone_source.py`

Quand une zone est retraitée, son nouvel export doit remplacer l'ancien mesh **dans le `.blend`**, pour que les retouches (booléens, lattice) soient vérifiées sur la nouvelle version avant publication. Publier directement le nouvel export avec le nettoyage de l'ancien mesh risquerait d'effacer des parties nouvellement reconstruites.

À exécuter dans Blender, sur `lock-21-publishing.blend`: onglet **Scripting** → *Text* → *Open…* → `tools/publish-model/swap_zone_source.py`, régler `ZONE`, `EDIT_MESH` (export importé pour l'édition, de préférence léger) et `SOURCE` (export à publier, du même chunk), puis **Run Script**. Le script importe `EDIT_MESH`, le recale sur le mesh actuel de la zone, lui copie modificateurs, propriétés et enfants, met à jour `source` et range l'ancien mesh, caché, dans la collection `zones - archive`. Il ne sauvegarde pas: vérifier les volumes de coupe, ajuster, puis sauvegarder.

Essai sur la zone 10 (export 652 k de 2026 sur le mesh de 140 k): échelle 1,003, rotation 1,2°, résidu médian 0,067 pi (2 cm). Ses deux booléens ne retirent rien, ni sur l'ancien mesh ni sur le nouveau.

### 6. Tuilage

`Obj2Tiles --preset standard --texture-format Ktx2 --unlit --max-texture-size 0 --decimation-mode Standard --lods 3 --divisions 0`: hiérarchie de niveaux de détail (octree, découpage en Z), coordonnées locales, contenu `.glb`, textures **KTX2** (restent compressées en mémoire graphique, indispensable sur téléphone). Chaque version est écrite dans un nouveau dossier daté et n'est plus jamais modifiée; `manifest.json` pointe vers la version active.

Ensuite, `compress_tiles.mjs` (glTF-Transform) compresse la géométrie de chaque tuile en **meshopt** (quantification + `EXT_meshopt_compression`); le visualiseur la décode avec `MeshoptDecoder`. Avec `--no-root-content` (la racine dupliquait le niveau le plus grossier), l'ouverture du visualiseur (zones 10 et 12) passe de 61,2 Mo à **18,1 Mo**, sans différence visible.

Leçons des essais sur la zone 12 (OBJ préparé de 1,2 M faces, texture 12 467 px):

| Essai | Réglages | Tuiles | Triangles au niveau le plus fin | Textures au niveau le plus fin | Total | Constat |
| --- | --- | ---: | ---: | --- | ---: | --- |
| poc1 | preset standard, `--lods 4 --divisions 2` | 27 915 | 3,4 M | surtout 32 à 256 px | 362 Mo | beaucoup trop de tuiles: le découpage coupe les triangles et triple leur nombre |
| poc2 | `--lods 3 --divisions 0 --max-texture-size 2048` | 70 | 1,27 M | 512 px | 64 Mo | `--max-texture-size` s'applique à la **texture source** avant découpage: résolution perdue |
| poc3 | `--lods 3 --divisions 0 --max-texture-size 0 --decimation-mode Standard` | 70 | 1,27 M | 2048 et 4096 px | 103 Mo | résolution conservée. Reste à faire: niveaux éloignés trop lourds (400 k triangles à la racine), géométrie non compressée (51 Mo chargés à l'ouverture) |

### 7. Aperçu local

Dans deux terminaux:

```powershell
.\tools\publish-model\serve-tiles.ps1      # tuiles sur http://localhost:8081 (CORS, sans cache)
cd viewer; npm run dev                     # visualiseur sur http://localhost:3100/
```

Paramètres de test du visualiseur: `?tiles=<url>` (autre serveur de tuiles), `?error=<pixels>` (force un niveau de détail; une grande valeur garde les niveaux grossiers).

Pour un téléphone sur le même Wi-Fi: `serve-tiles.ps1 -Lan` (le visualiseur écoute déjà sur le réseau), puis ouvrir `http://<IP du PC>:3100/?tiles=http://<IP du PC>:8081`. Windows demande une fois d'autoriser l'accès réseau.

## Dossiers

| Dossier | Contenu | Conservé? |
| --- | --- | --- |
| `O:\photogrammetry\` | projets Metashape originaux | **ne jamais modifier** |
| `O:\modeles\zone-*\` | exports Metashape (`.glb`, `.ply`) | **ne jamais modifier** |
| `O:\publishing\bin\` | exécutables tiers (Obj2Tiles) | oui |
| `O:\publishing\metashape\<zone>\` | copies de travail Metashape (chunk FINAL seulement) | oui |
| `O:\publishing\tiles\` | tuiles générées + `manifest.json`, avant mise en ligne | oui |
| `O:\publishing\downloads\` | modèle complet téléchargeable (`.glb`, `.kmz`) | oui |
| `O:\temp\` | intermédiaires régénérables (OBJ préparés, journaux) | non |

**Espace disque:** la chaîne produit beaucoup de données. Après chaque essai, supprimer ce qui est remplacé: versions de tuiles qui ne sont plus dans `manifest.json`, anciens OBJ préparés, journaux et captures. Ne garder que la version active, l'OBJ préparé courant (pour retuiler sans refaire la préparation) et les outils.

## Exécutables et bibliothèques

| Outil | Version | Emplacement / source | Utilisé pour |
| --- | --- | --- | --- |
| Blender | 5.2.0 LTS | `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe` | étapes 0, 3, 4, 5, toujours en arrière-plan (`-b --factory-startup`) et sans sauvegarde. Le `.blend` a été enregistré avec Blender 4.4. |
| ↳ numpy, `mathutils` (KDTree, BVHTree), `bmesh` | fournis avec Blender | | calculs de distance, ICP, îlots |
| Python | 3.12.10 (Microsoft Store) | `python` | étapes 1 et 6, bibliothèque standard seulement, lancé avec `-I` |
| Agisoft Metashape Professional | 1.7.1 | lancer d'abord le serveur de licence RLM: `C:\Users\chris\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\rlm.lnk` | exports d'origine; retexturage à venir |
| Obj2Tiles (OpenDroneMap) | 1.8.0 | `O:\publishing\bin\obj2tiles-1.8.0\`, de [github.com/OpenDroneMap/Obj2Tiles/releases](https://github.com/OpenDroneMap/Obj2Tiles/releases) (exécutable autonome + `ktx.dll`) | étape 6 |
| Node.js / npm | 24.21.0 / 11.19.0 | | site, `npx` |
| http-server | 14.1.1 (via `npx`) | npm | étape 7 |
| glTF-Transform + meshoptimizer | 4.5.1 / 1.x | `tools/publish-model/package.json` (`npm install` dans ce dossier) | étape 6: compression meshopt des tuiles |
| Vite | 8.x | `viewer/package.json` | visualiseur autonome (`viewer/`, `npm run dev` → `http://localhost:3100/`) |
| three.js | 0.186.1 | npm (`package.json`) | rendu WebGL du visualiseur |
| 3d-tiles-renderer (NASA-AMMOS) | 0.5.3 | npm (`package.json`) | chargement des tuiles dans three.js |
| Transcodeur Basis (KTX2) | celui de three 0.186.1 | `static/vendor/basis/`, copié de `node_modules/three/examples/jsm/libs/basis/` | décodage des textures KTX2 dans le navigateur. À recopier à chaque mise à jour de three. |

`.npmrc` active `legacy-peer-deps`: 3d-tiles-renderer déclare des dépendances optionnelles (React Three Fiber, Babylon.js) qui entrent en conflit avec les types React de Docusaurus et ne sont pas utilisées.
