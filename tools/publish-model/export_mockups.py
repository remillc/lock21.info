"""Exporte les maquettes des zones (collection `mockups` du .blend: objets « mockup zone N ») en un seul .glb, pour le
visualiseur: il montre en fantôme translucide la maquette de chaque zone pas encore en ligne, et la cache dès que la
zone est publiée (TODO #6).

- Les modificateurs sont appliqués; géométrie seulement (ni matériaux ni textures: le visualiseur a son propre aspect).
- Coordonnées du monde de la scène (mètres), glTF Y vers le haut: même repère que les tuiles et le contexte.
- Chaque objet garde son nom (« mockup zone 9 »): le visualiseur en tire le numéro de zone.

Lecture seule pour le .blend (jamais sauvegardé).

Usage:
    blender -b <fichier.blend> --factory-startup --python export_mockups.py -- <dossier de sortie>
"""
import os
import re
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cli import parser, script_args  # noqa: E402

p = parser("export_mockups.py", __doc__)
p.add_argument("out_dir", help="dossier de sortie (mockups.glb)")
a = p.parse_args(script_args())
os.makedirs(a.out_dir, exist_ok=True)

collection = bpy.data.collections.get("mockups")
assert collection, "pas de collection « mockups » dans le .blend"
objects = [o for o in collection.all_objects if o.type == 'MESH' and re.fullmatch(r"mockup zone \d+", o.name)]
assert objects, "aucun objet « mockup zone N » dans la collection « mockups »"
print("[mockups] objets:", sorted(o.name for o in objects), flush=True)

for o in bpy.context.view_layer.objects:
    o.select_set(o in objects)
# Visibles et sélectionnables pour l'export, même si masqués dans le .blend (jamais sauvegardé)
for o in objects:
    o.hide_set(False)
    o.hide_viewport = False
    o.hide_select = False
    o.select_set(True)

glb = os.path.join(a.out_dir, "mockups.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=True,
                          export_materials='NONE', export_normals=True)
print(f"[mockups] glb: {glb} ({os.path.getsize(glb) / 1e3:.0f} ko, {len(objects)} maquettes)", flush=True)
