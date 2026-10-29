---
title: Réalité augmentée
description: Comment fonctionne la réalité augmentée du modèle 3D, comment refaire ses fichiers et comment l'essayer sur un téléphone.
---

La réalité augmentée (RA) pose l'écluse devant soi, avec un téléphone ou une tablette, à deux tailles:

| Version | Taille | Pour |
| --- | --- | --- |
| **Sur une table** | 1:100 (environ 70 × 38 cm) | une table, un bureau, le sol d'une pièce |
| **Taille réelle** | 1:1 (environ 70 × 38 m) | un grand espace dégagé: parc, terrain, plage |

Les deux montrent **les zones relevées en plongée et les remplissages** (les pièces de la maquette qui comblent les
trous entre les zones), sans le terrain, les murs ni les talus de la maquette autour.

## Comment ça marche

Il n'y a pas de bibliothèque de réalité augmentée dans le site: chaque téléphone ouvre le modèle dans sa propre
visionneuse.

| Appareil | Visionneuse | Fichier |
| --- | --- | --- |
| iPhone, iPad (Safari) | **AR Quick Look** (Apple) | USDZ |
| Android | **WebXR dans Chrome** (code du visualiseur, `src/viewer/android-ar.js`): un toucher ouvre la caméra; Scene Viewer (Google) si Chrome n'a pas la RA WebXR | GLB (1:100) |

Le visiteur lance la RA de deux façons:

- **dans le visualiseur 3D**, avec le bouton en forme de cube, à gauche du bouton du plongeur. Il n'apparaît que sur
  les téléphones et tablettes qui savent afficher la RA. Par défaut, il ouvre la version « sur une table »; avec
  `?ar=full` dans l'adresse de la page, la version « taille réelle »;
- **depuis un ordinateur**, avec les deux codes QR de la section « Réalité augmentée » de la page `/modele`: on les
  scanne avec le téléphone, qui ouvre la page à la bonne version.

Chaque lancement est compté dans Google Analytics (événement `ar_launch`, avec la taille), si le visiteur l'a accepté.

## Les fichiers

En ligne dans le bucket des tuiles (Cloudflare R2), sous `downloads/ar/`, servis à l'adresse du site par son Worker (`worker/index.js`, TODO #103): `https://lock21.info/downloads/ar/` (aussi `https://tiles.lock21.info/downloads/ar/`):

| Fichier | Pour |
| --- | --- |
| `lock-21-ar.glb` | Android, sur une table |
| `lock-21-ar.usdz` | iPhone et iPad, sur une table |
| `lock-21-ar-full.glb` | Android, taille réelle |
| `lock-21-ar-full.usdz` | iPhone et iPad, taille réelle |

Chaque téléphone ne télécharge qu'un fichier (environ 26 Mo en GLB, 37 Mo en USDZ). Les quatre portent le copyright
de Christian Rémillard (CC BY 4.0).

## Refaire les fichiers

À refaire quand une zone change ou s'ajoute, après les tuiles (guide **Traiter le fichier .blend**, étapes 2 et 3):
les modèles RA sont faits à partir des mêmes zones préparées, et des remplissages du contexte exporté à l'étape 6.1.

```powershell
# Sur une table: 1:100
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\google-earth\make_model.py -- -o O:\publishing\downloads\google-earth\ar -n lock-21-ar -t 400000 -s 2048 -x 0.01 --usdz --context O:\temp\google-earth\context\context.glb --context-objects "filler*" --origin=-20.100,11.063,0.842 --rebake zone-3

# Taille réelle: 1:1
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\google-earth\make_model.py -- -o O:\publishing\downloads\google-earth\ar -n lock-21-ar-full -t 400000 -s 2048 -x 1 --usdz --context O:\temp\google-earth\context\context.glb --context-objects "filler*" --origin=-20.100,11.063,0.842 --rebake zone-3
```

Les options: `-t` le nombre de triangles (400 000), `-s` la taille des textures (2048 px), `-x` l'échelle, `--usdz`
pour le fichier d'Apple, `--context` le contexte, `--context-objects "filler*"` pour n'en garder que les remplissages.
Sans `--context`, le modèle ne contient que les zones. `--origin`: le point du fichier `.blend` qui devient l'origine du modèle,
celui que la RA pose sous l'anneau et à partir duquel elle agrandit l'écluse: un point sur le plancher du sas, à 4 m à l'ouest de l'Empty
**`ar-origin`** que Christian a posé au bord est des zones 3 et 4 (x −16,100, y 11,063, z −0,008): x −20,100, y 11,063, à
la hauteur du plancher mesurée là, **z 0,842** (le plancher est à 0,8 à 1 m au-dessus du niveau de référence z 0; posé à
z 0, l'origine faisait monter le plancher avec la taille: 1 m à 1:1). Sans `--origin`, l'origine est le point de
référence du site à z 0. `--rebake zone-3`: la texture de la zone 3 est cuite à nouveau sur le modèle simplifié, avec
de nouvelles coordonnées de texture (xatlas, `tools/google-earth/xatlas_uv.py`): simplifiée au 1/20, sa texture
découpée en milliers de morceaux était brouillée. Les coordonnées sont gardées dans `O:	empr-uv` (xatlas prend
environ 8 minutes; le modèle taille réelle les reprend).

Puis copier les quatre fichiers dans `O:\publishing\downloads\online\ar\` et les mettre en ligne:

```powershell
npm run downloads:upload -- --dry-run
npm run downloads:upload
```

Le USDZ part avec le type `model/vnd.usdz+zip`: sans lui, Quick Look refuse de l'ouvrir.

Ensuite, changer `AR_VERSION` dans `src/viewer/main.js` (par exemple la date) et publier le site: le serveur et les
téléphones gardent les fichiers RA une heure, et l'adresse versionnée (`?v=…`) leur fait prendre les nouveaux tout de
suite. Le script d'envoi compare les fichiers à leur empreinte en ligne (MD5): un modèle refait de même taille part
quand même.

## Essayer sur un téléphone

La RA ne s'essaie pas sur un ordinateur. Deux façons:

**Le site en ligne:** ouvrir <https://lock21.info/modele> sur le téléphone, ou scanner un des codes QR de la page
depuis l'ordinateur.

**Le visualiseur de l'ordinateur, avant la mise en ligne du site:**

1. Le téléphone et l'ordinateur sont sur le **même réseau Wi-Fi**.
2. Le pare-feu de Windows laisse passer les ports du visualiseur et des tuiles (une fois, dans PowerShell en
   administrateur):

   ```powershell
   New-NetFirewallRule -DisplayName "lock21 dev (4321, 8084, 8086)" -Direction Inbound -Protocol TCP -LocalPort 4321,8084,8086 -RemoteAddress LocalSubnet -Action Allow -Profile Any
   ```

3. Lancer le site visible sur le réseau (`npm run dev -- --host`) et un serveur de tuiles visible sur le réseau aussi:

   ```powershell
   .\tools\publish-model\serve-tiles.ps1 -TilesRoot O:\publishing\tiles -Port 8086 -Lan
   ```

4. Sur le téléphone, ouvrir `http://<adresse de l'ordinateur>:4321/modele?tiles=http://<adresse de l'ordinateur>:8086`
   (ajouter `&ar=full` pour la taille réelle). L'adresse de l'ordinateur est celle de `ipconfig` qui commence comme
   celle du téléphone (par exemple `192.168.0.115`).

Les fichiers RA viennent toujours du serveur en ligne, même pendant un essai: Scene Viewer ne charge pas un modèle
depuis le réseau local (essayé sur un Pixel: il ne demande même pas le fichier). Ils doivent donc être en ligne
avant l'essai.

## Problèmes connus

- **Rien ne s'ouvre, la page glisse et revient** (Android, avant le 2026-10-22): Scene Viewer s'ouvrait et se
  refermait aussitôt sur un Pixel 10 Pro, pour tout modèle (même ceux de Google) et depuis toute page. Le bouton RA
  ouvre donc maintenant la RA dans Chrome même (WebXR, `src/viewer/android-ar.js`): un seul toucher ouvre la caméra,
  le modèle au 1:100 se charge pendant ce temps (progression affichée), un anneau suit le sol ou une table, et un
  toucher sur l'écran y pose l'écluse (un autre la déplace), le fond du canal (60 pi) sur la surface. Elle est agrandie à partir de ce point, sans bouger; à 1:1 les murs montent à environ 35 pi. Un curseur « Taille » va de 1:100 (sur une table) à 1:1
  (taille réelle); `?ar=full` ouvre à 1:1. `<model-viewer>` (essayé) demandait deux touchers: il télécharge tout le
  modèle (26 Mo) avant de demander la session, et Chrome ne la permet que juste après un toucher. Scene Viewer reste
  le recours là où Chrome n'a pas la RA WebXR. Étapes notées dans le journal du visualiseur (`ar-status`).
- **« Impossible de charger l'objet »** (Android): le fichier n'est pas en ligne à l'adresse attendue, ou Scene Viewer
  ne peut pas l'atteindre (réseau local).
- **La taille réelle n'est pas à la taille réelle:** Scene Viewer réduit un modèle trop grand pour l'écran s'il est
  redimensionnable. La version taille réelle s'ouvre donc non redimensionnable (`resizable=false`).
- **Pas de bouton RA sur iPhone:** seul Safari ouvre Quick Look. Dans Chrome ou Firefox sur iPhone, le bouton n'apparaît
  pas.
