# Google Earth et téléchargements

Export du modèle complet de l'écluse (toutes les zones publiées et le contexte: terrain, murs, remplissages) pour les
téléchargements de `/modele/` et pour Google Earth (TODO #13). Deux fichiers, à partir du même modèle allégé:

| Fichier | Pour | Placé sur la carte? |
| --- | --- | --- |
| `lock-21.kmz` | **Google Earth Pro** (ordinateur): double-clic | oui: position et orientation dans le KMZ |
| `lock-21.glb` | **Google Earth Web** (importer, puis placer à la main), Blender, visionneuse 3D de Windows, Sketchfab… | non: un GLB ne contient que le modèle |

Le modèle est posé **au sol** (profondeur 0): Google Earth n'a pas de profondeur négative, l'écluse y est montrée
au niveau du sol plutôt qu'à 55 pi (16,8 m) sous l'eau.

## Commandes

```powershell
# 1. Contexte non compressé (le context.glb publié a des textures KTX2, que Blender ne lit pas). Lit le .blend
#    (lecture seule): seulement quand il est sauvegardé.
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b modeles\lock-21-publishing.blend --factory-startup --python tools\publish-model\export_context.py -- O:\temp\google-earth\context

# 2. Modèle complet (Blender): budget de triangles, taille de texture
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\google-earth\make_model.py -- -o O:\publishing\downloads\google-earth\t400k -t 400000 -s 2048 --context O:\temp\google-earth\context\context.glb

# 3. KMZ (COLLADA + KML), avec le Python de l'outil
tools\google-earth\.venv\Scripts\python.exe tools\google-earth\make_kmz.py -d O:\publishing\downloads\google-earth\t400k
```

`make_model.py`: `-t/--triangles` (budget total), `-s/--size` (côté maximal des textures), `-c/--context-share` (part du
budget pour le contexte, 0,1 par défaut), `--zones` (par défaut celles du manifeste local, comme les tuiles publiées),
`-n/--name` (`lock-21`). `make_kmz.py`: `--lat`, `--lon`, `-H/--heading`. Les zones viennent de leurs maillages
préparés (`O:\temp\<zone>\prox\`, les mêmes que les tuiles).

**Installation, une fois:** `python -m venv tools\google-earth\.venv`, puis
`tools\google-earth\.venv\Scripts\python -m pip install pycollada==0.9.2 numpy`. Blender 5 n'exporte plus le COLLADA
(format des modèles dans un KMZ): `make_kmz.py` l'écrit avec pycollada à partir de l'OBJ (un matériau et une texture
par zone et par pièce du contexte).

## Répartition des triangles

Le budget va au contexte pour 10 % (au plus son propre compte), le reste aux zones **selon leur surface**: même
densité partout. Les zones dont la texture est découpée en beaucoup de petits morceaux (zones 3 et 7) ne descendent
pas sous un plancher (zone 3: environ 77 000 triangles, zone 7: 42 000): la décimation par fusion ne fusionne pas à
travers les coutures UV. L'excédent est alors pris sur les autres zones, et le total reste sur le budget. À 200 000
triangles, ces deux zones prennent donc 60 % du modèle et les autres sont grossières; à 400 000 et plus, chaque zone a
sa part.

## Limites de Google Earth Pro

**Par maillage:** Google Earth Pro ignore ou plante sur les gros maillages COLLADA. Un maillage de 30 000 sommets
(50 000 triangles) s'affiche; des maillages de 60 000 sommets (90 000 triangles) ne s'affichent pas (100 000 triangles au
total) ou font planter (150 000 et plus); un seul maillage de 122 803 sommets plante aussi. `make_kmz.py` découpe donc
chaque matériau en maillages de 30 000 sommets et 45 000 triangles au plus (un sommet = une position + une coordonnée
de texture).

**Au total:** Google ne publie aucune limite chiffrée (taille de fichier, triangles, textures), ni pour les KMZ de
Google Earth Pro, ni pour l'import GLB de Google Earth Web (expérimental: textures incluses dans le GLB, pas de
compression ni de la plupart des extensions glTF, compte dans le quota de stockage Google). D'où les essais.

## Résultats

Essais sur la zone 12 seule (2026-10-19, Google Earth Pro 7.3.6):

- **Taille de modèle:** avec des maillages de 30 000 sommets au plus, 100 000, 150 000 et 200 000 triangles s'affichent
  (200 000: la meilleure qualité). Les échecs venaient de maillages trop gros (60 000 sommets). Google Earth Pro plante
  aussi parfois sans raison après des plantages précédents: le relancer avant de conclure (un essai à 100 000 a planté
  une fois, puis s'est ouvert).
- **Échelle:** juste (zone 12, environ 10 m, apparaît à environ 10 m): le modèle est en mètres réels.
- **Orientation:** juste avec `-H 0`: le repère du `.blend` est déjà aligné sur le nord.
- **Position:** les coordonnées (44°59.809′ N, 74°53.997′ O) épinglent le **centre de l'ensemble des zones**, figé au
  2026-10-19 comme **ancre du site**: (−29,05; 21,70) dans le repère du `.blend`, en mètres (zones 1, 2, 3, 4, 7, 8,
  10, 11, 12 et 13: 70,6 × 38,0 m). Figé, pour que les zones ajoutées plus tard gardent leur place au lieu de déplacer
  toute l'écluse.

Modèle complet (2026-10-20), dans `O:\publishing\downloads\google-earth\`: `t200k\`, `t400k\` et `t800k\` (KMZ à
essayer dans Google Earth Pro, textures de 2048 px) et `glb\` (GLB moyen: 2 M triangles, textures de 4096 px). À
vérifier: jusqu'où Google Earth Pro reste fluide; le GLB dans Google Earth Web.
