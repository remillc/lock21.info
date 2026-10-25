"""Fits the chart terrain's mesh to the model in the publishing .blend, keeping hand edits (TODO #73).

Christian edits the chart terrain by hand in the publishing .blend (2026-10-25): it is no longer rebuilt from the
chart, only corrected where it meets the model. Two runs on the publishing .blend, with fit_terrain.py between them:

  --measure  (read-only) for each vertex of « chart terrain »: its position in the .blend, and under or over it in
             the model, as rendered (modifiers applied, Show in Render only): the zones' lowest surface facing up and
             their top (« zone N » objects), the solids' top (the context's walls and fillers, the mockups);
             « terrain - SOS data » left out (the chart terrain replaces it)                -> -d (an .npz)
  --apply    the heights computed by fit_terrain.py (-f), written into the mesh; a copy of the .blend saved (-o), to
             move in place of the .blend with Blender closed (a direct save fails: « Cannot change old file »)

The mesh must still be the grid make_chart_terrain.py built (one vertex per grid point, in its order; edits move them
up or down). The .blend itself is never saved.

Usage:
    blender -b modeles/lock-21-publishing.blend --factory-startup --python tools/chart-terrain/fit_mesh.py -- --measure
    python tools/chart-terrain/fit_terrain.py
    blender -b modeles/lock-21-publishing.blend --factory-startup --python tools/chart-terrain/fit_mesh.py -- --apply
    then, Blender closed: move O:/temp/lock-21-publishing-chart.blend over modeles/lock-21-publishing.blend
"""
import argparse
import os
import re
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "publish-model"))
from blend_state import context_objects  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
p = argparse.ArgumentParser(prog="fit_mesh.py", description=__doc__.split("\n\n")[0])
mode = p.add_mutually_exclusive_group(required=True)
mode.add_argument("-m", "--measure", action="store_true", help="measure the mesh and the model (read-only)")
mode.add_argument("-a", "--apply", action="store_true", help="write the fitted heights into the mesh, save a copy")
p.add_argument("-d", "--data", default="O:/temp/chart-terrain/mesh-model.npz", help="the measures (--measure writes it)")
p.add_argument("-f", "--fitted", default="O:/temp/chart-terrain/mesh-fitted.npz", help="the fitted heights (fit_terrain.py)")
p.add_argument("-o", "--out", default="O:/temp/lock-21-publishing-chart.blend", help="the copy of the .blend (--apply)")
a = p.parse_args(argv)

terrain = bpy.data.objects["chart terrain"]
mesh = terrain.data
world = terrain.matrix_world
local = np.empty(len(mesh.vertices) * 3, np.float32)
mesh.vertices.foreach_get("co", local)
local = local.reshape(-1, 3)
# The grid, from the vertices' order (make_chart_terrain.py wrote them row by row; hand edits move some of them, up,
# down and sideways, but keep their order): a row ends where x goes back
cols = int(np.argmax(np.diff(local[:, 0]) < 0)) + 1
rows = len(local) // cols
if cols < 2 or rows * cols != len(local):
    sys.exit("fit_mesh.py: « chart terrain » is no longer the grid make_chart_terrain.py built (vertices added or removed)")
xs = local[:cols, 0]

if a.measure:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    visible = lambda o: o.type == 'MESH' and not o.hide_render and all(not c.hide_render for c in o.users_collection)
    zones = [o for o in bpy.data.objects if re.match(r"^zone \d+", o.name) and visible(o)]
    mockups = bpy.data.collections.get("mockups")
    solids = [o for o in context_objects() + (list(mockups.all_objects) if mockups else [])
              if visible(o) and o.name != "terrain - SOS data"]

    def trees_of(objects):
        trees = []
        for ob in objects:
            evaluated = ob.evaluated_get(depsgraph)
            m = evaluated.to_mesh()
            w = evaluated.matrix_world
            trees.append(BVHTree.FromPolygons([w @ v.co for v in m.vertices], [tuple(f.vertices) for f in m.polygons]))
            evaluated.to_mesh_clear()
        return trees

    zone_trees, solid_trees = trees_of(zones), trees_of(solids)
    down = Vector((0, 0, -1))
    n = len(local)
    pos = np.empty((n, 3), np.float32)
    zone_low = np.full(n, np.nan, np.float32)
    zone_top = np.full(n, np.nan, np.float32)
    solid_top = np.full(n, np.nan, np.float32)
    for k in range(n):
        at = world @ Vector(local[k])
        pos[k] = at
        origin = Vector((at.x, at.y, 80.0))
        low = top = None
        for tree in zone_trees:
            start = origin.copy()
            first = True
            while True:
                hit = tree.ray_cast(start, down)
                if hit[0] is None:
                    break
                if first and (top is None or hit[0].z > top):
                    top = hit[0].z
                first = False
                if hit[1].z > 0.2 and (low is None or hit[0].z < low):
                    low = hit[0].z
                start = hit[0] + down * 1e-3
        if low is not None:
            zone_low[k] = low
        if top is not None:
            zone_top[k] = top
        stop = None
        for tree in solid_trees:
            hit = tree.ray_cast(origin, down)
            if hit[0] is not None and (stop is None or hit[0].z > stop):
                stop = hit[0].z
        if stop is not None:
            solid_top[k] = stop
    cell = float(abs(xs[1] - xs[0]))
    np.savez_compressed(a.data, rows=rows, cols=cols, cell=cell, pos=pos.reshape(rows, cols, 3),
                        zone_low=zone_low.reshape(rows, cols), zone_top=zone_top.reshape(rows, cols),
                        solid_top=solid_top.reshape(rows, cols))
    print(f"[fit] {rows} x {cols} vertices ({cell} m): {int(np.isfinite(zone_low).sum()):,} under the zones, "
          f"{int(np.isfinite(solid_top).sum()):,} under the solids -> {a.data}", flush=True)
else:
    fitted = np.load(a.fitted)
    z_world = fitted["z"].reshape(-1)
    if len(z_world) != len(local):
        sys.exit("fit_mesh.py: the fitted heights are for another mesh (measure again)")
    # World z back to the mesh's own (its parent only turns it about z and moves it in x and y)
    inverse = world.inverted()
    pos = fitted["pos"].reshape(-1, 3)
    new_local = np.array([inverse @ Vector((x, y, z)) for (x, y, _), z in zip(pos, z_world)], np.float32)
    changed = int((np.abs(new_local[:, 2] - local[:, 2]) > 1e-4).sum())
    mesh.vertices.foreach_set("co", new_local.ravel())
    mesh.update()
    bpy.ops.wm.save_as_mainfile(filepath=a.out, copy=True, relative_remap=False)
    print(f"[fit] {changed:,} of {len(local):,} vertices moved -> {a.out}", flush=True)
