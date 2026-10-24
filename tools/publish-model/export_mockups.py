"""Exporte les maquettes des zones (collection `mockups` du .blend: objets « mockup zone N ») en un seul .glb, pour le
visualiseur: il montre en fantôme translucide la maquette de chaque zone pas encore en ligne, et la cache dès que la
zone est publiée (TODO #6).

- Les modificateurs sont appliqués.
- Un papier violet uniforme (Christian, 2026-10-24), la même texture pour toutes: le grain du papier du plan de 1988
  numérisé (img397.jpg, emballé dans le .blend), pris dans le carré de PATCH px le plus blanc du plan réduit à
  TEXTURE_WIDTH px, répété en miroir (sans couture) sur une image de TEXTURE_WIDTH px, multiplié par le violet TINT
  (lumière linéaire). Coordonnées de texture et rugosité de chaque maquette gardées. Exportée en WebP. Aucun trait du
  plan n'est publié; l'adresse et les numéros de téléphone de son auteur (en bas à droite, jamais publiés: AGENTS.md)
  sont de plus recouverts du papier (PRIVATE_AREAS) avant le choix du carré.
- Coordonnées du monde de la scène (mètres), glTF Y vers le haut: même repère que les tuiles et le contexte.
- Chaque objet garde son nom (« mockup zone 9 »): le visualiseur en tire le numéro de zone.
- Aussi les empties dont le nom commence par « crawfish » (n'importe quelle collection): la place d'une écrevisse
  animée dans le visualiseur (viewer/src/crawfish.js).

Lecture seule pour le .blend (jamais sauvegardé).

Usage:
    blender -b <fichier.blend> --factory-startup --python export_mockups.py -- <dossier de sortie>
"""
import os
import re
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cli import parser, script_args  # noqa: E402
from blend_state import follow_render_visibility  # noqa: E402

p = parser("export_mockups.py", __doc__)
p.add_argument("out_dir", help="dossier de sortie (mockups.glb)")
a = p.parse_args(script_args())
# Modificateurs: ceux activés pour le rendu, même masqués dans la vue (blend_state.follow_render_visibility)
print("[render visibility]", follow_render_visibility(), flush=True)
os.makedirs(a.out_dir, exist_ok=True)

collection = bpy.data.collections.get("mockups")
assert collection, "pas de collection « mockups » dans le .blend"
objects = [o for o in collection.all_objects if o.type == 'MESH' and re.fullmatch(r"mockup zone \d+", o.name)]
assert objects, "aucun objet « mockup zone N » dans la collection « mockups »"
print("[mockups] objets:", sorted(o.name for o in objects), flush=True)
creatures = [o for o in bpy.data.objects if o.type == 'EMPTY' and o.name.lower().startswith("crawfish")]
print("[mockups] écrevisses:", sorted(o.name for o in creatures), flush=True)
objects += creatures

for o in bpy.context.view_layer.objects:
    o.select_set(o in objects)
# Visibles et sélectionnables pour l'export, même si masqués dans le .blend (jamais sauvegardé)
for o in objects:
    o.hide_set(False)
    o.hide_viewport = False
    o.hide_select = False
    o.select_set(True)

# La texture de papier violet, en mémoire seulement
TEXTURE_WIDTH = 2048
PATCH = 256
TINT = (0xb7, 0xa3, 0xd6)
# Zones privées du plan, par image: (u min, u max, v min, v max), en fractions de l'image, v vers le haut (UV de
# Blender). img397.jpg: les quatre lignes sous « BY: NICK BAETS » (adresse, ville, deux téléphones)
PRIVATE_AREAS = {"img397.jpg": [(0.79, 0.97, 0.02, 0.101)]}
LUMINANCE = np.array([0.2126, 0.7152, 0.0722])


def to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def paper_texture(image):
    """Le grain du papier du plan, sans couture, teinté TINT: une image Blender de TEXTURE_WIDTH px"""
    small = image.copy()
    small.scale(TEXTURE_WIDTH, round(image.size[1] * TEXTURE_WIDTH / image.size[0]))
    w, h = small.size
    px = np.empty(w * h * 4, dtype=np.float32)
    small.pixels.foreach_get(px)
    bpy.data.images.remove(small)
    rgb = px.reshape(h, w, 4)[:, :, :3].copy()
    paper = np.median(rgb.reshape(-1, 3), axis=0)
    for u0, u1, v0, v1 in PRIVATE_AREAS.get(image.name, []):
        rgb[int(v0 * h):int(np.ceil(v1 * h)), int(u0 * w):int(np.ceil(u1 * w))] = paper
    lum = to_linear(rgb) @ LUMINANCE
    # The blankest square: the fewest dark pixels (lines, dots, letters), then the lightest
    dark = lum < 0.6
    best = None
    for y in range(0, h - PATCH, PATCH // 4):
        for x in range(0, w - PATCH, PATCH // 4):
            score = (dark[y:y + PATCH, x:x + PATCH].mean(), -lum[y:y + PATCH, x:x + PATCH].mean())
            if best is None or score < best[0]:
                best = (score, x, y)
    _, x, y = best
    patch = lum[y:y + PATCH, x:x + PATCH]
    grain = patch / patch.mean()
    # Mirrored copies: seamless, then tiled over the image
    tile = np.block([[grain, grain[:, ::-1]], [grain[::-1, :], grain[::-1, ::-1]]])
    reps = TEXTURE_WIDTH // tile.shape[0]
    grain = np.tile(tile, (reps, reps))
    tint = to_linear(np.array(TINT) / 255)
    color = to_srgb(grain[:, :, None] * tint)
    size = grain.shape[0]
    out = bpy.data.images.new("mockup-paper", size, size, alpha=False)
    out.pixels.foreach_set(np.dstack([color, np.ones((size, size))]).astype(np.float32).ravel())
    print(f"[mockups] papier: carré {PATCH} px pris en ({x}, {y}) du plan réduit, {(best[0][0] * 100):.2f} % de pixels "
          f"sombres; grain de {grain.min():.2f} à {grain.max():.2f}", flush=True)
    return out


scan_image = bpy.data.images.get("img397.jpg")
assert scan_image, "pas d'image img397.jpg dans le .blend (le papier des maquettes)"
paper = paper_texture(scan_image)
for o in objects:
    if o.type != 'MESH':
        continue
    for slot in o.material_slots:
        old = slot.material
        bsdf = next((n for n in old.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if old and old.use_nodes else None
        material = bpy.data.materials.new(f"mockup paper {old.name if old else o.name}")
        material.use_nodes = True
        principled = material.node_tree.nodes['Principled BSDF']
        texture = material.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = paper
        material.node_tree.links.new(texture.outputs['Color'], principled.inputs['Base Color'])
        principled.inputs['Roughness'].default_value = bsdf.inputs['Roughness'].default_value if bsdf else 0.5
        slot.material = material
print(f"[mockups] texture: papier violet {TEXTURE_WIDTH} px, la même pour toutes", flush=True)

glb = os.path.join(a.out_dir, "mockups.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=True,
                          export_materials='EXPORT', export_image_format='WEBP', export_image_quality=85,
                          export_normals=True)
print(f"[mockups] glb: {glb} ({os.path.getsize(glb) / 1e3:.0f} ko, {len(objects)} maquettes)", flush=True)
