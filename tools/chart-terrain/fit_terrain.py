"""Fits the chart terrain, as edited by hand, to the model (TODO #73): only where it meets the model.

Reads the measures of fit_mesh.py --measure (the mesh's vertices and the model under and over them) and writes the
fitted heights for fit_mesh.py --apply. Every vertex keeps its height, unless:
- under a zone's ground (a floor or a bank: no more than WALL_STEP m above the lowest of the zone within GROUND_REACH m;
  a wall's face or top, a pier's top, is no ground): FLOOR_CLEAR m under it, up or down (hidden under the zone; no gap seen through it);
- in a hole of a zone's scan (not under a solid, which covers it): FLOOR_CLEAR m under the lowest ground around it within HOLE_REACH m (the nearest scanned
  point could be a wall's top: the hole filled up to it, in spikes seen through the face);
- near the zones, outside them: never higher than their top plus TOP_RISE m per metre away (a bank above the walls'
  tops, Christian, 2026-10-25: « elevated terrain that needs to be lowered»), never lower than their ground's edge minus
  EDGE_DROP m per metre, reached around walls, not over them (the gaps beside the stairs), over FIT_REACH m; both met
  softly (SOFT m);
- inside a wall or a solid (the context's walls and fillers, the mockups): never above its top.

Usage:
    python tools/chart-terrain/fit_terrain.py [-d O:/temp/chart-terrain/mesh-model.npz] [-o O:/temp/chart-terrain/mesh-fitted.npz]
"""
import argparse

import numpy as np
from scipy import ndimage

FLOOR_CLEAR = 0.05
WALL_STEP = 1.2
HOLE_REACH = 1.5
TOP_RISE = 0.25
EDGE_DROP = 0.5
FIT_REACH = 8.0
SOFT = 0.3

p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                            epilog="See the module's docstring for the rules.")
p.add_argument("-d", "--data", default="O:/temp/chart-terrain/mesh-model.npz", help="the measures (fit_mesh.py --measure)")
p.add_argument("-o", "--out", default="O:/temp/chart-terrain/mesh-fitted.npz", help="the fitted heights (for fit_mesh.py --apply)")
a = p.parse_args()

d = np.load(a.data)
pos, cell = d["pos"], float(d["cell"])
z0 = pos[..., 2].astype(np.float64)
low, top, solid = d["zone_low"], d["zone_top"], d["solid_top"]


def window(metres):
    return 2 * int(round(metres / cell)) + 1


def soft_min(x, y):
    return -SOFT * np.logaddexp(-x / SOFT, -y / SOFT)


def soft_max(x, y):
    return SOFT * np.logaddexp(x / SOFT, y / SOFT)


covered = np.isfinite(low)
inf_low = np.where(covered, low, np.inf)
# Ground: no more than WALL_STEP m above the zone's lowest within GROUND_REACH m (the flat top of a pier or a wall
# passed a test within a metre: the terrain jumped up under it)
GROUND_REACH = 3.0
ground = covered & (low - ndimage.minimum_filter(inf_low, size=window(GROUND_REACH)) <= WALL_STEP)
# Holes under a solid are left alone: the solid covers them
holes = ndimage.binary_fill_holes(covered) & ~covered & ~np.isfinite(solid)
ground_low = np.where(ground, low, np.inf)
floor = ndimage.minimum_filter(ground_low, size=3)
hole_floor = ndimage.minimum_filter(ground_low, size=window(HOLE_REACH))
floor = np.where(holes, hole_floor, floor)
on_ground = (ground | holes) & np.isfinite(floor)
walls = covered & ~ground
hidden = walls | (np.isfinite(solid) & ~on_ground)

z = z0.copy()
z[on_ground] = floor[on_ground] - FLOOR_CLEAR

# Near the zones, outside them: the top of the nearest zone (any of it: a wall's top too), and the ground's edge reached
# around walls (one cell a step, the mean of the cells already reached)
zone_any = covered | holes
top_at = np.where(np.isfinite(top), top, np.where(np.isfinite(low), low, np.nan))
distance, (ty, tx) = ndimage.distance_transform_edt(~(zone_any & np.isfinite(top_at)), return_indices=True)
distance = distance * cell
cap = top_at[ty, tx] - FLOOR_CLEAR + TOP_RISE * distance
steps = int(round(FIT_REACH / cell))
reached = on_ground.copy()
edge = np.where(on_ground, floor - FLOOR_CLEAR, 0.0)
around = np.where(on_ground, 0.0, np.inf)
kernel = np.ones((3, 3))
for k in range(1, steps + 1):
    total = ndimage.convolve(np.where(reached, edge, 0.0), kernel, mode="constant")
    count = ndimage.convolve(reached.astype(float), kernel, mode="constant")
    new = ~reached & ~hidden & (count > 0)
    edge = np.where(new, total / np.maximum(count, 1), edge)
    around = np.where(new, k * cell, around)
    reached |= new
outside = ~zone_any & ~hidden
near = outside & (distance <= FIT_REACH)
z = np.where(near, soft_min(z, cap), z)
low_bound = edge - EDGE_DROP * around
lift = outside & reached & ~on_ground
z = np.where(lift, soft_max(z, low_bound), z)

# Inside walls and solids: never above their top
# (where a wall of a zone covers the point, its top: a low filler inside a wall pulled the terrain under the wall's top
# down to the filler's)
solid_cap = np.where(walls, low, np.where(np.isfinite(solid), solid, np.inf)) - FLOOR_CLEAR
z = np.where(hidden, np.minimum(z, solid_cap), z)

moved = np.abs(z - z0) > 0.01
np.savez_compressed(a.out, z=z.astype(np.float32), pos=pos)
print(f"[fit] {int(moved.sum()):,} of {z.size:,} vertices moved: under the zones' ground {int((on_ground & moved).sum()):,} "
      f"({int(holes.sum()):,} in holes), lowered near the zones {int((near & (z < z0 - 0.01)).sum()):,}, raised to their "
      f"edges {int((lift & (z > z0 + 0.01)).sum()):,}, under walls and solids {int((hidden & moved).sum()):,}; largest "
      f"change {np.abs(z - z0).max():.2f} m -> {a.out}", flush=True)
