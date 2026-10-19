"""Prepares a light test model of a zone for Google Earth (TODO #13): decimated mesh, texture resized, centred.

Reads a prepared zone (prepare_zone.py: <slug>.obj + .jpg, Blender frame in metres, Z up), decimates it to
-t/--triangles, resizes the texture to -s/--size, moves it so that its horizontal centre is at x = y = 0 (z unchanged:
z = 0 stays the lock's reference level), and writes:
  <out>/<slug>-test.glb   for Google Earth on the web (import) and other 3D tools: texture embedded, no compression
  <out>/<slug>-test.obj   + .mtl + .jpg, read by make_kmz.py to build the COLLADA model of the KMZ
  <out>/<slug>-test.json  triangle count, size, offset applied

Usage:
    blender -b --factory-startup --python make_test_model.py -- -z "zone 12" -p O:\\temp\\zone-12\\prox -o O:\\publishing\\downloads\\google-earth-test
"""
import json
import os
import sys

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "publish-model"))
from cli import parser, script_args  # noqa: E402

p = parser("make_test_model.py", __doc__)
p.add_argument("-z", "--zone", required=True, help='zone name, e.g. "zone 12"')
p.add_argument("-p", "--prepared", required=True, help="folder of the prepared zone (<slug>.obj, .jpg)")
p.add_argument("-o", "--out", required=True, help="output folder")
p.add_argument("-t", "--triangles", type=int, default=200_000, help="target triangle count (default 200000)")
p.add_argument("-s", "--size", type=int, default=2048, help="texture size, px (default 2048)")
a = p.parse_args(script_args())
slug = a.zone.replace(" ", "-")
os.makedirs(a.out, exist_ok=True)


def log(msg):
    print(f"[earth] {msg}", flush=True)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=os.path.join(a.prepared, f"{slug}.obj"), forward_axis='NEGATIVE_Z', up_axis='Y')
ob = bpy.context.selected_objects[0]
ob.data.transform(ob.matrix_world)
ob.matrix_world.identity()
bpy.context.view_layer.objects.active = ob
before = len(ob.data.polygons)

# Decimate (collapse keeps the UVs, so the texture still fits)
mod = ob.modifiers.new("decimate", 'DECIMATE')
mod.ratio = min(1.0, a.triangles / max(before, 1))
bpy.ops.object.modifier_apply(modifier=mod.name)
after = len(ob.data.polygons)

# Horizontal centre at the origin; z unchanged
xs = [v.co.x for v in ob.data.vertices]
ys = [v.co.y for v in ob.data.vertices]
zs = [v.co.z for v in ob.data.vertices]
dx, dy = -(min(xs) + max(xs)) / 2, -(min(ys) + max(ys)) / 2
for v in ob.data.vertices:
    v.co.x += dx
    v.co.y += dy
size_m = [max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)]

# Texture resized, saved as JPEG next to the model, plugged into a plain material
tex = bpy.data.images.load(os.path.join(a.prepared, f"{slug}.jpg"))
tex.scale(a.size, a.size)
tex_name = f"{slug}-test.jpg"
tex.filepath_raw = os.path.join(a.out, tex_name)
tex.file_format = 'JPEG'
tex.save(quality=88)
mat = bpy.data.materials.new(f"{slug}-test")
mat.use_nodes = True
node = mat.node_tree.nodes.new("ShaderNodeTexImage")
node.image = tex
bsdf = mat.node_tree.nodes["Principled BSDF"]
mat.node_tree.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 1.0
ob.data.materials.clear()
ob.data.materials.append(mat)

bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True)
glb = os.path.join(a.out, f"{slug}-test.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_image_format='JPEG',
                          export_jpeg_quality=88, export_normals=True, export_draco_mesh_compression_enable=False)
obj = os.path.join(a.out, f"{slug}-test.obj")
bpy.ops.wm.obj_export(filepath=obj, export_selected_objects=True, forward_axis='Y', up_axis='Z', export_normals=False,
                      export_uv=True, export_materials=True, path_mode='STRIP', export_triangulated_mesh=True)

info = dict(zone=a.zone, triangles_before=before, triangles=after, texture_px=a.size, size_m=[round(v, 2) for v in size_m],
            z_min=round(min(zs), 3), offset_xy=[round(dx, 3), round(dy, 3)],
            glb_mb=round(os.path.getsize(glb) / 1e6, 1))
json.dump(info, open(os.path.join(a.out, f"{slug}-test.json"), "w"), indent=2)
log(json.dumps(info))
