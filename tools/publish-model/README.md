# Publication du modèle 3D

Chaîne de traitement qui transforme les modèles photogrammétriques de chaque zone en **tuiles 3D** (OGC 3D Tiles 1.1) affichées par le visualiseur du site (`/model-preview` pour l'instant).

> **État:** preuve de concept sur la zone 12, en cours. Ce document décrit ce qui existe et le restera à mesure que la chaîne évolue.

## Principes

- **Les originaux ne sont jamais modifiés.** Les projets Metashape (`O:\photogrammetry\`), les exports (`O:\modeles\`) et le fichier Blender (`modeles/lock-21-mockup.blend`) ne sont ouverts qu'en lecture: aucun script ne les sauvegarde.
- **Blender est la référence pour la mise en place.** L'échelle et la position de chaque zone dans `lock-21-mockup.blend` ont été ajustées à la main, et les modificateurs booléens définissent le rognage entre zones voisines.
- **La texture porte le détail, la géométrie reste légère.** La texture photo contient déjà l'éclairage: le visualiseur l'affiche sans calcul de lumière. La géométrie est simplifiée tant que l'écart avec le maillage complet reste sous un seuil mesuré.
- **Une zone = un tileset indépendant**, versionné par date et inscrit dans `manifest.json`. Mettre à jour une zone ne touche pas aux autres. Les zones sont un découpage de travail: le visiteur voit un seul modèle continu.

## Étapes

| # | Étape | Script | Entrées | Sorties |
| --- | --- | --- | --- | --- |
| 0 | Analyse de résolution | `../model-analysis/run.ps1` | `.blend` | `../model-analysis/reports/<date>.{json,md}` |
| 1 | Inventaire des projets Metashape | `scan_projects.py` | `O:\photogrammetry\*.psx` | `projects-scan.json` |
| 2 | Registre zone ↔ sources | `zones.json` (édité à la main, d'après 1 et 3) | | |
| 3 | Vérification du repère des exports | `verify_sources.py` | `O:\modeles\zone-*\*.glb` + `.blend` | `sources-check.json` |
| 4 | Recalage (si repère différent) | `register_zone.py` | export `.glb` + `.blend` | `transforms/<zone>.json` |
| 5 | Préparation | `prepare_zone.py` | export haute résolution + transformation + `.blend` | `O:\temp\<zone>\...\<zone>.obj` + `.jpg` + `<zone>-prepare.json` |
| 6 | Tuilage + manifeste | `tile_zone.ps1` (+ `update_manifest.py`) | sortie de 5 | `O:\publishing\tiles\<zone>\<version>\` + `manifest.json` |
| 7 | Aperçu local | `serve-tiles.ps1` + `npm run dev -- --port 3100` | `O:\publishing\tiles\` | `http://localhost:3100/model-preview` |
| 8 | Mise en ligne | *à venir* (rclone vers Cloudflare R2) | | |

### 3. Vérification du repère

Échantillonne 20 000 sommets de chaque export et mesure la distance au sommet le plus proche du mesh Blender, en coordonnées locales de l'objet:

- **même maillage**: plus de 90 % des points à distance nulle;
- **même repère**: médiane sous 0,5 unité (pieds), pour un export d'une autre résolution du même modèle;
- **repère différent**: le mesh Blender a été déplacé après l'import; passer à l'étape 4.

### 4. Recalage

Cherche d'abord la meilleure des 24 orientations à angle droit sur un petit échantillon, puis raffine par ICP (*iterative closest point*) avec estimation de l'échelle, en ignorant les 20 % de paires les plus éloignées (parties sans recouvrement). Le résultat donne la matrice export → coordonnées monde de la scène Blender, l'échelle, l'angle de rotation et le résidu. La même matrice vaut pour tous les exports du même chunk Metashape, ce que le script vérifie sur les exports passés en argument supplémentaire.

Résultat zone 12: échelle 0,977, rotation 0,57°, résidu médian 0,033 pi (1 cm), identique pour les exports 4,5 M et 13 M.

### 5. Préparation

1. importe l'export haute résolution;
2. applique la matrice de l'étape 4 (coordonnées monde, mètres);
3. rogne: supprime les faces dont le centre est dans le volume (convexe) de chaque modificateur booléen `DIFFERENCE` de la zone, plutôt que d'appliquer le booléen, lent et peu fiable sur des maillages ouverts de plusieurs millions de faces;
4. décime (`Decimate`, mode *collapse*) selon `--ratio`;
5. retire les fragments de moins de `--min-island` sommets (100 par défaut);
6. **mesure l'écart** entre le maillage décimé et le maillage complet, dans les deux sens (point le plus proche sur la surface), et le consigne dans le rapport;
7. exporte en OBJ avec la texture en JPEG, **axe Y vers le haut**: Obj2Tiles suit la convention OBJ/glTF et convertit lui-même en Z vers le haut (3D Tiles). Un OBJ exporté Z vers le haut donne un modèle couché sur le côté.

### 6. Tuilage

`Obj2Tiles --preset standard --texture-format Ktx2 --unlit --max-texture-size 0 --decimation-mode Standard --lods 3 --divisions 0`: hiérarchie de niveaux de détail (octree, découpage en Z), coordonnées locales, contenu `.glb`, textures **KTX2** (restent compressées en mémoire graphique, indispensable sur téléphone). Chaque version est écrite dans un nouveau dossier daté et n'est plus jamais modifiée; `manifest.json` pointe vers la version active.

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
npm run dev -- --port 3100                 # site sur http://localhost:3100/model-preview
```

Pour un téléphone sur le même Wi-Fi: `serve-tiles.ps1 -Lan`, puis `$env:MODEL_TILES_URL = "http://<IP du PC>:8081"; npm run dev -- --port 3100 --host 0.0.0.0`, et ouvrir `http://<IP du PC>:3100/model-preview`. Windows demande une fois d'autoriser l'accès réseau.

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
| three.js | 0.186.1 | npm (`package.json`) | rendu WebGL du visualiseur |
| 3d-tiles-renderer (NASA-AMMOS) | 0.5.3 | npm (`package.json`) | chargement des tuiles dans three.js |
| Transcodeur Basis (KTX2) | celui de three 0.186.1 | `static/vendor/basis/`, copié de `node_modules/three/examples/jsm/libs/basis/` | décodage des textures KTX2 dans le navigateur. À recopier à chaque mise à jour de three. |

`.npmrc` active `legacy-peer-deps`: 3d-tiles-renderer déclare des dépendances optionnelles (React Three Fiber, Babylon.js) qui entrent en conflit avec les types React de Docusaurus et ne sont pas utilisées.
