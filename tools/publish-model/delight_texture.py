"""Removes the lamp bands from a zone's texture (de-lighting, level 1: large-scale brightness only).

The photo textures carry the divers' lamp falloff: light and dark bands along the passes, hot spots. This
script measures the texture's brightness at each vertex of the prepared mesh, averages it over the surrounding
surface (-r/--radius, in 3D: the texture is an atlas, neighbouring pixels are often far apart on the model),
and divides the texture by that slow variation, towards the zone's average brightness. Fine detail, small
shadows (between mussels, in the joints) and colours are kept.

-s/--strength sets how much of the variation is removed (0 nothing, 1 all): large real differences
(pale sediment next to dark wood) are flattened too at 1.

Steps: Blender bakes the correction factor into a small image laid out like the texture (<slug>-shade.json and
.u16); apply_shade.mjs (Node, sharp) multiplies the full-size texture by it, in linear light. The prepared zone
(.obj, .mtl, normal map...) is copied to the output folder with the corrected texture.

Usage:
    blender -b --factory-startup --python delight_texture.py -- -z "zone 12" -p O:\\temp\\zone-12\\relief -o O:\\temp\\zone-12\\delit
"""
import json
import os
import shutil
import subprocess
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cli import parser, script_args  # noqa: E402

p = parser("delight_texture.py", __doc__)
p.add_argument("-z", "--zone", required=True, help='zone name, e.g. "zone 12"')
p.add_argument("-p", "--prepared", required=True, help="folder of the prepared zone (<slug>.obj, .mtl, .jpg)")
p.add_argument("-o", "--out", required=True, help="output folder (prepared zone with the corrected texture)")
p.add_argument("-r", "--radius", type=float, default=1.0, help="averaging radius, m (default 1.0)")
p.add_argument("-s", "--strength", type=float, default=0.8, help="share of the variation removed, 0 to 1 (default 0.8)")
p.add_argument("--shade-size", type=int, default=4096, help="size of the baked correction image, px (default 4096)")
a = p.parse_args(script_args())
slug = a.zone.replace(" ", "-")
assert os.path.abspath(a.out) != os.path.abspath(a.prepared), "the output folder must differ from the prepared one"
os.makedirs(a.out, exist_ok=True)
here = os.path.dirname(os.path.abspath(__file__))


def log(msg):
    print(f"[delight] {msg}", flush=True)


def to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=os.path.join(a.prepared, f"{slug}.obj"), forward_axis='NEGATIVE_Z', up_axis='Y')
ob = bpy.context.selected_objects[0]
ob.data.transform(ob.matrix_world)
ob.matrix_world.identity()
me = ob.data
nv = len(me.vertices)
log(f"{len(me.polygons):,} faces, {nv:,} vertices")

# 1. Brightness of the texture at each vertex: luminance (linear light) of a 2048 px copy, read at the UVs of
# each face corner, averaged per vertex
tex = bpy.data.images.load(os.path.join(a.prepared, f"{slug}.jpg"))
tex.scale(2048, 2048)
w, h = tex.size
px = np.empty(w * h * 4, np.float32)
tex.pixels.foreach_get(px)
px = to_linear(px.reshape(h, w, 4)[:, :, :3])
luma = px @ np.array([0.2126, 0.7152, 0.0722], np.float32)
uv = np.empty(len(me.loops) * 2, np.float32)
me.uv_layers.active.data.foreach_get("uv", uv)
uv = uv.reshape(-1, 2)
x = np.clip((uv[:, 0] * w).astype(int), 0, w - 1)
y = np.clip((uv[:, 1] * h).astype(int), 0, h - 1)  # Blender pixels: row 0 at the bottom, like UV v=0
loop_luma = luma[y, x]
loop_vert = np.empty(len(me.loops), np.int64)
me.loops.foreach_get("vertex_index", loop_vert)
vert_luma = np.bincount(loop_vert, loop_luma, nv) / np.maximum(np.bincount(loop_vert, minlength=nv), 1)
co = np.empty(nv * 3, np.float64)
me.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)

# 2. Slow variation: average over the surrounding surface. Vertices binned into voxels (radius / 3), sums and
# counts blurred with three box passes (close to a Gaussian of the given radius), read back trilinearly
voxel = a.radius / 3
lo = co.min(0) - 2 * a.radius
idx = (co - lo) / voxel
dims = np.ceil(idx.max(0)).astype(int) + 4
sums = np.zeros(dims)
counts = np.zeros(dims)
cell = np.floor(idx).astype(int)
np.add.at(sums, tuple(cell.T), vert_luma)
np.add.at(counts, tuple(cell.T), 1)


def box(g, size=3):
    for axis in range(3):
        acc = np.zeros_like(g)
        for d in range(-(size // 2), size // 2 + 1):
            acc += np.roll(g, d, axis)
        g = acc
    return g


for _ in range(3):
    sums, counts = box(sums), box(counts)
smooth = np.where(counts > 0, sums / np.maximum(counts, 1e-9), 0)


def trilinear(grid, pts):
    i0 = np.floor(pts).astype(int)
    f = pts - i0
    out = np.zeros(len(pts))
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                wgt = (f[:, 0] if dx else 1 - f[:, 0]) * (f[:, 1] if dy else 1 - f[:, 1]) * (f[:, 2] if dz else 1 - f[:, 2])
                out += wgt * grid[i0[:, 0] + dx, i0[:, 1] + dy, i0[:, 2] + dz]
    return out


slow = trilinear(smooth, idx - 0.5)
target = float(np.median(vert_luma))
factor = np.clip((target / np.maximum(slow, 1e-4)) ** a.strength, 0.4, 2.5)
log(f"brightness: median {target:.3f}; factor p5 {np.quantile(factor, 0.05):.2f}, p95 {np.quantile(factor, 0.95):.2f}")

# 3. Bake the factor (vertex attribute, emission) into an image laid out like the texture
attr = me.color_attributes.new("shade", 'FLOAT_COLOR', 'POINT')
rgba = np.repeat(factor[:, None], 4, 1).astype(np.float32)
rgba[:, 3] = 1
attr.data.foreach_set("color", rgba.ravel())
mat = bpy.data.materials.new("shade")
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
for n in list(nodes):
    nodes.remove(n)
attr_node = nodes.new("ShaderNodeAttribute")
attr_node.attribute_name = "shade"
emission = nodes.new("ShaderNodeEmission")
out = nodes.new("ShaderNodeOutputMaterial")
links.new(attr_node.outputs["Color"], emission.inputs["Color"])
links.new(emission.outputs["Emission"], out.inputs["Surface"])
image = bpy.data.images.new("shade", a.shade_size, a.shade_size, float_buffer=True)
image.colorspace_settings.name = 'Non-Color'
target_node = nodes.new("ShaderNodeTexImage")
target_node.image = image
nodes.active = target_node
me.materials.clear()
me.materials.append(mat)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True)
bpy.context.view_layer.objects.active = ob
bpy.ops.object.bake(type='EMIT', margin=16)
shade = np.empty(a.shade_size * a.shade_size * 4, np.float32)
image.pixels.foreach_get(shade)
shade = shade.reshape(a.shade_size, a.shade_size, 4)[::-1, :, 0]  # top row first, like image files
shade = np.where(shade > 0, shade, 1.0)  # outside the faces: unchanged
shade_path = os.path.join(a.out, f"{slug}-shade.u16")
(np.clip(shade, 0, 3.99) * 16384).astype("<u2").tofile(shade_path)
json.dump(dict(width=a.shade_size, height=a.shade_size, scale=16384, radius_m=a.radius, strength=a.strength,
               median_luma=target), open(os.path.join(a.out, f"{slug}-shade.json"), "w"), indent=2)

# 4. Copy of the prepared zone, then the corrected texture
for name in os.listdir(a.prepared):
    if name.startswith(slug) and not name.endswith(".jpg"):
        shutil.copy2(os.path.join(a.prepared, name), os.path.join(a.out, name))
subprocess.run(["node", os.path.join(here, "apply_shade.mjs"), os.path.join(a.prepared, f"{slug}.jpg"), shade_path,
                os.path.join(a.out, f"{slug}.jpg")], check=True)
log("done")
