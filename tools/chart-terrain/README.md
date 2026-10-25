# Terrain d'après une carte (TODO #73)

Refait le terrain des abords de l'écluse 21 d'après une capture de la carte de l'application Boating
(`C:\Users\chris\Downloads\Screenshot_20261025_073716_Boating.jpg`, 2026-10-25): lignes de profondeur, sondes en
pieds, terre en jaune, haut-fond en vert. Le résultat est un **nouveau** fichier, `O:\modeles\chart-terrain\lock-21-chart-terrain.blend`:
le `.blend` de publication n'est ni ouvert ni modifié.

## Commandes

```powershell
# 1. La grille des hauteurs (Python du système: numpy, scipy, scikit-image, Pillow), 35 s
python tools\chart-terrain\chart_terrain.py
# 2. Le .blend (Blender, sans interface)
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools\chart-terrain\make_chart_terrain.py
```

Sorties intermédiaires dans `O:\temp\chart-terrain\`: `heights.npz` (la grille) et `heights-preview.png` (un aperçu).

## Données

`soundings-2026-10-25.json`: la source, l'échelle (la barre de 100 pi fait 111 px: 0,2746 m par pixel), l'origine (la
croix verte près du drapeau de plongée: l'écluse, l'ancre du site), les 53 sondes lues sur la carte (position du centre
du nombre, profondeur en pieds) et les zones à ignorer (boutons et barres de l'application, étiquettes, symboles).

## Méthode (`chart_terrain.py`)

1. **Classes par couleur:** eau (blanc, avec ses lignes noires), haut-fond (vert: 0 pi), terre (jaune: 5 pi au-dessus
   de l'eau, `-l`).
2. **Première surface:** une plaque mince (thin plate spline) par les sondes et le bord du haut-fond.
3. **Les bandes entre les lignes:** l'eau sans les lignes (pixels plus sombres que 620 en R+G+B, `-k`, épaissis d'un
   pixel pour fermer leurs petites coupures), chaque morceau d'un seul tenant une bande. Deux bandes face à face de part
   et d'autre d'une ligne diffèrent d'un intervalle, plus profonde du côté où la première surface l'est; les sondes et
   le haut-fond fixent les profondeurs. Moindres carrés, l'intervalle étant lui-même une inconnue: compter les lignes
   ne suffit pas, elles se confondent sur les talus raides. Une bande reste à 8 pi au plus de la première surface
   (`-b`): au-delà, des fentes étroites.
4. **La surface finale:** chaque bande à sa profondeur, lissée (les gradins deviennent des pentes qui suivent les
   lignes), sur une grille de 1 m (`-c`).

Résultat sur la carte du 2026-10-25: 1 112 bandes, intervalle trouvé de 1,48 pi; écart aux sondes médian 0,7 pi,
7,2 pi au pire; 550 × 302 m.

## Le .blend (`make_chart_terrain.py`)

- Le maillage, nord en haut, en mètres, son origine celle de la carte, sous un vide « chart frame » qui le place dans le
  repère du `.blend` de publication: à l'ancre du site (−29,05; 21,70) et tourné de −30° (le cap du modèle,
  `make_kmz.py -H`). Déplacer ou tourner ce vide pour caler la carte sur le modèle.
- Hauteurs dans ce repère: la surface de l'eau à 55 pi (16,764 m) au-dessus du niveau de référence de l'écluse
  (`SURFACE_Y` du visualiseur), un plan « water surface (55 ft) » pour repère (fil de fer, pas rendu).

## Dans le .blend de publication

La collection `chart terrain` y est **liée** (2026-10-25: Fichier > Lier, par chemin absolu, le `.blend` étant sur un
autre disque): refaire `make_chart_terrain.py` met à jour le `.blend` de publication à sa prochaine ouverture. Elle est
à la racine de la scène, hors de la collection `terrain`: elle n'est pas publiée (`blend_state.py`, `context_objects`;
`model:check` le confirme). Pour la caler, ajouter une surcharge de bibliothèque (Library Override) sur « chart frame ».

## Limites

- La croix verte est prise pour l'ancre du site: à vérifier en calant le terrain sur le modèle.
- La terre est plate (la carte ne donne pas son relief), le haut-fond à 0 pi.
- La carte montre aussi l'écluse elle-même (les bosses de 36 à 44 pi à l'est du drapeau): le terrain les contient,
  à découper là où le modèle photogrammétrique les remplace.
