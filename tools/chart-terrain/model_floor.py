"""The model's floor under the chart terrain's grid (TODO #73): read-only, from the publishing .blend.

For each point of the height grid of chart_terrain.py, set in the .blend by the « chart frame » empty (linked from the
chart terrain's .blend: its place and turn, overrides included), a ray down from above meets the published model: the
zones (« zone N » objects, the boolean cutters excluded) and the context (blend_state.context_objects: the `terrain`
collection and the fillers) and the mockups, as rendered (modifiers applied, Show in Render only). The lowest surface
met is the floor there (the first could be a wall's top); none: NaN. make_chart_terrain.py keeps the chart terrain below it.

The .blend is never saved.

Usage:
    blender -b modeles/lock-21-publishing.blend --factory-startup --python tools/chart-terrain/model_floor.py -- \\
        [-i O:/temp/chart-terrain/heights.npz] [-o O:/temp/chart-terrain/floor.npz]
"""
import argparse
import os
import re
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "publish-model"))
from blend_state import context_objects  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
p = argparse.ArgumentParser(prog="model_floor.py", description=__doc__.split("\n\n")[0])
p.add_argument("-i", "--input", default="O:/temp/chart-terrain/heights.npz", help="height grid from chart_terrain.py")
p.add_argument("-o", "--out", default="O:/temp/chart-terrain/floor.npz", help="the floor's heights on that grid")
a = p.parse_args(argv)

grid = np.load(a.input)
rows, cols = grid["height"].shape
cell = float(grid["cell"])
ox, oy = (float(v) for v in grid["origin"])

frame = bpy.data.objects.get("chart frame")
to_world = frame.matrix_world.copy() if frame else Matrix.Translation((-29.05, 21.70, 0)) @ Matrix.Rotation(-0.5236, 4, 'Z')

depsgraph = bpy.context.evaluated_depsgraph_get()
mockups = bpy.data.collections.get("mockups")
model = ([o for o in bpy.data.objects if o.type == 'MESH' and re.match(r"^zone \d+", o.name)] + context_objects()
         + ([o for o in mockups.all_objects if o.type == 'MESH'] if mockups else []))
model = [o for o in model if not o.hide_render and all(not c.hide_render for c in o.users_collection)]
trees = []
for ob in model:
    evaluated = ob.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    world = evaluated.matrix_world
    verts = [world @ v.co for v in mesh.vertices]
    trees.append(BVHTree.FromPolygons(verts, [tuple(f.vertices) for f in mesh.polygons]))
    evaluated.to_mesh_clear()
print(f"[floor] {len(model)} objects: {', '.join(o.name for o in model)}", flush=True)

TOP = 80.0
down = Vector((0, 0, -1))
floor = np.full((rows, cols), np.nan, np.float32)
for r in range(rows):
    for c in range(cols):
        at = to_world @ Vector(((c - ox) * cell, -(r - oy) * cell, 0))
        origin = Vector((at.x, at.y, TOP))
        # The lowest surface under the point: the ray goes on through every surface (the first one met can be the top
        # of a wall: the terrain then rose beside the walls in teeth, Christian, 2026-10-25)
        best = None
        for tree in trees:
            start = origin.copy()
            while True:
                hit = tree.ray_cast(start, down)
                if hit[0] is None:
                    break
                if best is None or hit[0].z < best:
                    best = hit[0].z
                start = hit[0] + down * 1e-3
        if best is not None:
            floor[r, c] = best
np.savez_compressed(a.out, floor=floor)
print(f"[floor] {int(np.isfinite(floor).sum()):,} of {rows * cols:,} grid points over the model -> {a.out}", flush=True)
