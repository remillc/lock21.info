"""Bakes the relief of a zone's high-res export (zebra mussels, joints) into a normal map for its prepared mesh.

The prepared mesh (prepare_zone.py: <zone>.obj, a few cm per edge) loses the 1 to 3 cm relief of the mussels;
the high-res Metashape export (about 7 mm per edge) still has it. Cycles casts rays from the prepared mesh to
the high-res one and writes the high-res surface normal into a texture laid out on the prepared mesh's UVs.

Object-space normals, expressed in the OBJ frame (Y up, as written by prepare_zone.py and read by Obj2Tiles):
the viewer needs neither vertex normals nor tangents, which the tiles don't carry.

The high-res export is placed like prepare_zone.py places the zone's `source` (transforms/<zone>.json, cached
registration): either the source itself, or (--high) a geometry-only export from the same Metashape chunk, which
shares its frame. The zone's deform modifiers (Lattice, zone 4), recorded by prepare_zone.py, are applied the same
way: the zone object is appended from the .blend (read only, never saved) with its lattice, its modifiers copied onto
the high-res mesh and applied; a Lattice deforms by world position, so the result matches the prepared mesh. The gap
check stops the bake if they don't match.

Writes <out>/<slug>-normal.png and a copy of the .obj/.jpg with an .mtl that references it (map_Bump), ready
for tile_zone.ps1.

Usage:
    blender -b --factory-startup --python bake_relief.py -- -z "zone 12" -p O:\\publishing\\prepared\\zone-12 -o O:\\temp\\zone-12\\relief [-s <px>]
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
p.add_argument("--source", help="the zone's source export (default: the one recorded in <slug>-prepare.json)")
p.add_argument("--high", help="high-res geometry export from the SAME Metashape chunk as the source (same frame), when the "
               "source is too coarse for the relief; placed with the source's registration (default: the source itself)")
p.add_argument("-b", "--blend", default="O:/modeles/lock-21/lock-21-publishing.blend",
               help="the publishing .blend, read for the zone's deform modifiers (default: O:/modeles/lock-21/lock-21-publishing.blend)")
a = p.parse_args(script_args())
slug = a.zone.replace(" ", "-")
os.makedirs(a.out, exist_ok=True)


def log(msg):
    print(f"[relief] {msg}", flush=True)


report = json.load(open(os.path.join(a.prepared, f"{slug}-prepare.json"), encoding="utf-8"))
source = a.source or report["source"]
high_path = a.high or source
deform = report["steps"]["deform"]["modifiers"]
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

# High-res export, placed like prepare_zone.py: world = zone matrix_world @ source_to_local @ glTF import matrix.
# The zone's matrix_world is the one recorded when the zone was prepared (fingerprint), not the registration cache's
# matrix_source_to_world: that one keeps the zone's position at registration time, stale once the zone is moved.
state = json.load(open(os.path.join(a.prepared, f"{slug}-fingerprint.json"), encoding="utf-8"))["state"]
zone_world = Matrix([state["matrix_world"][i:i + 4] for i in range(0, 16, 4)])
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=high_path, merge_vertices=True)
high = next(o for o in bpy.data.objects if o not in before and o.type == 'MESH')
high.data.transform(zone_world @ Matrix(transform["matrix_source_to_blender_local"]) @ high.matrix_world)
high.parent = None
high.matrix_world.identity()
log(f"prepared {len(low.data.polygons):,} faces, high-res {len(high.data.polygons):,} faces")

# Deform modifiers (prepare_zone.py step 3): copied from the zone object in the .blend, in order, then applied
if deform:
    with bpy.data.libraries.load(a.blend, link=False) as (src, dst):
        dst.objects = [a.zone]
    zone_ob = dst.objects[0]
    copied = []
    for m in zone_ob.modifiers:
        # Those enabled for render, as prepare_zone.py (blend_state.follow_render_visibility)
        if m.type == 'BOOLEAN' or not m.show_render:
            continue
        n = high.modifiers.new(m.name, m.type)
        for prop in m.bl_rna.properties:
            if not prop.is_readonly and prop.identifier not in ("name", "type"):
                try:
                    setattr(n, prop.identifier, getattr(m, prop.identifier))
                except (AttributeError, TypeError):
                    pass
        # The lattice must be in the scene to be evaluated
        target = getattr(m, "object", None)
        if target and target.name not in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.link(target)
        copied.append(f"{m.type}:{m.name}")
    assert copied == deform, f"the .blend's deform modifiers {copied} differ from the prepared zone's {deform}: republish first"
    bpy.ops.object.select_all(action='DESELECT')
    high.select_set(True)
    bpy.context.view_layer.objects.active = high
    for n in list(high.modifiers):
        bpy.ops.object.modifier_apply(modifier=n.name)
    # Only the two meshes take part in the bake
    for ob in list(bpy.context.scene.collection.objects):
        if ob not in (low, high):
            bpy.context.scene.collection.objects.unlink(ob)
    log(f"deform modifiers applied: {copied}")

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
# The surface the zone kept: the high-res export also holds the parts trimmed off the zone (booleans, cleanup),
# metres away, which put the 95th percentile at 1 to 2 m on zones 2, 3 and 10
kept = d[d < 0.10]
gap["kept_p95"] = float(np.quantile(kept, 0.95)) if len(kept) else gap["median"]
log(f"gap high-res -> prepared (m): median {gap['median']:.4f}, p95 {gap['p95']:.4f}, p99 {gap['p99']:.4f}, "
    f"p95 of the kept surface {gap['kept_p95']:.4f} ({len(kept) / len(d):.0%} of the samples)")
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
# Rays cast from a cage slightly inflated around the prepared mesh, towards the high-res one: twice the gap of the
# kept surface (min 3 cm). A cage sized on the whole export (trimmed parts included) reached 3.9 m on zone 10 and
# would project surfaces metres away.
extrusion = a.cage or max(gap["kept_p95"] * 2, 0.03)
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
