"""Exporte les maquettes des zones (collection `mockups` du .blend: objets « mockup zone N ») en un seul .glb, pour le
visualiseur: il montre en fantôme translucide la maquette de chaque zone pas encore en ligne, et la cache dès que la
zone est publiée (TODO #6).

- Les modificateurs sont appliqués.
- Leur aspect du .blend (Christian, 2026-10-24): chaque maquette projette une image emballée dans le .blend (le plan de
  1988, img397.jpg, ou sa version sans texte) à travers une ou plusieurs rampes de couleurs (Color Ramp) vers la
  couleur de base. Le glTF ne porte pas de rampe: pour chaque chaîne distincte, l'image réduite à TEXTURE_WIDTH px
  est calculée comme Blender le fait (pixels en lumière linéaire, luminance Rec. 709, chaque rampe à son tour) et
  devient l'image de la couleur de base; coordonnées de texture et rugosité gardées. Exportées en WebP. Ce que le
  glTF ne porte pas est laissé (le relief procédural de la zone 7, la transparence par l'alpha d'une image JPEG).
- Les maquettes de PAPER_ZONES (5, 6, 14, 15) en papier violet uniforme (Christian, 2026-10-24): le grain du papier
  du plan, pris dans son carré de PATCH px le plus blanc, répété en miroir (sans couture), multiplié par le violet
  TINT.
- Le plan porte l'adresse et les numéros de téléphone personnels de son auteur (en bas à droite): jamais publiés
  (AGENTS.md); PRIVATE_AREAS les recouvre de la couleur du papier (la médiane du plan) avant tout calcul. Son nom
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

# Les textures, en mémoire seulement: une image par chaîne image + rampes distincte, et le papier violet
TEXTURE_WIDTH = 2048
PAPER_ZONES = {5, 6, 14, 15}
PATCH = 256
TINT = (0xb7, 0xa3, 0xd6)
# Zones privées, par image: (u min, u max, v min, v max), en fractions de l'image, v vers le haut (UV de Blender).
# img397.jpg et sa version sans texte (même cadrage, l'adresse y est restée): les quatre lignes sous
# « BY: NICK BAETS » (adresse, ville, deux téléphones)
PRIVATE_AREAS = {name: [(0.79, 0.97, 0.02, 0.101)] for name in ("img397.jpg", "img397-without-text.jpg")}
LUMINANCE = np.array([0.2126, 0.7152, 0.0722])


def to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def new_image(name, color):
    """Une image Blender (sRGB, 8 bits) de pixels sRGB H x W x 3, rangées depuis le bas"""
    h, w = color.shape[:2]
    out = bpy.data.images.new(name, w, h, alpha=False)
    out.pixels.foreach_set(np.dstack([color, np.ones((h, w))]).astype(np.float32).ravel())
    return out


scans = {}


def scan(image):
    """L'image réduite, en lumière linéaire (H x W x 3, rangées depuis le bas), zones privées recouvertes"""
    if image.name not in scans:
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
        scans[image.name] = to_linear(rgb) if image.colorspace_settings.name == 'sRGB' else rgb
    return scans[image.name]


def chain(material):
    """L'image et les rampes (de l'image vers la couleur de base) qui donnent la couleur de base, et le BSDF; ou None"""
    nodes = material.node_tree.nodes if material and material.use_nodes else []
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf or not bsdf.inputs['Base Color'].is_linked:
        return None
    ramps = []
    node = bsdf.inputs['Base Color'].links[0].from_node
    while node.type == 'VALTORGB':
        ramps.insert(0, node.color_ramp)
        if not node.inputs['Fac'].is_linked:
            return None
        node = node.inputs['Fac'].links[0].from_node
    if node.type != 'TEX_IMAGE' or not node.image:
        return None
    return node.image, ramps, bsdf


baked = {}


def blend_texture(image, ramps):
    """L'image à travers ses rampes, comme Blender (luminance, puis chaque rampe), une fois par chaîne"""
    key = (image.name, tuple(tuple((round(e.position, 4), tuple(round(c, 4) for c in e.color)) for e in cr.elements)
                             + (cr.color_mode, cr.interpolation) for cr in ramps))
    if key not in baked:
        color = scan(image)
        for cr in ramps:
            lut = np.array([cr.evaluate(i / 1023)[:3] for i in range(1024)], dtype=np.float32)
            color = lut[np.rint(np.clip(color @ LUMINANCE, 0, 1) * 1023).astype(np.int32)]
        baked[key] = new_image(f"mockup-texture-{len(baked) + 1}", to_srgb(color))
    return baked[key]


paper_image = None


def paper_texture():
    """Le grain du papier du plan, sans couture, teinté TINT (une fois)"""
    global paper_image
    if paper_image:
        return paper_image
    lum = scan(bpy.data.images["img397.jpg"]) @ LUMINANCE
    h, w = lum.shape
    dark = lum < 0.6
    best = None
    for y in range(0, h - PATCH, PATCH // 4):
        for x in range(0, w - PATCH, PATCH // 4):
            score = (dark[y:y + PATCH, x:x + PATCH].mean(), -lum[y:y + PATCH, x:x + PATCH].mean())
            if best is None or score < best[0]:
                best = (score, x, y)
    _, x, y = best
    patch = lum[y:y + PATCH, x:x + PATCH]
    tile = patch / patch.mean()
    tile = np.block([[tile, tile[:, ::-1]], [tile[::-1, :], tile[::-1, ::-1]]])
    reps = TEXTURE_WIDTH // tile.shape[0]
    grain = np.tile(tile, (reps, reps))
    paper_image = new_image("mockup-paper", to_srgb(grain[:, :, None] * to_linear(np.array(TINT) / 255)))
    return paper_image


def textured(name, image, roughness):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    principled = material.node_tree.nodes['Principled BSDF']
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    material.node_tree.links.new(texture.outputs['Color'], principled.inputs['Base Color'])
    principled.inputs['Roughness'].default_value = roughness
    return material


papers = []
for o in objects:
    if o.type != 'MESH':
        continue
    zone = int(o.name.split()[-1])
    for slot in o.material_slots:
        found = chain(slot.material)
        roughness = found[2].inputs['Roughness'].default_value if found else 0.5
        if zone in PAPER_ZONES:
            slot.material = textured(f"mockup paper {o.name}", paper_texture(), roughness)
            papers.append(zone)
        elif found:
            slot.material = textured(f"mockup {o.name}", blend_texture(found[0], found[1]), roughness)
        else:
            print(f"[mockups] {o.name}: matériau sans image + rampes, gardé tel quel", flush=True)
print(f"[mockups] textures: {len(baked)} image(s) du .blend, papier violet pour les zones {sorted(set(papers))}",
      flush=True)

glb = os.path.join(a.out_dir, "mockups.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=True,
                          export_materials='EXPORT', export_image_format='WEBP', export_image_quality=85,
                          export_normals=True)
print(f"[mockups] glb: {glb} ({os.path.getsize(glb) / 1e3:.0f} ko, {len(objects)} maquettes)", flush=True)
