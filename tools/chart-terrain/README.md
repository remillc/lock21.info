# Terrain d'après une carte (TODO #73)

Refait le terrain des abords de l'écluse 21 d'après une capture de la carte de l'application Navionics Boating
(`C:\Users\chris\Downloads\Screenshot_20261025_073716_Boating.jpg`, 2026-10-25): lignes de profondeur, sondes en
pieds, terre en jaune, haut-fond en vert. Le terrain vit **dans le `.blend` de publication**, collection `chart terrain`
(pas de fichier à part: Christian, 2026-10-25). Il remplace « terrain - SOS data », que Christian masque.

## Commandes

Blender fermé (le `.blend` de publication est ouvert sans interface, puis remplacé):

```powershell
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
# 1. La grille des hauteurs (Python du système: numpy, scipy, scikit-image, Pillow), 35 s
python tools\chart-terrain\chart_terrain.py
# 2. Le modèle sous cette grille (lecture seule du .blend), 15 s, puis refaire la grille avec lui
& $blender -b modeles\lock-21-publishing.blend --factory-startup --python tools\chart-terrain\model_floor.py
python tools\chart-terrain\chart_terrain.py
# 3. Le terrain dans une copie du .blend, puis la copie à la place du .blend
& $blender -b modeles\lock-21-publishing.blend --factory-startup --python tools\chart-terrain\make_chart_terrain.py
Move-Item -Force O:\temp\lock-21-publishing-chart.blend modeles\lock-21-publishing.blend
```

L'étape 2 n'est à refaire que si le modèle a changé (zones, murs, remplissages, maquettes). Sorties intermédiaires dans
`O:\temp\chart-terrain\`: `heights.npz` (la grille), `heights-preview.png` (un aperçu), `floor.npz` (le modèle).

## Retouché à la main: ajuster, ne plus refaire

Depuis le 2026-10-25, Christian retouche le terrain à la main dans le `.blend` de publication. `make_chart_terrain.py`
le referait depuis la carte et **effacerait ces retouches**: ne plus le lancer. Après une retouche ou un changement du
modèle, ajuster le terrain là seulement où il rencontre le modèle (Blender fermé):

```powershell
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
# 1. Mesurer chaque sommet du terrain et le modèle sous lui et au-dessus (lecture seule), 15 s
& $blender -b modeles\lock-21-publishing.blend --factory-startup --python tools\chart-terrain\fit_mesh.py -- --measure
# 2. Les hauteurs ajustées (Python du système)
python tools\chart-terrain\fit_terrain.py
# 3. Les écrire dans le maillage, dans une copie du .blend, puis la copie à la place du .blend
& $blender -b modeles\lock-21-publishing.blend --factory-startup --python tools\chart-terrain\fit_mesh.py -- --apply
Move-Item -Force O:\temp\lock-21-publishing-chart.blend modeles\lock-21-publishing.blend
```

`fit_terrain.py` ne touche un sommet que s'il le faut (le reste garde la hauteur retouchée):

- **sous le sol d'une zone** (un plancher ou une berge: au plus 1,2 m au-dessus du plus bas de la zone dans un rayon de
  3 m; le dessus d'un mur ou d'un pilier n'en est pas): 5 cm dessous, en montant ou en descendant;
- **dans un trou d'un scan** (pas sous un solide, qui le couvre): 5 cm sous le sol le plus bas autour, dans 1,5 m;
- **près du modèle, hors des zones** (à 8 m au plus d'une zone ou d'un solide), emprises des murs et des solides
  comprises: une surface lisse (un remplissage de Laplace) tendue entre le terrain plus loin, tel que retouché, et les
  bords du sol des zones; murs et solides ne la soutiennent pas (des gradins grimpaient le long d'un mur jusqu'à son
  dessus, une fosse à trous entourait le remplissage: « aussi bas et plat que ses environs », Christian, 2026-10-25);
  le plancher de l'écluse gardé plat dans 10 m du sol des zones (contourné), à son niveau (une surface lisse par le
  sol des zones à moins d'un mètre de sa hauteur type, 0,55 m: marches, rebords et une pièce profonde laissés de côté),
  en abaissant seulement le sol à moins de 2,5 à 4 m au-dessus (une berge garde sa hauteur); contre la face extérieure
  d'un mur, le sol monte à son dessus s'il en est à moins de 3 m (les vides le long du mur); jamais plus haute que le
  dessus des zones plus 0,25 m par mètre;
- **dans les zones à aplatir** (`FLATTEN` dans `fit_terrain.py`, des rectangles demandés par Christian, d'un seul côté
  des murs): à plat, au niveau du plancher de l'écluse, raccordé sur 1 m; le sol des zones gardé. Première: x −44 à −24,
  y 22 à 36, une butte de 9 m près du bout nord de la passerelle (2026-10-25);
- **dans un mur ou un solide** (murs du contexte, maquettes): jamais au-dessus de son dessus (sous le mur d'une zone, le
  dessus du mur). Les remplissages (sédiments) sont à part: le sol n'est pas plafonné par eux et ne descend pas sous le
  niveau du plancher dans leur emprise (plafonné sous eux, il tombait dans leurs creux, en fosse).

Le maillage doit rester la grille d'origine (les retouches déplacent les sommets, sans en ajouter ni en retirer).
Ajustements du 2026-10-25: 2 018, 9 950 puis 3 690 sommets sur 166 100 déplacés.

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
4. **La surface, sans gradins:** chaque ligne à la profondeur de sa courbe (la moyenne de ses deux bandes), le milieu
   de chaque bande à la profondeur de la bande, linéaire entre les deux: le fond descend régulièrement d'une ligne à
   l'autre (des bandes plates se rencontraient en marches), sur une grille de 1 m (`-c`).
5. **Le rivage, sans marches:** une plage sur le haut-fond (de 0,5 pi au bord de l'eau à 0 sur 6 m), puis la terre
   qui monte à sa hauteur sur 15 m.
6. **Contre le modèle** (`-f`, mesuré par `model_floor.py`, tel que rendu, sans « terrain - SOS data »), deux sortes de
   parties (Christian, 2026-10-25):
   - **les zones**, surfaces scannées ouvertes: le sol les rejoint par-dessous, 5 cm sous leur surface la plus basse
     tournée vers le haut, en montant ou en descendant (ni au-dessus d'elles, ni de vide sous leurs bords ou par leurs
     trous); les trous d'une zone prennent le plancher voisin; au-delà de son bord, le sol rejoint ses propres hauteurs
     sur 8 m. Chaque point prend le plus bas de ses 8 voisins: le sol entre les points de la grille reste dessous aussi;
   - **les solides** (murs et remplissages du contexte, maquettes): le sol ne dépasse jamais leur dessus; dedans, il
     est caché. (Suivre leurs faces les plus basses creusait des vides; suivre leur dessus, des plateaux.)

Résultat sur la carte du 2026-10-25: 1 112 bandes, intervalle trouvé de 1,48 pi; écart aux sondes médian 0,4 pi,
3,5 pi au pire; 550 × 302 m; 1 199 points sous les zones, 423 gardés sous le dessus des solides.

## Dans le .blend (`make_chart_terrain.py`)

- Remplace la collection `chart terrain` (et, au besoin, l'ancien lien vers un fichier à part): à la racine de la
  scène, hors de la collection `terrain`, elle n'est pas publiée (`blend_state.py`, `context_objects`; `model:check`
  le confirme).
- Le maillage, nord en haut, en mètres, son origine celle de la carte, sous un vide « chart frame » qui le place dans le
  repère du `.blend`: à l'ancre du site (−29,05; 21,70) et tourné de −30° (le cap du modèle, `make_kmz.py -H`).
- Hauteurs dans ce repère: la surface de l'eau à 55 pi (16,764 m) au-dessus du niveau de référence de l'écluse
  (`SURFACE_Y` du visualiseur), un plan « water surface (55 ft) » pour repère (fil de fer, pas rendu).
- Son matériau, « chart terrain »: une copie de « terrain - SOS (riprap on the banks) » (moules, enrochement sur les
  pentes), sa carte UV calculée comme celle de « terrain - SOS data » (la position sur 1,5 m: les textures se
  continuent de l'un à l'autre), **vert hors de l'eau** (au-dessus de 16,764 m, fondu sur 45 cm).

## Limites

- La croix verte est prise pour l'ancre du site.
- La terre est plate (la carte ne donne pas son relief), le haut-fond à 0 pi.
- La carte montre aussi l'écluse elle-même (les bosses de 36 à 44 pi à l'est du drapeau): le terrain les contient,
  sous les zones.
