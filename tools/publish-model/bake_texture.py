"""Transfère la couleur d'un modèle détaillé texturé vers les coordonnées de texture d'un modèle léger (bake).

Cas d'usage: un modèle léger exporté de Metashape avec des coordonnées de texture mais sans couleur
(Metashape 1.7 ne transfère qu'une carte de normales d'un modèle à l'autre). Les deux exports doivent
venir du même chunk (même repère). Le résultat est un .glb texturé, dans les coordonnées d'origine.

Étapes: import des deux .glb; contrôle de l'écart entre les surfaces; bake Cycles (GPU) de la couleur
de base du modèle détaillé vers une nouvelle texture du modèle léger; export .glb; image d'aperçu.

Usage:
    blender -b --factory-startup --python bake_texture.py -- <léger.glb> <détaillé.glb> <sortie.glb> [taille_px]
"""
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

args = sys.argv[sys.argv.index("--") + 1:]
low_path, high_path, out_path = args[:3]
size = int(args[3]) if len(args) > 3 else 8192
# --reuse: reprend la texture déjà calculée (<sortie>.jpg) au lieu de refaire le bake
reuse = "--reuse" in args
work = os.path.dirname(out_path)
base = os.path.splitext(os.path.basename(out_path))[0]
os.makedirs(work, exist_ok=True)


def log(msg):
    print(f"[bake] {msg}", flush=True)


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path, merge_vertices=True)
    meshes = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    assert len(meshes) == 1, f"un seul mesh attendu dans {path}"
    ob = meshes[0]
    ob.data.transform(ob.matrix_world)
    ob.parent = None
    ob.matrix_world.identity()
    return ob


bpy.ops.wm.read_factory_settings(use_empty=True)
low = import_glb(low_path)
high = import_glb(high_path)
assert low.data.uv_layers, "le modèle léger n'a pas de coordonnées de texture"
log(f"léger {len(low.data.polygons):,} faces, détaillé {len(high.data.polygons):,} faces")

# Contrôle: distance des sommets du modèle détaillé à la surface du modèle léger (unités de l'export)
low.data.calc_loop_triangles()
tri = np.empty(len(low.data.loop_triangles) * 3, np.int64); low.data.loop_triangles.foreach_get("vertices", tri)
co = np.empty(len(low.data.vertices) * 3); low.data.vertices.foreach_get("co", co)
bvh = BVHTree.FromPolygons(co.reshape(-1, 3).tolist(), tri.reshape(-1, 3).tolist())
hco = np.empty(len(high.data.vertices) * 3); high.data.vertices.foreach_get("co", hco); hco = hco.reshape(-1, 3)
sample = hco[np.random.default_rng(0).choice(len(hco), 20000, replace=False)]
d = np.array([bvh.find_nearest(Vector(p))[3] for p in sample], dtype=float)
gap = dict(median=float(np.median(d)), p95=float(np.quantile(d, 0.95)), p99=float(np.quantile(d, 0.99)))
log(f"écart détaillé -> léger: médiane {gap['median']:.4f}, p95 {gap['p95']:.4f}, p99 {gap['p99']:.4f}")
assert gap["median"] < 0.1, "les deux modèles ne sont pas dans le même repère"
del bvh, hco

# Cible du bake: nouvelle texture sur le modèle léger
texture_path = os.path.join(work, f"{base}.jpg")
image = bpy.data.images.load(texture_path) if reuse else bpy.data.images.new(f"{base}-diffuse", size, size)
mat = bpy.data.materials.new(base)
mat.use_nodes = True
nodes = mat.node_tree.nodes
tex = nodes.new("ShaderNodeTexImage")
tex.image = image
mat.node_tree.links.new(tex.outputs["Color"], nodes["Principled BSDF"].inputs["Base Color"])
nodes.active = tex
low.data.materials.clear()
low.data.materials.append(mat)

# Cycles sur la carte graphique
scene = bpy.context.scene
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
scene.cycles.samples = 4
log(f"bake {size}x{size} sur {prefs.compute_device_type}: {[dev.name for dev in prefs.devices if dev.use]}")

if not reuse:
    bpy.ops.object.select_all(action='DESELECT')
    low.select_set(True)
    high.select_set(True)
    bpy.context.view_layer.objects.active = low
    # Rayons projetés depuis une cage légèrement gonflée autour du modèle léger, vers le détaillé
    extrusion = max(gap["p99"] * 2, 0.05)
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_selected_to_active=True,
                        cage_extrusion=extrusion, max_ray_distance=extrusion * 2, margin=16)
    image.filepath_raw = texture_path
    image.file_format = 'JPEG'
    image.save(quality=92)
log(f"texture: {texture_path}")

# Export du modèle léger texturé (glTF Y vers le haut: coordonnées d'origine)
bpy.data.objects.remove(high, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
low.select_set(True)
bpy.context.view_layer.objects.active = low
bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=True, export_image_format='JPEG',
                          export_jpeg_quality=92, export_normals=False)
log(f"glb: {out_path}")

# Aperçu (Workbench, couleur de texture)
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.color_type = 'TEXTURE'
scene.display.shading.light = 'FLAT'
scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
scene.collection.objects.link(cam)
scene.camera = cam
pts = np.array([low.matrix_world @ Vector(c) for c in low.bound_box])
center, radius = pts.mean(0), np.linalg.norm(pts.max(0) - pts.min(0)) / 2
cam.location = Vector(center) + Vector((1.0, -1.2, 0.9)).normalized() * radius * 2.2
cam.rotation_euler = (Vector(center) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.clip_end = radius * 10
scene.render.filepath = os.path.join(work, f"{base}-preview.png")
bpy.ops.render.render(write_still=True)
log(f"aperçu: {scene.render.filepath}")
