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

## Zone 4 (2026-10-30)

Le *chunk* publié (« zone 4 - lens corrected - Align=highest - DepthMapQuality=low;FaceCount=custom ») vient d'une
seule plongée, le 2024-08-18 (`frames-lens-corrected-n18`, une image sur dix-huit, 10 018 images). Ses clips forment
deux groupes éclairés différemment (`clip_gains.mjs`, 75 % du neutre): GX0527 à GX0530 dans l'eau verte (médiane
0,886, 0,813, 1,673), GX0533 à GX0541 sous les lampes, jaunes (0,766, 0,94, 1,9). Une correction par groupe
(Christian, 2026-10-30, plutôt qu'une seule pour la plongée): `timeline_lut.py -k`, la LUT de chaque groupe sur le
nœud de ses clips (« zone-4 2024-08-18 green (75 %) », GX0521 à GX0530; « zone-4 2024-08-18 lamps (75 %) », GX0531
à GX0541), sans LUT sur la timeline. Resolve applique la LUT d'un nœud après sa balance.

Les lampes du rig éclairent le centre de l'image en chaud et l'eau ses bords en vert, de la même façon sur chaque image: un gain pour toute l'image laisse le centre jaune et vire les bords au magenta. `flat_color.py` mesure, par groupe, la couleur moyenne à chaque endroit de l'image (400 images, lissée) et ramène le rapport R/V et B/V de chaque endroit à celui de l'image entière, luminance gardée; appliqué aux images étalonnées, dans `frames-lens-corrected-graded-flat-n18` (Christian, 2026-10-30: « c'est concluant »; net sous les lampes, faible dans l'eau verte, où l'eau libre entre dans la mesure). C'est ce dossier que la texture utilise.

Texture refaite le 2026-10-30 (`retexture_chunk.py -k`, masques de la baguette: 6 124 images sur 10 044; 13 872 px,
environ 1 h 30 de mélange), publiée et adoptée le même jour (Christian: « c'est bon, on conserve »). Le *chunk*
« graded » avait déjà ses nouveaux chemins enregistrés par Metashape: `relink_frame.py` n'a rien eu à changer. Recalage:
13,5 mm (l'export étalonné tourné de 90°, comme celui de la zone 3).

## Les outils

Resolve doit être ouvert, avec **Préférences › System › General › External scripting using: Local**. Chaque script
répond à `-h`.

| Script | Rôle |
| --- | --- |
| `inspect_project.py` | lit un projet sans le modifier: réglages de couleur, rendus, clips, nœuds; avec `-l`, exporte l'étalonnage de chaque clip en LUT et regroupe les clips qui ont le même |
| `duplicate_projects.py` | copie les projets d'une zone avant tout changement: chaque projet exporté en `.drp` (sa sauvegarde, `O:\_davinci-resolve-library\backups`) puis réimporté dans le même dossier sous le nom `<nom> - graded`, la copie où se font les corrections |
| `clip_gains.mjs` | la couleur moyenne de chaque clip (une vingtaine d'images réparties), ramenée aux trois quarts du neutre, et la médiane des clips: la correction commune de la plongée |
| `grade_preview.mjs` | avant et après sur quelques images, côte à côte, pour choisir un dosage |
| `timeline_lut.py` | écrit la correction commune en LUT et la pose sur le nœud de la timeline de la copie `- graded` (après les nœuds des clips), ou avec `-k` sur le nœud de certains clips seulement (un groupe de clips éclairés autrement); refuse un projet qui n'est pas une copie |
| `retexture_chunk.py` | dans Metashape 1.7 ou 2.x (*Tools › Run Script*; les constantes et l'import des masques suivent la version): les photos d'un *chunk* « graded » pointées vers les images étalonnées (tout vérifié avant), avec `-k` les masques de chaque plongée (`_masks`, make_masks.mjs) importés sur ses seules photos, la texture refaite sur les coordonnées existantes, l'export nommé d'après le *chunk* et son nombre de faces (`<nom du chunk> (24.3M faces).glb`, Christian 2026-10-28) (avec `-d`, seulement à partir des photos prises à moins de tant de mètres: distance médiane aux points de liaison qu'elles voient), l'export `.glb`. Côté de la texture calculé par la taille réelle: surface du modèle et part de la texture couverte, pour le texel cible de `tools/model-analysis/thresholds.json` (pixel d'écran à 2 m: 1,73 mm) |
| `relink_frame.py` | Metashape fermé: écrit dans le fichier du *chunk* « graded » (`<projet>.files/<chunk>/0/frame.zip`) les chemins des images étalonnées. Metashape n'enregistre pas un chemin changé par script: sans cette étape, le projet rouvert pointe de nouveau vers les images d'origine. Fichier d'origine gardé (`.bak`), `-n` pour vérifier. Avec `-a`, un *chunk* d'origine aussi, avant de supprimer ses images non étalonnées (zone 3, 2026-10-29) |
| `flat_color.py` | la couleur égalisée dans l'image: par groupe de clips, la couleur moyenne à chaque endroit de l'image (l'éclairage du rig, qui suit la caméra), puis chaque endroit ramené aux rapports R/V et B/V de l'image entière, luminance gardée; `--preview` (avec `--original`, trois colonnes), `-o` pour toutes les images |
| `glb_to_feet.py` | met en pieds un export `.glb` de Metashape écrit en mètres (positions × 3,28084), l'unité des exports et des zones du `.blend`: sans cela, `prepare_zone.py` refuse le recalage (zone 3, 2026-10-27: échelle 0,31). Python avec numpy (`tools/google-earth/.venv`) |

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
   Script*: `retexture_chunk.py`, d'abord avec `--check`. Ensuite, Metashape fermé, `relink_frame.py <projet.psx> <chunk>` pour que les nouveaux chemins restent dans le projet. Puis la publication de la zone et la comparaison avec
   `?compare=`.
5. Essai adopté: relier les *chunks* d'origine aux images étalonnées (`relink_frame.py <projet.psx> <chunk> -a`, Metashape
   fermé), puis supprimer les dossiers d'images non étalonnées. Zone 3 (2026-10-29): les trois *chunks* d'origine reliés,
   les dossiers `frames-lens-corrected-n10/-nx` des 5, 7 et 12 juillet 2024 supprimés (349 Go), ainsi que la copie
   `zone-3 - Copie.psx` (468 Go), et les masques plus anciens qui étaient dans ces dossiers.

## Les LUT

Les LUT du projet sont dans `O:\_davinci-resolve-library\luts`. Resolve ne pose qu'une LUT qu'il a listée dans son
propre dossier: `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\lock21` y est une jonction vers
`O:\_davinci-resolve-library\luts`. Sur un autre ordinateur, la recréer (PowerShell):

```powershell
New-Item -ItemType Junction -Path 'C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\lock21' -Target 'O:\_davinci-resolve-library\luts'
```

Les images d'origine de la zone 3 sont aussi copiées sur `D:\lock21-backup\data` (2026-10-27), en plus de la
sauvegarde iDrive de `O:`.
