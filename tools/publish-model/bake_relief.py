"""Bakes the relief of a zone's high-res export (zebra mussels, joints) into a normal map for its prepared mesh.

The prepared mesh (prepare_zone.py: <zone>.obj, a few cm per edge) loses the 1 to 3 cm relief of the mussels;
the high-res Metashape export (about 7 mm per edge) still has it. Cycles casts rays from the prepared mesh to
the high-res one and writes the high-res surface normal into a texture laid out on the prepared mesh's UVs.

Object-space normals, expressed in the OBJ frame (Y up, as written by prepare_zone.py and read by Obj2Tiles):
the viewer needs neither vertex normals nor tangents, which the tiles don't carry.

The high-res export is placed like prepare_zone.py does it (transforms/<zone>.json, cached registration), so it
must be the zone's `source` export (or come from the same Metashape chunk, already registered). Deform
modifiers (Lattice) are not applied: use it on zones without one, or the two meshes won't match.

Writes <out>/<slug>-normal.png and a copy of the .obj/.jpg with an .mtl that references it (map_Bump), ready
for tile_zone.ps1.

Usage:
    blender -b --factory-startup --python bake_relief.py -- -z "zone 12" -p O:\\temp\\zone-12\\prox -o O:\\temp\\zone-12\\relief [-s <px>]
"""
import json
import os
import shutil
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cli import parser, script_args  # noqa: E402

p = parser("bake_relief.py", __doc__)
p.add_argument("-z", "--zone", required=True, help='zone name, e.g. "zone 12"')
p.add_argument("-p", "--prepared", required=True, help="folder of the prepared zone (<slug>.obj, .jpg, -prepare.json)")
p.add_argument("-o", "--out", required=True, help="output folder")
p.add_argument("-s", "--size", type=int, help="normal map size, px (default: the photo texture's size; Obj2Tiles packs each tile by texture size, so a different size breaks merge_normal_maps.mjs)")
p.add_argument("-c", "--cage", type=float, help="cage extrusion, m (default: twice the 95th percentile of the gap, min 3 cm)")
p.add_argument("--source", help="high-res export (default: the `source` recorded in <slug>-prepare.json)")
a = p.parse_args(script_args())
slug = a.zone.replace(" ", "-")
os.makedirs(a.out, exist_ok=True)


def log(msg):
    print(f"[relief] {msg}", flush=True)


report = json.load(open(os.path.join(a.prepared, f"{slug}-prepare.json"), encoding="utf-8"))
source = a.source or report["source"]
assert not report["steps"]["deform"]["modifiers"], (
    f"{a.zone} has deform modifiers {report['steps']['deform']['modifiers']}: not supported by this test script")
transform = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "transforms", f"{slug}.json"),
                           encoding="utf-8"))
assert os.path.normcase(transform["source"]) == os.path.normcase(source), (
    f"transforms/{slug}.json is for {transform['source']}, not {source}")

bpy.ops.wm.read_factory_settings(use_empty=True)

# Prepared mesh, back in the Blender frame (Z up)
bpy.ops.wm.obj_import(filepath=os.path.join(a.prepared, f"{slug}.obj"), forward_axis='NEGATIVE_Z', up_axis='Y')
low = bpy.context.selected_objects[0]
low.data.transform(low.matrix_world)
low.matrix_world.identity()

# High-res export, placed like prepare_zone.py: world = source_to_world @ glTF import matrix
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=source, merge_vertices=True)
high = next(o for o in bpy.data.objects if o not in before and o.type == 'MESH')
high.data.transform(Matrix(transform["matrix_source_to_world"]) @ high.matrix_world)
high.parent = None
high.matrix_world.identity()
log(f"prepared {len(low.data.polygons):,} faces, high-res {len(high.data.polygons):,} faces")

# Check: distance from high-res vertices to the prepared surface (metres)
low.data.calc_loop_triangles()
tri = np.empty(len(low.data.loop_triangles) * 3, np.int64)
low.data.loop_triangles.foreach_get("vertices", tri)
co = np.empty(len(low.data.vertices) * 3)
low.data.vertices.foreach_get("co", co)
bvh = BVHTree.FromPolygons(co.reshape(-1, 3).tolist(), tri.reshape(-1, 3).tolist())
hco = np.empty(len(high.data.vertices) * 3)
high.data.vertices.foreach_get("co", hco)
hco = hco.reshape(-1, 3)
sample = hco[np.random.default_rng(0).choice(len(hco), 20000, replace=False)]
d = np.array([r[3] if r[0] is not None else np.inf for r in (bvh.find_nearest(Vector(q)) for q in sample)])
d = d[np.isfinite(d)]
gap = dict(median=float(np.median(d)), p95=float(np.quantile(d, 0.95)), p99=float(np.quantile(d, 0.99)))
log(f"gap high-res -> prepared (m): median {gap['median']:.4f}, p95 {gap['p95']:.4f}, p99 {gap['p99']:.4f}")
assert gap["median"] < 0.02, "the two meshes don't match (wrong export, or a deform modifier)"
del bvh, hco

# Bake target: a new non-colour image on the prepared mesh
if not a.size:
    photo = bpy.data.images.load(os.path.join(a.prepared, f"{slug}.jpg"))
    a.size = photo.size[0]
    assert photo.size[0] == photo.size[1], "square photo texture expected"
    bpy.data.images.remove(photo)
image = bpy.data.images.new(f"{slug}-normal", a.size, a.size, float_buffer=False)
image.colorspace_settings.name = 'Non-Color'
mat = bpy.data.materials.new(f"{slug}-relief")
mat.use_nodes = True
tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
tex.image = image
mat.node_tree.nodes.active = tex
low.data.materials.clear()
low.data.materials.append(mat)
# The high-res mesh only provides geometry
high.data.materials.clear()

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
scene.cycles.samples = 1
bake = scene.render.bake
bake.normal_space = 'OBJECT'
# Blender frame (Z up) -> OBJ frame (Y up): x, z, -y
bake.normal_r, bake.normal_g, bake.normal_b = 'POS_X', 'POS_Z', 'NEG_Y'

bpy.ops.object.select_all(action='DESELECT')
high.select_set(True)
low.select_set(True)
bpy.context.view_layer.objects.active = low
# Rays cast from a cage slightly inflated around the prepared mesh, towards the high-res one. From the 95th
# percentile, not the 99th: the high-res export keeps the parts trimmed off the zone (booleans, cleanup), which
# put the 99th percentile at 0.7 m on zone 12 and would project far-away surfaces.
extrusion = a.cage or max(gap["p95"] * 2, 0.03)
log(f"bake {a.size}x{a.size} on {prefs.compute_device_type}, cage {extrusion:.3f} m")
bpy.ops.object.bake(type='NORMAL', use_selected_to_active=True, cage_extrusion=extrusion,
                    max_ray_distance=extrusion * 2, margin=16)
normal_name = f"{slug}-normal.png"
image.filepath_raw = os.path.join(a.out, normal_name)
image.file_format = 'PNG'
image.save()
log(f"normal map: {image.filepath_raw}")

# Copy of the prepared zone with an .mtl that also references the normal map
for ext in (".obj", ".jpg", "-prepare.json", "-fingerprint.json"):
    src = os.path.join(a.prepared, slug + ext)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(a.out, slug + ext))
mtl = open(os.path.join(a.prepared, f"{slug}.mtl"), encoding="utf-8").read().rstrip("\n")
open(os.path.join(a.out, f"{slug}.mtl"), "w", encoding="utf-8").write(mtl + f"\nmap_Bump {normal_name}\n")
log("done")
