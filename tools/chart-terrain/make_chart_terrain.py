"""Builds the terrain from a chart (TODO #73) in the publishing .blend: the height grid of chart_terrain.py as a mesh.

Run on the publishing .blend (Christian, 2026-10-25: the chart terrain lives in it, no separate file), it replaces the
collection « chart terrain » (local, or linked as it once was: the link's library is removed) and saves a copy (-o), to
put in place of the .blend with Blender closed (a direct save fails: « Cannot change old file »).

The mesh is north-up, in metres, its origin the chart's (the green cross by the dive flag: the lock), under an empty
« chart frame » that sets it in the .blend's frame: at the site anchor (-29.05, 21.70) and turned -30° (the .blend's
+Y, the lock's north wall side, is 30° west of true north: make_kmz.py -H). Heights in that frame too: the water
surface at 55 ft (16.764 m) above the lock's reference level (the viewer's SURFACE_Y), the bottom below it.

Its material: a copy of « terrain - SOS (riprap on the banks) » (Christian, 2026-10-25), its UV map the same as that
terrain's (the position in the .blend over 1.5 m: the textures continue from one to the other), green where the ground
is out of the water.

Usage:
    blender -b modeles/lock-21-publishing.blend --factory-startup --python tools/chart-terrain/make_chart_terrain.py -- \\
        [-i O:/temp/chart-terrain/heights.npz] [-o O:/temp/lock-21-publishing-chart.blend]
    then, Blender closed: move the copy over modeles/lock-21-publishing.blend
"""
import argparse
import math
import os
import sys

import bpy
import numpy as np

SURFACE = 55 * 0.3048
ANCHOR = (-29.05, 21.70)
HEADING = -30.0
RIPRAP = "terrain - SOS (riprap on the banks)"
UV_SCALE = 1 / 1.5  # the SOS terrain's UV map: its position over 1.5 m
LAND_GREEN = (0.22, 0.38, 0.12, 1.0)
CHART_LIBRARY = "lock-21-chart-terrain.blend"

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
p = argparse.ArgumentParser(prog="make_chart_terrain.py", description=__doc__.split("\n\n")[0])
p.add_argument("-i", "--input", default="O:/temp/chart-terrain/heights.npz", help="height grid from chart_terrain.py")
p.add_argument("-o", "--out", default="O:/temp/lock-21-publishing-chart.blend",
               help="the copy of the .blend, to move in place (default O:/temp/lock-21-publishing-chart.blend)")
a = p.parse_args(argv)
if not bpy.data.filepath:
    sys.exit("make_chart_terrain.py: run it on the publishing .blend (blender -b modeles/lock-21-publishing.blend ...)")

grid = np.load(a.input)
height = grid["height"]
cell = float(grid["cell"])
ox, oy = (float(v) for v in grid["origin"])
rows, cols = height.shape
z = height + SURFACE

# The former chart terrain: its collection and objects, local or linked, and the link's library
old = bpy.data.collections.get("chart terrain")
if old:
    for ob in list(old.all_objects):
        if ob.library is None:
            bpy.data.objects.remove(ob)
    for parent in [bpy.context.scene.collection, *bpy.data.collections]:
        if old.name in parent.children:
            parent.children.unlink(old)
    if old.library is None:
        bpy.data.collections.remove(old)
for library in list(bpy.data.libraries):
    if os.path.basename(library.filepath) == CHART_LIBRARY:
        bpy.data.libraries.remove(library)
for name in ("chart terrain", "water surface (55 ft)"):
    for mesh in [m for m in bpy.data.meshes if m.name.startswith(name) and m.users == 0 and m.library is None]:
        bpy.data.meshes.remove(mesh)
scene = bpy.context.scene

# Vertices row by row: x east, y north, z up
c, r = np.meshgrid(np.arange(cols), np.arange(rows))
lx, ly = ((c - ox) * cell).ravel(), (-(r - oy) * cell).ravel()
verts = np.column_stack([lx, ly, z.ravel()])
i = (r[:-1, :-1] * cols + c[:-1, :-1]).ravel()
faces = np.column_stack([i, i + cols, i + cols + 1, i + 1])
mesh = bpy.data.meshes.new("chart terrain")
mesh.vertices.add(len(verts))
mesh.vertices.foreach_set("co", verts.astype(np.float32).ravel())
mesh.loops.add(faces.size)
mesh.loops.foreach_set("vertex_index", faces.astype(np.int32).ravel())
mesh.polygons.add(len(faces))
mesh.polygons.foreach_set("loop_start", (np.arange(len(faces)) * 4).astype(np.int32))
mesh.polygons.foreach_set("loop_total", np.full(len(faces), 4, np.int32))
mesh.update()
mesh.validate()
mesh.shade_smooth()

# The UV map of the SOS terrain: the position in the .blend's frame over 1.5 m
angle = math.radians(HEADING)
wx = ANCHOR[0] + lx * math.cos(angle) - ly * math.sin(angle)
wy = ANCHOR[1] + lx * math.sin(angle) + ly * math.cos(angle)
uv_vert = np.column_stack([wx, wy]) * UV_SCALE
uv = mesh.uv_layers.new(name="UVMap")
uv.data.foreach_set("uv", uv_vert[faces.ravel()].astype(np.float32).ravel())

collection = bpy.data.collections.new("chart terrain")
scene.collection.children.link(collection)
terrain = bpy.data.objects.new("chart terrain", mesh)
frame = bpy.data.objects.new("chart frame", None)
frame.empty_display_type = 'ARROWS'
frame.empty_display_size = 20
frame.location = (ANCHOR[0], ANCHOR[1], 0)
frame.rotation_euler = (0, 0, angle)
collection.objects.link(frame)
collection.objects.link(terrain)
terrain.parent = frame

# The material: the SOS terrain's riprap, green out of the water (a smooth step over the waterline)
mat = bpy.data.materials.get("chart terrain")
if mat is None:
    riprap = bpy.data.materials.get(RIPRAP)
    if riprap is None:
        sys.exit(f"make_chart_terrain.py: no material « {RIPRAP} » in this .blend")
    mat = riprap.copy()
    mat.name = "chart terrain"
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    colour_in = bsdf.inputs["Base Color"].links[0].from_socket
    geo = nodes.new("ShaderNodeNewGeometry")
    sep = nodes.new("ShaderNodeSeparateXYZ")
    shore = nodes.new("ShaderNodeMapRange")
    shore.interpolation_type = 'SMOOTHSTEP'
    shore.inputs["From Min"].default_value = SURFACE - 0.05
    shore.inputs["From Max"].default_value = SURFACE + 0.4
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs["B"].default_value = LAND_GREEN
    mix.label = "green out of the water"
    links.new(geo.outputs["Position"], sep.inputs[0])
    links.new(sep.outputs["Z"], shore.inputs["Value"])
    links.new(shore.outputs["Result"], mix.inputs["Factor"])
    links.new(colour_in, mix.inputs["A"])
    links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
mesh.materials.append(mat)

# The water surface, for reference (not rendered)
water_mesh = bpy.data.meshes.new("water surface (55 ft)")
half_x, half_y = cols * cell / 2, rows * cell / 2
water_mesh.from_pydata([(-half_x, -half_y, 0), (half_x, -half_y, 0), (half_x, half_y, 0), (-half_x, half_y, 0)], [],
                       [(0, 1, 2, 3)])
water = bpy.data.objects.new("water surface (55 ft)", water_mesh)
water.display_type = 'WIRE'
water.hide_render = True
collection.objects.link(water)
water.parent = frame
water.location = ((cols / 2 - ox) * cell, -(rows / 2 - oy) * cell, SURFACE)

os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=a.out, copy=True, relative_remap=False)
print(f"[chart] {rows} x {cols} cells of {cell} m, {len(verts):,} vertices, z {verts[:, 2].min():.1f} to "
      f"{verts[:, 2].max():.1f} m, material « {mat.name} » -> {a.out}", flush=True)
