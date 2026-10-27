# Étalonnage des images (TODO #75)

Outils pour refaire l'étalonnage des images extraites des vidéos, plongée par plongée, dans DaVinci Resolve Studio
(21.1), avant de refaire la texture d'une zone dans Metashape. Commencé avec la zone 3 (2026-10-27).

## Ce qu'on a constaté (zone 3)

Chaque plongée a son projet Resolve (`data › <date>`, bibliothèque `O:\_davinci-resolve-library`): les vidéos de la
GoPro (H.265, 8 bits), la correction d'objectif de Resolve, une vitesse de 1000 % (une image sur dix), un nœud de
balance par clip, réglé sur la charte de couleurs filmée en début de plongée; rendu en TIFF RGB 8 bits, un dossier
par plongée (`frames-lens-corrected-n10`).

- Plongées 17 (2024-07-05) et 18-19 (2024-07-07): deux étalonnages, selon la hauteur (une charte sur le plancher, une
  à mi-hauteur). Sur leur charte, celui du bas sort neutre, celui du haut un peu rose.
- Plongée 21 (2024-07-12, les trois vannes): un seul étalonnage, fait sur le plancher, pour toute la hauteur du mur:
  les vannes sortent jaune-olive (bleu très bas). D'où le #75.

## Les outils

Resolve doit être ouvert, avec **Préférences › System › General › External scripting using: Local**. Chaque script
répond à `-h`.

| Script | Rôle |
| --- | --- |
| `inspect_project.py` | lit un projet sans le modifier: réglages de couleur, rendus, clips, nœuds; avec `-l`, exporte l'étalonnage de chaque clip en LUT et regroupe les clips qui ont le même |
| `duplicate_projects.py` | copie les projets d'une zone avant tout changement: chaque projet exporté en `.drp` (sa sauvegarde, `O:\_davinci-resolve-library\backups`) puis réimporté dans le même dossier sous le nom `<nom> - graded`, la copie où se font les corrections |
| `clip_gains.mjs` | la couleur moyenne de chaque clip (une vingtaine d'images réparties), ramenée aux trois quarts du neutre, et la médiane des clips: la correction commune de la plongée |
| `grade_preview.mjs` | avant et après sur quelques images, côte à côte, pour choisir un dosage |
| `timeline_lut.py` | écrit la correction commune en LUT et la pose sur le nœud de la timeline de la copie `- graded` (après les nœuds des clips); refuse un projet qui n'est pas une copie |
| `retexture_chunk.py` | dans Metashape 1.7 (*Tools › Run Script*): les photos d'un *chunk* « graded » pointées vers les images étalonnées (tout vérifié avant), la texture refaite sur les coordonnées existantes, l'export `.glb`. Côté de la texture calculé par la taille réelle: surface du modèle et part de la texture couverte, pour le texel cible de `tools/model-analysis/thresholds.json` (pixel d'écran à 2 m: 1,73 mm) |

## Le déroulement

1. `duplicate_projects.py -z 3`: les copies `- graded` et leurs sauvegardes.
2. `clip_gains.mjs` sur le dossier d'images de la plongée: la correction commune (75 % du neutre, Christian
   2026-10-27; une seule par plongée, pour ne pas faire de bandes dans la texture entre deux passages).
3. `grade_preview.mjs` pour vérifier sur quelques images.
4. Dans Resolve, sur la copie `- graded`: page **Color**, menu de l'éditeur de nœuds sur **Timeline**, un nœud
   (**Alt+S**; l'interface Python ne sait pas en créer). Puis `timeline_lut.py`, qui y pose la LUT et exporte une
   image de test (`-s`, `--frame`); vérification à l'œil dans Resolve.
5. Rendu de la copie dans un nouveau dossier, `frames-lens-corrected-graded-n10`, sous les mêmes noms: les images actuelles restent.
6. Dans le projet Metashape de la zone (`O:\photogrammetry\`, Christian 2026-10-27), le *chunk* du modèle publié
   dupliqué (*Duplicate Chunk*: caméras, masques et le seul modèle à texturer, sans nuage de points ni cartes de
   profondeur) et nommé avec « graded »; les *chunks* d'origine restent tels quels. Dans Metashape, *Tools › Run
   Script*: `retexture_chunk.py`, d'abord avec `--check`. Puis la publication de la zone et la comparaison avec
   `?compare=`.

## Les LUT

Les LUT du projet sont dans `O:\_davinci-resolve-library\luts`. Resolve ne pose qu'une LUT qu'il a listée dans son
propre dossier: `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\lock21` y est une jonction vers
`O:\_davinci-resolve-library\luts`. Sur un autre ordinateur, la recréer (PowerShell):

```powershell
New-Item -ItemType Junction -Path 'C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\lock21' -Target 'O:\_davinci-resolve-library\luts'
```

Les images d'origine de la zone 3 sont aussi copiées sur `D:\lock21-backup\data` (2026-10-27), en plus de la
sauvegarde iDrive de `O:`.
