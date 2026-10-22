"""Exporte le « contexte » du site: objets *filler* (murs, sédiments... qui comblent les vides) et collection
`terrain` (vue d'ensemble du site), en un seul .glb non tuilé, léger, chargé par le visualiseur avec les zones.

- Matériaux procéduraux (rampes de couleur, bruit, relief Bump: le terrain): si l'objet a une propriété
  `baked_texture` (image cuite dans Blender par bake_context_in_blender.py), elle est utilisée; sinon le rendu
  Cycles sous l'éclairage de la scène est cuit ici, dans une texture par objet (glTF ne transporte pas ces nœuds).
  Si la carte UV de l'objet laisse des faces sans surface (murs: le plan projeté de dessus, faces verticales réduites
  à des lignes), la cuisson se fait dans une nouvelle carte UV dépliée (Smart UV Project), la seule exportée; le
  matériau lit toujours ses images par la carte d'origine. Sans cela, ces faces sortaient noires. Ces objets sont cuits
  en couleur seule (le visualiseur les éclaire): sous les lumières de la scène, leurs faces verticales étaient sombres.
- Autres matériaux: la première image est branchée directement sur la couleur; sans image, la couleur de base.
- Images réduites à --max-texture px de côté (multiple de 4).
- Coordonnées du monde de la scène (mètres), glTF Y vers le haut: même repère que les tuiles.
- Empreinte des objets (blend_state.py) écrite à côté, pour la détection des changements.

Lecture seule pour le .blend (jamais sauvegardé).

Usage:
    blender -b <fichier.blend> --factory-startup --python export_context.py -- <dossier de sortie> [-t 4096] [-s 4096]
"""
import json
import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(__file__))
from blend_state import context_fingerprint, context_objects  # noqa: E402
from cli import parser, script_args  # noqa: E402

p = parser("export_context.py", __doc__)
p.add_argument("out_dir", help="dossier de sortie (context.glb, fingerprint.json)")
p.add_argument("-t", "--max-texture", type=int, default=4096, help="côté maximal des images reprises telles quelles, px")
p.add_argument("-s", "--bake-size", type=int, default=4096, help="taille des textures cuites, px")
a = p.parse_args(script_args())
out_dir, max_texture = a.out_dir, a.max_texture
os.makedirs(out_dir, exist_ok=True)


objects = context_objects()
assert objects, "aucun objet filler ni collection terrain"
print("[context] objets:", [o.name for o in objects], flush=True)
fp = context_fingerprint(objects)

SIMPLE_NODES = {'TEX_IMAGE', 'BSDF_PRINCIPLED', 'OUTPUT_MATERIAL'}
bake_size = a.bake_size


def procedural(material):
    return material and material.node_tree and any(n.type not in SIMPLE_NODES for n in material.node_tree.nodes)


def flat_uv_share(ob):
    """Part de la surface de l'objet dont les faces n'ont pas de surface dans sa carte UV de rendu."""
    layer = next((u for u in ob.data.uv_layers if u.active_render), None)
    if layer is None:
        return 1.0
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    uv = bm.loops.layers.uv[layer.name]
    total = flat = 0.0
    for f in bm.faces:
        area = f.calc_area()
        pts = [l[uv].uv for l in f.loops]
        uv_area = abs(sum(pts[i].x * pts[i - 1].y - pts[i - 1].x * pts[i].y for i in range(len(pts)))) / 2
        total += area
        if uv_area < 1e-9:
            flat += area
    bm.free()
    return flat / total if total else 0.0


def bake_uv(ob):
    """Nouvelle carte UV dépliée, active pour la cuisson; la carte de rendu (lue par le matériau) ne change pas."""
    me = ob.data
    layer = me.uv_layers.new(name="context-bake")
    me.uv_layers.active = layer
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.view_layer.objects:
        o.select_set(o is ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003)
    bpy.ops.object.mode_set(mode='OBJECT')


def setup_cycles_gpu(scene, samples):
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
            if any(dev.type == kind for dev in prefs.devices):
                break
        except TypeError:
            continue
    for dev in prefs.devices:
        dev.use = dev.type != 'CPU'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = samples


baked = {}  # objet -> image cuite
# Images déjà cuites dans Blender (bake_context_in_blender.py, propriété `baked_texture`): utilisées telles quelles
for ob in objects:
    rel = ob.get("baked_texture")
    if rel and os.path.exists(bpy.path.abspath(rel)):
        baked[ob.name] = bpy.data.images.load(bpy.path.abspath(rel))
        print(f"[context] image cuite dans Blender: {ob.name} -> {rel}", flush=True)
to_bake = [o for o in objects if o.name not in baked and any(procedural(sl.material) for sl in o.material_slots)]
if to_bake:
    setup_cycles_gpu(bpy.context.scene, 128)
own_uv = set()  # objets cuits dans leur propre carte UV (bake_uv): seule carte exportée
for ob in to_bake:
    share = flat_uv_share(ob)
    if share > 0.01:
        bake_uv(ob)
        own_uv.add(ob.name)
        print(f"[context] {ob.name}: {share * 100:.0f} % de la surface sans place dans la carte UV, cuit dans une carte "
              "dépliée", flush=True)
    image = bpy.data.images.new(f"context-bake-{ob.name}", bake_size, bake_size)
    for slot in ob.material_slots:
        if slot.material is None:
            continue
        m = slot.material.copy()  # copie propre à l'objet: chaque objet cuit dans sa propre image
        node = m.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = image
        m.node_tree.nodes.active = node
        slot.link = 'OBJECT'
        slot.material = m
    for o in bpy.context.view_layer.objects:
        o.select_set(o is ob)
        # Seuls l'objet et les lumières sont rendus: sinon les autres objets (volumes de coupe, maquettes,
        # zones) projettent leurs ombres dans la texture
        o.hide_render = not (o is ob or o.type == 'LIGHT')
    bpy.context.view_layer.objects.active = ob
    # Couleur + éclairage direct et indirect: le relief (Bump) n'est visible que sous la lumière. Sauf pour les objets
    # cuits dans leur propre carte UV (murs): la couleur seule, le visualiseur les éclaire (soleil et ciel); sous les
    # lumières de la scène, venues d'en haut, leurs faces verticales sortaient presque noires
    passes = {'COLOR'} if ob.name in own_uv else {'COLOR', 'DIRECT', 'INDIRECT'}
    bpy.ops.object.bake(type='DIFFUSE', pass_filter=passes, margin=16)
    baked[ob.name] = image
    print(f"[context] cuit: {ob.name} ({bake_size}x{bake_size})", flush=True)

# Matériaux glTF simples, sur des copies (le .blend n'est jamais sauvegardé)
clean = {}
for ob in objects:
    if ob.name in baked:
        if ob.name in own_uv:
            for layer in [u for u in ob.data.uv_layers if u.name != "context-bake"]:
                ob.data.uv_layers.remove(layer)
            ob.data.uv_layers["context-bake"].active_render = True
        mat = bpy.data.materials.new(f"context-{ob.name}")
        mat.use_nodes = True
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = baked[ob.name]
        mat.node_tree.links.new(tex.outputs["Color"], mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
        ob.data.materials.clear()
        ob.data.materials.append(mat)
        for slot in ob.material_slots:
            slot.link = 'DATA'
        continue
    for slot in ob.material_slots:
        m = slot.material
        if m is None:
            continue
        if m.name not in clean:
            image = next((n.image for n in (m.node_tree.nodes if m.node_tree else [])
                          if n.type == 'TEX_IMAGE' and n.image), None)
            new = bpy.data.materials.new(f"context-{m.name}")
            new.use_nodes = True
            bsdf = new.node_tree.nodes["Principled BSDF"]
            if image:
                img = image.copy()
                w, h = img.size
                scale = min(1.0, max_texture / max(w, h))
                img.scale(max(4, int(w * scale) // 4 * 4), max(4, int(h * scale) // 4 * 4))
                tex = new.node_tree.nodes.new("ShaderNodeTexImage")
                tex.image = img
                new.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
            else:
                src = m.node_tree.nodes.get("Principled BSDF") if m.node_tree else None
                bsdf.inputs["Base Color"].default_value = (src.inputs["Base Color"].default_value if src
                                                           else (*m.diffuse_color[:3], 1.0))
            clean[m.name] = new
        slot.link = 'OBJECT'
        slot.material = clean[m.name]

for o in bpy.context.view_layer.objects:
    o.select_set(False)
for ob in objects:
    ob.hide_set(False)
    ob.hide_viewport = False
    ob.select_set(True)
bpy.context.view_layer.objects.active = objects[0]

glb = os.path.join(out_dir, "context.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=True,
                          export_image_format='JPEG', export_jpeg_quality=88, export_normals=False,
                          export_materials='EXPORT')
json.dump(fp, open(os.path.join(out_dir, "fingerprint.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
faces = sum(len(o.data.polygons) for o in objects)
print(f"[context] glb: {glb} ({os.path.getsize(glb) / 1e6:.1f} Mo, {faces:,} faces)", flush=True)
