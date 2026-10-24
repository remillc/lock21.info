"""Exporte les maquettes des zones (collection `mockups` du .blend: objets « mockup zone N ») en un seul .glb, pour le
visualiseur: il montre en fantôme translucide la maquette de chaque zone pas encore en ligne, et la cache dès que la
zone est publiée (TODO #6).

- Les modificateurs sont appliqués.
- Leurs textures d'origine (Christian, 2026-10-24): chaque maquette projette le plan de 1988 numérisé (img397.jpg, emballé
  dans le .blend) à travers une rampe de couleurs (Color Ramp) vers la couleur de base. Le glTF ne porte pas de rampe:
  pour chaque rampe distincte, le plan entier réduit à TEXTURE_WIDTH px est calculé comme Blender le fait (pixels en
  lumière linéaire, luminance Rec. 709, rampe) et devient l'image de la couleur de base; coordonnées de texture
  inchangées, rugosité gardée. Exportées en WebP.
- Le plan porte l'adresse et les numéros de téléphone personnels de son auteur (en bas à droite): jamais publiés
  (AGENTS.md); PRIVATE_AREAS les recouvre de la couleur du papier (la médiane du plan) avant le calcul. Son nom
  (« BY: NICK BAETS ») reste: c'est le crédit.
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

# Les textures: une image par rampe distincte (plusieurs maquettes en partagent une), en mémoire seulement
TEXTURE_WIDTH = 2048
# Zones privées du plan, par image: (u min, u max, v min, v max), en fractions de l'image, v vers le haut (UV de
# Blender). img397.jpg: les quatre lignes sous « BY: NICK BAETS » (adresse, ville, deux téléphones), le nom gardé
PRIVATE_AREAS = {"img397.jpg": [(0.79, 0.97, 0.02, 0.101)]}
LUMINANCE = np.array([0.2126, 0.7152, 0.0722])


def to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


scans = {}
baked = {}


def scan(image):
    """Le plan réduit, en lumière linéaire (H x W x 3), une fois par image"""
    if image.name not in scans:
        small = image.copy()
        small.scale(TEXTURE_WIDTH, round(image.size[1] * TEXTURE_WIDTH / image.size[0]))
        w, h = small.size
        px = np.empty(w * h * 4, dtype=np.float32)
        small.pixels.foreach_get(px)
        bpy.data.images.remove(small)
        rgb = px.reshape(h, w, 4)[:, :, :3].copy()
        # Rows from the bottom (Blender's pixels), as the UVs; the paper's colour: the plan's median (mostly paper)
        paper = np.median(rgb.reshape(-1, 3), axis=0)
        for u0, u1, v0, v1 in PRIVATE_AREAS.get(image.name, []):
            rgb[int(v0 * h):int(np.ceil(v1 * h)), int(u0 * w):int(np.ceil(u1 * w))] = paper
        scans[image.name] = (to_linear(rgb) if image.colorspace_settings.name == 'sRGB' else rgb, w, h)
    return scans[image.name]


def baked_material(material):
    """Le matériau de la maquette avec la couleur de base calculée (image + rampe), ou None s'il n'en a pas"""
    nodes = material.node_tree.nodes if material and material.use_nodes else []
    ramp = next((n for n in nodes if n.type == 'VALTORGB'), None)
    tex = next((n for n in nodes if n.type == 'TEX_IMAGE' and n.image), None)
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not (ramp and tex and bsdf):
        return None
    cr = ramp.color_ramp
    key = (tex.image.name, cr.color_mode, cr.interpolation,
           tuple((round(e.position, 4), tuple(round(c, 4) for c in e.color)) for e in cr.elements))
    if key not in baked:
        rgb, w, h = scan(tex.image)
        lut = np.array([cr.evaluate(i / 1023)[:3] for i in range(1024)], dtype=np.float32)
        factor = np.clip(rgb @ LUMINANCE, 0, 1)
        color = to_srgb(lut[np.rint(factor * 1023).astype(np.int32)])
        out = bpy.data.images.new(f"mockup-texture-{len(baked) + 1}", w, h, alpha=False)
        out.pixels.foreach_set(np.dstack([color, np.ones((h, w))]).astype(np.float32).ravel())
        baked[key] = out
    result = bpy.data.materials.new(f"mockup {len(baked)} {material.name}")
    result.use_nodes = True
    principled = result.node_tree.nodes['Principled BSDF']
    image = result.node_tree.nodes.new('ShaderNodeTexImage')
    image.image = baked[key]
    result.node_tree.links.new(image.outputs['Color'], principled.inputs['Base Color'])
    principled.inputs['Roughness'].default_value = bsdf.inputs['Roughness'].default_value
    return result


for o in objects:
    if o.type != 'MESH':
        continue
    for slot in o.material_slots:
        made = baked_material(slot.material)
        if made:
            slot.material = made
print(f"[mockups] textures: {len(baked)} images de {TEXTURE_WIDTH} px (une par rampe)", flush=True)

glb = os.path.join(a.out_dir, "mockups.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=True,
                          export_materials='EXPORT', export_image_format='WEBP', export_image_quality=85,
                          export_normals=True)
print(f"[mockups] glb: {glb} ({os.path.getsize(glb) / 1e3:.0f} ko, {len(objects)} maquettes)", flush=True)
