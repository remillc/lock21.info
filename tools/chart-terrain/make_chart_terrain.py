"""Builds the terrain from a chart (TODO #73) in a new .blend: the height grid of chart_terrain.py as a mesh.

The mesh is north-up, in metres, its origin the chart's (the green cross by the dive flag: the lock), under an empty
« chart frame » that sets it in the publishing .blend's frame: at the site anchor (-29.05, 21.70) and turned -30°
(the .blend's +Y, the lock's north wall side, is 30° west of true north: make_kmz.py -H). Heights in that frame too:
the water surface at 55 ft (16.764 m) above the lock's reference level (the viewer's SURFACE_Y), the bottom below it.
The empty can be moved to line the chart up with the model.

A new file: the publishing .blend is never opened or changed.

Usage:
    blender -b --factory-startup --python tools/chart-terrain/make_chart_terrain.py -- \\
        [-i O:/temp/chart-terrain/heights.npz] [-o O:/modeles/chart-terrain/lock-21-chart-terrain.blend]
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

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
p = argparse.ArgumentParser(prog="make_chart_terrain.py", description=__doc__.split("\n\n")[0])
p.add_argument("-i", "--input", default="O:/temp/chart-terrain/heights.npz", help="height grid from chart_terrain.py")
p.add_argument("-o", "--out", default="O:/modeles/chart-terrain/lock-21-chart-terrain.blend", help="the new .blend")
a = p.parse_args(argv)

grid = np.load(a.input)
height = grid["height"]
cell = float(grid["cell"])
ox, oy = (float(v) for v in grid["origin"])
rows, cols = height.shape

z = height + SURFACE

# A clean file
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

# Vertices row by row: x east, y north, z up
c, r = np.meshgrid(np.arange(cols), np.arange(rows))
verts = np.column_stack([((c - ox) * cell).ravel(), (-(r - oy) * cell).ravel(), z.ravel()])
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

collection = bpy.data.collections.new("chart terrain")
scene.collection.children.link(collection)
terrain = bpy.data.objects.new("chart terrain", mesh)
frame = bpy.data.objects.new("chart frame", None)
frame.empty_display_type = 'ARROWS'
frame.empty_display_size = 20
frame.location = (ANCHOR[0], ANCHOR[1], 0)
frame.rotation_euler = (0, 0, math.radians(HEADING))
collection.objects.link(frame)
collection.objects.link(terrain)
terrain.parent = frame

# A plain material: sand above, darker with depth (Geometry > Position z through a colour ramp)
mat = bpy.data.materials.new("chart terrain")
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
bsdf = nodes["Principled BSDF"]
geo = nodes.new("ShaderNodeNewGeometry")
sep = nodes.new("ShaderNodeSeparateXYZ")
ramp = nodes.new("ShaderNodeMapRange")
ramp.inputs["From Min"].default_value = SURFACE - 26
ramp.inputs["From Max"].default_value = SURFACE
colours = nodes.new("ShaderNodeValToRGB")
colours.color_ramp.elements[0].color = (0.18, 0.2, 0.16, 1)
colours.color_ramp.elements[1].color = (0.78, 0.72, 0.55, 1)
links.new(geo.outputs["Position"], sep.inputs[0])
links.new(sep.outputs["Z"], ramp.inputs["Value"])
links.new(ramp.outputs["Result"], colours.inputs["Fac"])
links.new(colours.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.9
mesh.materials.append(mat)

# The water surface, for reference (not rendered)
bpy.ops.mesh.primitive_plane_add(size=1)
water = bpy.context.active_object
water.name = "water surface (55 ft)"
water.dimensions = (cols * cell, rows * cell, 0)
water.location = (0, 0, SURFACE)
water.display_type = 'WIRE'
water.hide_render = True
for col in water.users_collection:
    col.objects.unlink(water)
collection.objects.link(water)
water.parent = frame
water.location = ((cols / 2 - ox) * cell, -(rows / 2 - oy) * cell, SURFACE)

os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=a.out)
print(f"[chart] {rows} x {cols} cells of {cell} m, {len(verts):,} vertices, z {verts[:, 2].min():.1f} to "
      f"{verts[:, 2].max():.1f} m -> {a.out}", flush=True)
