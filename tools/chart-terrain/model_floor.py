"""The model's floor under the chart terrain's grid (TODO #73): read-only, from the publishing .blend.

For each point of the height grid of chart_terrain.py, set in the .blend by the « chart frame » empty (linked from the
chart terrain's .blend: its place and turn, overrides included), rays down from above meet the published model, as
rendered (modifiers applied, Show in Render only), in two kinds of parts:
- the zones (« zone N » objects, the boolean cutters excluded), scanned open surfaces: their lowest surface facing up
  (floor_zones), which the ground meets from below;
- the solids, the context's walls and fillers (blend_state.context_objects) and the mockups: their top (solid_top), which
  the ground never rises above.
« terrain - SOS data » is left out: the chart terrain replaces it. None: NaN.

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
visible = lambda o: o.type == 'MESH' and not o.hide_render and all(not c.hide_render for c in o.users_collection)
# Not the coarse terrain the chart terrain replaces (Christian hides it, 2026-10-25: the chart terrain kept below it
# left gaps against the zones)
REPLACED = {"terrain - SOS data"}
# Two kinds of parts (Christian, 2026-10-25): the zones, scanned open surfaces, that the ground meets from below (their
# lowest surface facing up); the solids, the context's walls, the fillers and the mockups (boxes), that the ground may
# run into unseen but never rise above (their top; following their lowest faces made hollows, their tops plateaus)
zones = [o for o in bpy.data.objects if re.match(r"^zone \d+", o.name) and visible(o)]
mockups = bpy.data.collections.get("mockups")
solids = [o for o in context_objects() + ([o for o in mockups.all_objects] if mockups else [])
          if visible(o) and o.name not in REPLACED]


def trees_of(objects):
    trees = []
    for ob in objects:
        evaluated = ob.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        world = evaluated.matrix_world
        trees.append(BVHTree.FromPolygons([world @ v.co for v in mesh.vertices], [tuple(f.vertices) for f in mesh.polygons]))
        evaluated.to_mesh_clear()
    return trees


zone_trees, solid_trees = trees_of(zones), trees_of(solids)
print(f"[floor] zones: {', '.join(o.name for o in zones)}; solids: {', '.join(o.name for o in solids)}", flush=True)

TOP = 80.0
down = Vector((0, 0, -1))
floor_zones = np.full((rows, cols), np.nan, np.float32)
solid_top = np.full((rows, cols), np.nan, np.float32)
for r in range(rows):
    for c in range(cols):
        at = to_world @ Vector(((c - ox) * cell, -(r - oy) * cell, 0))
        origin = Vector((at.x, at.y, TOP))
        # The zones' lowest surface facing up: the ray goes on through every surface (the first one met can be the top
        # of a wall; a face turned down, under a wall, is no floor)
        low = None
        for tree in zone_trees:
            start = origin.copy()
            while True:
                hit = tree.ray_cast(start, down)
                if hit[0] is None:
                    break
                if hit[1].z > 0.2 and (low is None or hit[0].z < low):
                    low = hit[0].z
                start = hit[0] + down * 1e-3
        if low is not None:
            floor_zones[r, c] = low
        # The solids' top: the first surface met
        top = None
        for tree in solid_trees:
            hit = tree.ray_cast(origin, down)
            if hit[0] is not None and (top is None or hit[0].z > top):
                top = hit[0].z
        if top is not None:
            solid_top[r, c] = top
np.savez_compressed(a.out, floor_zones=floor_zones, solid_top=solid_top)
print(f"[floor] {int(np.isfinite(floor_zones).sum()):,} grid points under the zones, {int(np.isfinite(solid_top).sum()):,} "
      f"under the solids -> {a.out}", flush=True)
