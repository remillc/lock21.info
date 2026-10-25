"""The site as a grid of solid and water cells, for the river's flow around the lock (solve_flow.py, then the viewer's
particles: viewer/src/underwater.js). Headless Blender.

The geometry: the whole model as downloaded (make_model.py: the zones, the walls, the fillers and the chart terrain,
decimated, its origin at the site anchor) and the mockups of the zones not yet surveyed (the viewer's mockups.glb,
already in the viewer's axes; those of zones online are left out, as the viewer hides them). A cell is solid if a
surface passes within SHELL of its centre (the photogrammetry's walls are skins, not volumes) or if it lies under every
surface of its column (the ground). The grid is in the viewer's axes: x east, y up, z south (the .blend's -y).

Usage:
    blender -b --factory-startup --python tools/flow/voxelize_flow.py -- -o O:/temp/flow/solid.npz
"""
import argparse
import json
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
p = argparse.ArgumentParser(prog="voxelize_flow.py", description=__doc__.split("\n\n")[0])
p.add_argument("-o", "--out", required=True, help="the grid (.npz)")
p.add_argument("-m", "--model", default=r"O:\publishing\downloads\google-earth\t700k\lock-21.glb",
               help="the whole model (make_model.py's GLB)")
p.add_argument("--tiles-root", default=r"O:\publishing\tiles", help="local tiles: the mockups and the zones online")
p.add_argument("-c", "--cell", type=float, default=0.6, help="cell size, m (default 0.6)")
p.add_argument("--min", default="-100,-2,-48", help="the grid's corner, viewer axes x,y,z (default -100,-2,-48)")
p.add_argument("--max", default="15,16.8,18", help="the opposite corner (default 15,16.8,18: y up to the water surface)")
a = p.parse_args(argv)

# The model's origin: the site anchor (make_model.py SITE_ANCHOR, the .blend's x, y), at the .blend's z 0
SITE_ANCHOR = (-29.05, 21.70)
SHELL = 0.5 * a.cell

bpy.ops.wm.read_factory_settings(use_empty=True)


def imported(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']


# Blender imports glTF's (x, y up, z) as (x, -z, y): the viewer's axes become (vx, -vz, vy) here. The model's glTF is
# around the anchor: moved back by it (the .blend's x and y are Blender's own here)
model = imported(a.model)
for ob in model:
    ob.location.x += SITE_ANCHOR[0]
    ob.location.y += SITE_ANCHOR[1]
manifest = json.load(open(os.path.join(a.tiles_root, "manifest.json"), encoding="utf-8"))
online = {t["id"] for t in manifest["tilesets"]}
mockups_url = next(m["url"] for m in manifest["models"] if m["id"] == "mockups")
mockups = [o for o in imported(os.path.join(a.tiles_root, mockups_url))
           if o.name.startswith("mockup zone") and f"zone-{o.name.split()[-1]}" not in online]
print(f"[flow] model: {len(model)} meshes; mockups of zones not online: {[o.name for o in mockups]}", flush=True)

# One BVH over everything, in Blender's world space
depsgraph = bpy.context.evaluated_depsgraph_get()
verts, polys = [], []
for ob in model + mockups:
    mesh = ob.evaluated_get(depsgraph).to_mesh()
    m = ob.matrix_world
    base = len(verts)
    verts += [m @ v.co for v in mesh.vertices]
    polys += [[base + i for i in poly.vertices] for poly in mesh.polygons]
    ob.evaluated_get(depsgraph).to_mesh_clear()
bvh = BVHTree.FromPolygons(verts, polys)
print(f"[flow] {len(polys):,} faces", flush=True)

lo = np.array([float(v) for v in a.min.split(",")])
hi = np.array([float(v) for v in a.max.split(",")])
dims = np.ceil((hi - lo) / a.cell).astype(int)
nx, ny, nz = dims
print(f"[flow] grid {nx} x {ny} x {nz} = {nx * ny * nz:,} cells of {a.cell} m", flush=True)
solid = np.zeros((nz, ny, nx), np.uint8)  # z, y, x: x fastest, as a 3D texture
centre = lambda i, j, k: lo + (np.array([i, j, k]) + 0.5) * a.cell  # noqa: E731
to_blender = lambda v: Vector((v[0], -v[2], v[1]))  # noqa: E731

for k in range(nz):
    for i in range(nx):
        # The column's surfaces, from above: every hit going down; under the lowest one, the ground
        x, z = centre(i, 0, k)[[0, 2]]
        start = to_blender((x, hi[1] + 50, z))
        lowest = None
        origin = start.copy()
        for _ in range(64):
            hit = bvh.ray_cast(origin, Vector((0, 0, -1)), 400)
            if hit[0] is None:
                break
            lowest = hit[0].z
            origin = hit[0] + Vector((0, 0, -1e-3))
        for j in range(ny):
            c = centre(i, j, k)
            if lowest is None or c[1] < lowest:
                solid[k, j, i] = 1
                continue
            near = bvh.find_nearest(to_blender(c), SHELL)
            if near[0] is not None:
                solid[k, j, i] = 1
    if k % 10 == 0:
        print(f"[flow] {k}/{nz} rows, {solid[:k + 1].mean() * 100:.0f} % solid so far", flush=True)

os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
np.savez_compressed(a.out, solid=solid, min=lo, cell=a.cell, dims=dims)
print(f"[flow] -> {a.out}: {solid.mean() * 100:.0f} % solid", flush=True)
