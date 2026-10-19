# Google Earth

Essai d'export du modèle pour Google Earth (TODO #13), sur la zone 12. Deux fichiers, à partir du même modèle allégé:

| Fichier | Pour | Placé sur la carte? |
| --- | --- | --- |
| `zone-12-test.kmz` | **Google Earth Pro** (ordinateur): double-clic | oui: position et orientation dans le KMZ |
| `zone-12-test.glb` | **Google Earth Web** (importer, puis placer à la main), Blender, visionneuse 3D de Windows, Sketchfab… | non: un GLB ne contient que le modèle |

Le modèle est posé **au sol** (profondeur 0): Google Earth n'a pas de profondeur négative, l'écluse y est montrée
au niveau du sol plutôt qu'à 55 pi (16,8 m) sous l'eau.

## Commandes

```powershell
# 1. Modèle allégé (Blender): 200 000 triangles, texture 2048 px, centré horizontalement
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\google-earth\make_test_model.py -- -z "zone 12" -p O:\temp\zone-12\prox -o O:\publishing\downloads\google-earth-test

# 2. KMZ (COLLADA + KML), avec le Python de l'outil
tools\google-earth\.venv\Scripts\python.exe tools\google-earth\make_kmz.py -z "zone 12" -d O:\publishing\downloads\google-earth-test
```

Options: `-t/--triangles` et `-s/--size` (taille de texture) pour le modèle; `--lat`, `--lon` et `-H/--heading`
(orientation, degrés depuis le nord) pour le KMZ. Les coordonnées par défaut sont celles de l'écluse
(44°59.809′ N, 74°53.997′ O).

**Installation, une fois:** `python -m venv tools\google-earth\.venv`, puis
`tools\google-earth\.venv\Scripts\python -m pip install pycollada==0.9.2 numpy`. Blender 5 n'exporte plus le COLLADA
(format des modèles dans un KMZ): `make_kmz.py` l'écrit avec pycollada à partir de l'OBJ.

**Limite par maillage:** Google Earth Pro ignore ou plante sur les gros maillages COLLADA. Un maillage de 30 000 sommets
(50 000 triangles) s'affiche; des maillages de 60 000 sommets (90 000 triangles) ne s'affichent pas (100 000 triangles au
total) ou font planter (150 000 et plus); un seul maillage de 122 803 sommets plante aussi. `make_kmz.py` découpe donc
le modèle en maillages de 30 000 sommets et 45 000 triangles au plus (un sommet = une position + une coordonnée de
texture).

## Ce que l'on sait des limites

Google ne publie aucune limite chiffrée (taille de fichier, triangles, textures), ni pour les KMZ de Google Earth Pro,
ni pour l'import GLB de Google Earth Web (expérimental: textures incluses dans le GLB, pas de compression ni de la
plupart des extensions glTF, compte dans le quota de stockage Google). D'où l'essai: zone 12 à 200 000 triangles et
2048 px donne un GLB de 7,7 Mo et un KMZ de 4,5 Mo.

## Résultats (2026-10-19, Google Earth Pro 7.3.6)

- **Taille de modèle:** 14 143 et 50 000 triangles s'ouvrent; 200 000 triangles (3 maillages) font planter Google Earth Pro.
  Essais à 100 000 et 150 000 triangles (`t100000\`, `t150000\`) pour trouver le plafond, et pour savoir si le découpage en
  maillages y est pour quelque chose.
- **Échelle:** juste (zone 12, environ 10 m, apparaît à environ 10 m): le modèle est en mètres réels.
- **Orientation:** juste avec `-H 0`: le repère du `.blend` est déjà aligné sur le nord.
- **Position:** décidé: les coordonnées (44°59.809′ N, 74°53.997′ O) épinglent le **centre de l'ensemble des zones**,
  figé au 2026-10-19 comme **ancre du site**: (−29,05; 21,70) dans le repère du `.blend`, en mètres (zones 1, 2, 3, 4, 7,
  8, 10, 11, 12 et 13: 70,6 × 38,0 m). Figé, pour que les zones ajoutées plus tard gardent leur place au lieu de
  déplacer toute l'écluse. `make_test_model.py -c` le change (`-c zone`: centre de la zone seule). Essai
  `t50000-anchor\`: la zone 12 doit apparaître à environ 8 m à l'ouest et 5 m au sud de l'épingle.

## À vérifier avec l'essai

- Le modèle s'affiche-t-il, avec sa texture, dans Google Earth Pro (KMZ) et dans Google Earth Web (GLB)?
- Fluidité: jusqu'où monter en triangles et en taille de texture pour le modèle complet?
