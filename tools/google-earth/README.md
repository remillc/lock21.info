# Google Earth et téléchargements

Export du modèle complet de l'écluse (toutes les zones publiées et le contexte: terrain, murs, remplissages) pour les
téléchargements de `/modele` et pour Google Earth (TODO #13). Deux téléchargements:

| Fichier | Où | Pour |
| --- | --- | --- |
| `lock-21.kmz` (311 octets) | sur le site: `https://lock21.info/downloads/lock-21.kmz` (`public/downloads/`) | **Google Earth Pro** (ordinateur): double-clic. Un lien vers les parties du modèle sur R2: les zones ajoutées apparaissent à la prochaine ouverture, sans nouveau téléchargement |
| `lock-21.glb` (114 Mo) | sur R2: `https://tiles.lock21.info/downloads/lock-21.glb` | **Google Earth Web** (importer, puis placer à la main), Blender, visionneuse 3D de Windows, Sketchfab… |

Liés depuis la page `/modele` (`src/data/site.js`, `downloads`). Le modèle est posé **au sol** (profondeur 0): Google
Earth n'a pas de profondeur négative, l'écluse y est montrée au niveau du sol plutôt qu'à 55 pi (16,8 m) sous l'eau.

## Réalité augmentée

Le bouton du visualiseur (à gauche du plein écran, sur téléphone et tablette seulement) pose l'écluse **sur une table,
au 1:100** (70 cm): sur iPhone et iPad avec AR Quick Look (fichier USDZ, Safari), sur Android avec Scene Viewer (fichier
GLB; sans ARCore, le modèle s'affiche en 3D). Pas de bibliothèque: chaque téléphone ouvre le modèle dans sa propre
visionneuse. Le modèle: zones et remplissages du contexte (`--context-objects "filler*"`: sans terrain, murs ni talus), 400 000 triangles, textures de 2048 px, même ancre, mis à l'échelle et
exporté en USDZ par `make_model.py` (`-x 0.01 --usdz`). Une seconde version, **à la taille réelle** (70 m, `-x 1`,
`lock-21-ar-full`), s'ouvre avec `?ar=full` (le second code QR de `/modele`, section « Réalité augmentée »):

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\google-earth\make_model.py -- -o O:\publishing\downloads\google-earth\ar -n lock-21-ar -t 400000 -s 2048 -x 0.01 --usdz --context O:\temp\google-earth\context\context.glb --context-objects "filler*"
```

En ligne sous `https://tiles.lock21.info/downloads/ar/` (`lock-21-ar.usdz`, `lock-21-ar.glb`): les copier dans
`O:\publishing\downloads\online\ar\` avant `npm run downloads:upload` (le USDZ part avec le type
`model/vnd.usdz+zip`, exigé par Quick Look). Le copyright est dans les deux fichiers: champs glTF du GLB, propriétés USD
(`userProperties:lock21:copyright`) de chaque objet du USDZ. À vérifier sur un vrai téléphone: la réalité augmentée ne
s'essaie pas sur un ordinateur.

## Copyright et métadonnées

Chaque fichier public porte le copyright de Christian Rémillard: `© 2024–<année> Christian Rémillard · CC BY 4.0 ·
lock21.info`.

- **GLB:** le champ `asset.copyright` de glTF, et `asset.extras.lock21`: titre, auteur, licence, crédit à citer, source,
  et la **position de l'origine** (le modèle n'est pas géoréférencé: glTF n'a pas de coordonnées terrestres). L'origine
  (0, 0, 0) est l'ancre du site, à 44,996817° N, 74,89995° O (WGS 84); axes glTF: +Y vers le haut, −Z vers le nord, +X
  vers l'est; mètres; y = 0 au niveau de référence de l'écluse. Écrit par `glb_metadata.py`, que `make_model.py` appelle
  après chaque export; seul, il marque un GLB existant (`python glb_metadata.py <fichier.glb>`).
- **KMZ et KML:** dans la description du KMZ téléchargé, de la liste et de chaque partie, et dans chaque modèle COLLADA
  (`<contributor>`: auteur, copyright, source).

## Le KMZ en réseau

Le KMZ téléchargé ne contient qu'un lien (`<NetworkLink>`) vers la **liste** `lock-21.kml` sur R2
(`https://tiles.lock21.info/downloads/google-earth/lock-21.kml`): l'épingle de l'écluse, la vue d'arrivée, et un lien
par **partie**, rangés dans deux dossiers, « Zones » et « Contexte (maquette) ». Chaque partie est un petit KMZ (un
modèle COLLADA et sa texture) dans `parts/<partie>-<hash>.kmz`; le hash, calculé sans les dates que pycollada écrit, ne
change qu'avec le contenu: Google Earth ne garde jamais une partie périmée, et une partie inchangée n'est pas renvoyée.

Ajouter ou refaire une zone: refaire le modèle et le réseau, puis `npm run downloads:upload`. Les parties nouvelles
partent d'abord, la liste ensuite (cache de 5 min), les parties qui n'y sont plus sont supprimées. Ceux qui ont le
fichier voient la zone à la prochaine ouverture. Ni le KMZ du site ni le site ne changent (le KMZ ne contient que
l'adresse de la liste): pas de déploiement.

**Vue d'arrivée:** réglée dans Google Earth Pro (2026-10-20): 44,996863° N, 74,899940° O, distance 66 m, direction
−70°, inclinaison 60°. `make_kmz.py --view lat,lon,distance,direction,inclinaison` la change (valeurs des propriétés
de la caméra de Google Earth).

## Commandes

```powershell
# 1. Contexte non compressé (le context.glb publié a des textures KTX2, que Blender ne lit pas). Lit le .blend
#    (lecture seule): seulement quand il est sauvegardé, et pas en mode Édition (un objet sauvegardé en mode
#    Édition perd ses attributs dans le fichier, et l'export glTF échoue).
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b modeles\lock-21-publishing.blend --factory-startup --python tools\publish-model\export_context.py -- O:\temp\google-earth\context

# 2. Modèle complet (Blender): 600 000 triangles, textures de 2048 px
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\google-earth\make_model.py -- -o O:\publishing\downloads\google-earth\t600k -t 600000 -s 2048 --context O:\temp\google-earth\context\context.glb

# 3. KMZ en réseau (Python de l'outil): O:\publishing\downloads\google-earth\t600k\network\
tools\google-earth\.venv\Scripts\python.exe tools\google-earth\make_kmz.py -d O:\publishing\downloads\google-earth\t600k

# 4. Assembler O:\publishing\downloads\online\: google-earth\lock-21.kml et google-earth\parts\ (de t600k\network\),
#    lock-21.glb (make_model.py -t 2000000 -s 4096, dans google-earth\glb\). Puis, avec accord: mise en ligne sur R2
npm run downloads:upload
```

Le KMZ du site (`t600k\network\lock-21.kmz`, copié dans `public/downloads/`) ne change que si l'adresse de la liste
change. Essai local du réseau: `make_kmz.py ... --network http://localhost:8083`, puis
`serve-tiles.ps1 -TilesRoot O:\publishing\downloads\google-earth\t600k\network -Port 8083`.

`make_model.py`: `-t/--triangles` (budget total), `-s/--size` (côté maximal des textures), `--zone-size zone-3=4096`
(texture d'une zone), `-c/--context-share` (part du budget pour le contexte, 0,1 par défaut), `--zones` (par défaut
celles du manifeste local, comme les tuiles publiées), `--context-only` (essais), `-n/--name` (`lock-21`). Les zones
viennent de leurs maillages préparés (`O:\publishing\prepared\<zone>\`, les mêmes que les tuiles). `make_kmz.py`: `--network`
(adresse de la liste et des parties, R2 par défaut), `--view`, `--lat`, `--lon`, `-H/--heading`.

**Installation, une fois:** `python -m venv tools\google-earth\.venv`, puis
`tools\google-earth\.venv\Scripts\python -m pip install pycollada==0.9.2 numpy xatlas==0.0.10` (xatlas: les nouvelles
coordonnées de texture de `make_model.py --rebake`, voir `xatlas_uv.py`). Blender 5 n'exporte plus le COLLADA
(format des modèles dans un KMZ): `make_kmz.py` l'écrit avec pycollada à partir de l'OBJ (un matériau et une texture
par zone et par pièce du contexte).

## Répartition des triangles

Le budget va au contexte pour 10 % (au plus son propre compte), le reste aux zones **selon leur surface**: même
densité partout. Les zones dont la texture est découpée en beaucoup de petits morceaux (zones 3 et 7) ne descendent
pas sous un plancher (zone 3: environ 77 000 triangles, zone 7: 42 000): la décimation par fusion ne fusionne pas à
travers les coutures UV. L'excédent est alors pris sur les autres zones, et le total reste sur le budget. À 200 000
triangles, ces deux zones prennent donc 60 % du modèle et les autres sont grossières; à 600 000, chaque zone a sa part.

## Limites de Google Earth Pro

**Par maillage:** Google Earth Pro ignore ou plante sur les gros maillages COLLADA. Un maillage de 30 000 sommets
(50 000 triangles) s'affiche; des maillages de 60 000 sommets (90 000 triangles) ne s'affichent pas (100 000 triangles au
total) ou font planter (150 000 et plus); un seul maillage de 122 803 sommets plante aussi. `make_kmz.py` découpe donc
chaque partie en maillages de 30 000 sommets et 45 000 triangles au plus (un sommet = une position + une coordonnée
de texture).

**Un modèle par partie:** Google Earth Pro plante sur le modèle complet en un seul COLLADA (zones et contexte, 15
textures), même à 200 000 triangles et en textures de 1024 px, alors qu'il ouvre les zones seules (textures de 1024 px)
ou le contexte seul (2026-10-20). D'où un modèle COLLADA par zone et par pièce du contexte, chacun dans son repère:
Google Earth les charge séparément, et chacun s'affiche ou se masque dans le panneau de gauche.

**Faces vues de dos:** Google Earth Pro n'affiche pas une face vue de dos. Des murs de la zone 18 ont leurs faces
tournées vers l'intérieur et n'apparaissaient pas (2026-10-21). Les modèles sont donc marqués double face
(`<double_sided>1</double_sided>`, extension COLLADA `GOOGLEEARTH`), comme le visualiseur du site, qui retourne ces
faces vers la caméra.

**Temps de chargement:** les 21 parties pèsent 25 Mo en tout (1,6 à 2,8 Mo par zone). L'essentiel du temps tient à
Google Earth Pro, qui ouvre, décompresse et lit chaque COLLADA (du XML) une partie après l'autre; à la deuxième
ouverture, il lit son cache.

**Au total:** Google ne publie aucune limite chiffrée (taille de fichier, triangles, textures), ni pour les KMZ de
Google Earth Pro, ni pour l'import GLB de Google Earth Web (expérimental: textures incluses dans le GLB, pas de
compression ni de la plupart des extensions glTF, compte dans le quota de stockage Google). D'où les essais.

## Résultats

Essais sur la zone 12 seule (2026-10-19, Google Earth Pro 7.3.6):

- **Taille de modèle:** avec des maillages de 30 000 sommets au plus, 100 000, 150 000 et 200 000 triangles s'affichent.
  Google Earth Pro plante aussi parfois sans raison après des plantages précédents: le relancer avant de conclure.
- **Échelle:** juste (zone 12, environ 10 m, apparaît à environ 10 m): le modèle est en mètres réels.
- **Orientation:** `-H -30` par défaut depuis le 2026-10-25 (avant: `-H 0`, le repère du `.blend` pris pour aligné
  sur le nord, jugé à l'œil). La flèche du nord de Nick Baets, sur le plan du découpage en zones, fait 30,0° dans le
  sens horaire avec l'axe +Y du `.blend` (le côté du mur nord), prise pour le nord vrai. Lue comme le nord magnétique
  de septembre 1988 (déclinaison −14,33°, NOAA), elle donnait −44,3°, qui paraissait faux dans Google Earth. La vue
  d'arrivée tourne avec le modèle (−70° → −100°). Le visualiseur 3D a une boussole (nord magnétique d'aujourd'hui,
  déclinaison −12,87°).
- **Position:** les coordonnées (44°59.809′ N, 74°53.997′ O) épinglent le **centre de l'ensemble des zones**, figé au
  2026-10-19 comme **ancre du site**: (−29,05; 21,70) dans le repère du `.blend`, en mètres (zones 1, 2, 3, 4, 7, 8,
  10, 11, 12 et 13: 70,6 × 38,0 m). Figé, pour que les zones ajoutées plus tard gardent leur place au lieu de déplacer
  toute l'écluse.

Modèle complet (2026-10-20), textures de 2048 px:

| Essai | Résultat |
| --- | --- |
| un seul modèle COLLADA: 200 000, 400 000, 800 000 triangles | 200 000 et 800 000 plantent, 400 000 s'ouvre sans rien montrer |
| un modèle par partie, 200 000 | s'ouvre, modèle grossier |
| un modèle par partie, 400 000 | s'ouvre, zones 3 et 7 grossières (faute de triangles: des textures de 4096 px n'y changent rien) |
| **un modèle par partie, 600 000** | **s'ouvre, zones 3 et 7 nettes: le choix** |
| un modèle par partie, 800 000 | plante |

À vérifier: le KMZ en ligne dans Google Earth Pro; le GLB dans Google Earth Web; 700 000 triangles.
