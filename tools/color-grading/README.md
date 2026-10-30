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
| `make_masks.mjs` | un masque Metashape par image, la baguette de mesure trouvée dans l'image même (voir « Les masques de la baguette »); `-s` une planche contact pour vérifier |
| `used_frames.py` | lecture seule: pour chaque zone publiée, le ou les *chunks* d'où vient son export et leurs dossiers d'images, avec le nombre de photos et les dossiers disparus; `--json`, `-z`, `-x` |
| `masks_queue.mjs` | `make_masks.mjs --resume` sur une liste de dossiers (`-f`, puis ceux de `used_frames.py`), `-j` à la fois, un journal par dossier |
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

## Les masques de la baguette

La baguette de mesure que Christian tient devant la caméra se voit dans une bonne partie des images. Sans masque, Metashape la peint sur la texture. `make_masks.mjs` fait un masque par image, à partir de l'image elle-même (pas d'un gabarit commun: la baguette bouge).

**Ce qu'est un masque.** Un PNG de la taille de l'image, `<image>_guide.png` (le nom de l'image sans `.tif` ou `.jpg`), dans le dossier `_masks` à côté du dossier d'images (`O:\data\<date>\<zone>\_masks`). Noir: laissé de côté; blanc: gardé. Depuis le 2026-10-30, en PNG 1 bit (une palette noir et blanc, sharp `palette: true, colours: 2`): environ 2 Ko au lieu de 17 Ko en gris 8 bits (mesuré sur 20 masques de la zone 4: 337 Ko → 42 Ko, pixels identiques). `-b 8` écrit encore l'ancien format. Christian a vérifié dans Metashape qu'un masque de la zone 4 s'importe bien. Chaque masque est écrit dans un fichier temporaire puis renommé: jamais à moitié écrit.

**Comment la baguette est trouvée.** Sur l'image réduite au quart (1000 × 750 px). La baguette a trois segments: orange à rouge en haut (le bout qu'on tient), blanc au milieu (bleu clair à gris sous l'eau), puis un bout orange (rosé dans certains étalonnages).

1. Le segment orange: les pixels orange à jaune citron saturés (b < r/2, g ≤ 1,25 r; r > 140, puis r > 115 si rien n'est trouvé), en morceaux connexes auxquels on ajuste une droite. Un morceau est gardé s'il forme une barre droite et mince penchée vers le haut à droite (30 à 75°), son bout du haut dans les 40 % de droite, et s'il est long (60 px ou plus) avec ce bout près du bord du haut ou du coin en haut à droite, ou long avec une arête claire jusqu'au bord (la partie pâle de la baguette dans l'eau verte), ou court mais coupé par le bord du haut. La rouille du rail, les tuyaux, les reflets des moules, la vase jaunâtre et les bords jaunes des planches ne passent pas.
2. Si aucun morceau ne passe (la baguette collée à une planche jaune ou à un mur teinté, ou au loin, olive pâle), un balayage de droites depuis le bord du haut ou de droite cherche une barre mince de 100 px ou plus (35 px depuis le bord du haut, dans les couleurs de la baguette).
3. La barre est masquée le long de sa droite, de son bout du bas jusqu'au bord de l'image (la ligne qui tient la baguette n'est pas orange).
4. Puis, au-delà du bout du bas, sur le même axe (`extendRod`, 2026-10-30, après la vérification de Christian: le masque ne couvrait que le segment orange): pixel par pixel, une bande de la largeur de la baguette (ou de 3 px, la partie blanche est souvent plus mince) est « baguette » si la moitié de ses échantillons sont blancs (pâles, peu colorés, le bleu pas trop sous le rouge: les moules jaunâtres, le sable et la vase ne le sont pas) ou orange à rouge, et si ses deux côtés, bien à l'écart, ne sont pas du même genre et de la même clarté (à 15 niveaux près): jamais le long d'une planche blanche ou d'un lit de coquilles de la même teinte. L'axe peut dériver d'un pixel par pas vers le meilleur ajustement (3 px plus 15 % du chemin au plus). Le suivi s'arrête au bout orange (trois échantillons orange de suite après le blanc), au bord de l'image ou après 6 px qui ne sont pas la baguette. Il n'est gardé que s'il finit au bout orange, sort de l'image ou reste orange tout du long (dans les images jaunes du 2024-06-21, toute la baguette paraît orange): un suivi blanc qui s'éteint en route, c'est plus souvent des coquilles pâles dans l'axe.
5. Si le balayage (2) a trouvé la baguette et que le suivi ne trouve rien au-delà, sans bout orange à la fin, la barre est prolongée de 60 % de sa longueur (son bout du bas trop pâle pour être vu).
6. Le tout élargi de `--grow` (28 px à pleine taille), remis à pleine taille.

`--water` masque aussi l'eau libre (désactivé depuis le 2026-10-27: il prenait aussi des moules dans l'ombre).

**Limites connues.** Des images où la baguette n'est pas trouvée (lointaine et pâle, dans l'eau trouble); une baguette mince et lointaine dont le segment blanc n'est masqué qu'en partie (le suivi s'arrête avant le bout); quelques images où le balayage prend une barre qui n'est pas la baguette. Le résumé de chaque dossier liste les images trouvées par le balayage et celles qui ont plus d'un morceau, à regarder.

**Vérifier.** `-s <planche.jpg>` fait une planche contact (le masque de la baguette en rouge) d'un échantillon: `--sheet-of rod`, `extended` (le segment blanc ou le bout suivi), `scan`, `several`, `none`; `-e <n>` (une image sur n), `-m <regex>` et `-n` (rien d'écrit) pour un essai. Par exemple:

```sh
node tools/color-grading/make_masks.mjs -d O:/data/2024-08-18/zone-4/frames-lens-corrected-graded-flat-n18 -n -e 150 -s O:/temp/masks.jpg --sheet-of extended
```

**Quels dossiers.** Seulement ceux des zones publiées: `used_frames.py` lit, sans rien modifier, l'export publié de chaque zone (`O:\publishing\prepared\<zone>\<zone>-prepare.json`, clé `source`), et les fichiers zip du projet Metashape (`O:\photogrammetry\zone-N.psx`: `project.zip` pour les *chunks*, le `doc.xml` de chaque `chunk.zip` pour son nom, chaque `frame.zip` pour les chemins de ses photos, relatifs à son dossier). Le *chunk* d'un export: celui dont le nom est le plus long préfixe du nom de l'export (`zone-1` et `zone 1` confondus); s'il y en a plusieurs à égalité (zone 7), tous; si aucun (zones 11 et 12, *chunks* renommés), ceux qui ont un maillage. Les exports détaillés du relief des zones 1 et 10 (même projet) comptent aussi. Le 2026-10-30: 27 dossiers, 134 092 photos; un dossier disparu, `2024-07-12\zone-3\frames-lens-corrected-n10` (dans le *chunk* final de la zone 12; supprimé exprès, ses images étalonnées reliées à part).

```sh
python -I tools/color-grading/used_frames.py            # par zone: chunks, dossiers, photos
python -I tools/color-grading/used_frames.py --json -x zone-3 -x 2024-08-18
```

**Le traitement.** `masks_queue.mjs` passe les dossiers un à un (`-j` à la fois), d'abord ceux donnés avec `-f`, puis ceux de `used_frames.py` moins les `-x`, et tient un journal (`O:\temp\rod-masks.log`: début, fin avec le nombre d'images, la baguette trouvée, la taille de `_masks` avant et après, la durée). Il lance `make_masks.mjs --resume`: une image dont le masque est déjà en 1 bit est sautée, on peut donc relancer après une interruption. Lancé le 2026-10-30, 6 dossiers à la fois (2 à 4 s par image et par dossier):

```sh
node tools/color-grading/masks_queue.mjs -j 6 -x zone-3 -x 2024-08-18 \
  -f "O:/data/2024-08-18/zone-4/frames-lens-corrected-graded-flat-n18|O:/data/2024-08-18/zone-4/frames-lens-corrected-graded-n18" \
  -f "O:/data/2024-07-05/zone-3/frames-lens-corrected-graded-flat-nx|O:/data/2024-07-05/zone-3/frames-lens-corrected-graded-nx" \
  -f "O:/data/2024-07-07/zone-3/frames-lens-corrected-graded-flat-n10|O:/data/2024-07-07/zone-3/frames-lens-corrected-graded-n10" \
  -f "O:/data/2024-07-12/zone-3/frames-lens-corrected-graded-flat-n10|O:/data/2024-07-12/zone-3/frames-lens-corrected-graded-n10" \
  -f "O:/data/2024-07-14/zone-3/frames-graded-n12|O:/data/2024-07-14/zone-3/frames-graded-flat-n12"
```

Les zones 3 et 4 sont données à part (`-f`) et retirées de la liste de `used_frames.py` (`-x`): leurs masques existaient déjà, faits avant le suivi du segment blanc, et sont refaits; leurs images sont lues dans le dossier `…-graded-flat-…` ou, pour celles qui n'y sont pas encore, dans `…-graded-…` (`make_masks.mjs -a`): le 2026-10-30, un autre traitement réécrivait les images de la zone 3 vers `…-graded-flat-…`. `make_masks.mjs` ne fait que lire les images, et n'écrit que dans `_masks`.

**Dans Metashape.** `retexture_chunk.py -k` importe les masques de chaque plongée sur ses seules photos. À la main: *File › Import › Import Masks*, *Method: From File*, *Operation: Replacement*, *Filename template*: `{filename}_guide.png`, dans le dossier `_masks`. Metashape ne prend rien des parties noires pour la texture.

**Avant de refaire une texture, charger les masques.** Les masques ne sont pas dans les projets Metashape: ils sont sur `O:`, à côté des images, et n'entrent dans un *chunk* qu'au moment où on refait sa texture avec `retexture_chunk.py -k` (ou à la main, ci-dessus). Refaire la texture d'une zone sans `-k` remettrait la baguette dans la texture. Ils ne servent qu'à la texture: l'alignement et le maillage sont faits. État au 2026-10-30: masques faits pour toutes les plongées des zones publiées (27 dossiers, plus la zone 10 en JPEG; `O:\temp\rod-masks.log`); la zone 3 est la première texture refaite avec ces masques (2026-10-30, *chunk* « zone 3 - lens corrected - graded - clean RU=30, PA=5, RE=0.4 »); la zone 4 a été refaite avec les anciens masques (le segment orange seulement); les autres zones n'en ont pas. Refaire les autres textures reste à décider (Christian, 2026-10-30): d'abord comparer la zone 3 avant et après; la baguette se voit le plus dans les zones 11, 8 et 18 (trouvée dans 80 à 98 % des images).

Les images peuvent être des TIFF ou des JPEG (la zone 10, 2024-06-29, n'a que des JPEG: ajouté le 2026-10-30).

## Les LUT

Les LUT du projet sont dans `O:\_davinci-resolve-library\luts`. Resolve ne pose qu'une LUT qu'il a listée dans son
propre dossier: `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\lock21` y est une jonction vers
`O:\_davinci-resolve-library\luts`. Sur un autre ordinateur, la recréer (PowerShell):

```powershell
New-Item -ItemType Junction -Path 'C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\lock21' -Target 'O:\_davinci-resolve-library\luts'
```

Les images d'origine de la zone 3 sont aussi copiées sur `D:\lock21-backup\data` (2026-10-27), en plus de la
sauvegarde iDrive de `O:`.
