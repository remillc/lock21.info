"""Fits the chart terrain, as edited by hand, to the model (TODO #73): only where it meets the model.

Reads the measures of fit_mesh.py --measure (the mesh's vertices and the model under and over them) and writes the
fitted heights for fit_mesh.py --apply. Every vertex keeps its height, unless:
- under a zone's ground (a floor or a bank: no more than WALL_STEP m above the lowest of the zone within GROUND_REACH m;
  a wall's face or top, a pier's top, is no ground): FLOOR_CLEAR m under it, up or down (hidden under the zone; no gap seen through it);
- in a hole of a zone's scan (not under a solid, which covers it): FLOOR_CLEAR m under the lowest ground around it within HOLE_REACH m (the nearest scanned
  point could be a wall's top: the hole filled up to it, in spikes seen through the face);
- near the model, outside the zones (within FIT_REACH m of a zone or a solid): a smooth surface (a Laplace fill)
  stretched between the terrain further out, as edited, and the edges of the zones' ground; walls and solids hold
  nothing up (Christian, 2026-10-25: terraces climbing a wall to its top, a pit with holes around the filler, « as low
  and flat as its surroundings »); then the lock's floor kept flat within FLOOR_FLAT m of a zone's ground (lowering
  only), not below that level inside a solid's outline, the ground against a wall's outer side rising to meet its top
  where it is close to it; never higher than the zones' top plus TOP_RISE m per metre (met softly, SOFT m);
- in the areas listed in FLATTEN (asked by Christian): flat, at the lock floor's level;
- inside a wall or a solid (the context's walls and fillers, the mockups): never above its top.

Usage:
    python tools/chart-terrain/fit_terrain.py [-d O:/temp/chart-terrain/mesh-model.npz] [-o O:/temp/chart-terrain/mesh-fitted.npz]
"""
import argparse

import numpy as np
from scipy import ndimage
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve

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
filler = d["filler_top"] if "filler_top" in d.files else np.full(low.shape, np.nan)


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

# Near the model, outside the zones (within FIT_REACH m of a zone or a solid), the walls' and solids' footprints
# included: a smooth surface stretched between the terrain further out (as edited) and the edges of the zones' ground,
# walls and solids holding nothing up (Christian, 2026-10-25: terraces climbing a wall to its top, « as low and flat as
# its surroundings »). A Laplace equation, solved exactly (repeated means left old hollows unsettled)
zone_any = covered | holes
model = zone_any | np.isfinite(solid)
distance = ndimage.distance_transform_edt(~model) * cell
band = ~zone_any & ~hidden & (distance <= FIT_REACH)
free = (band | hidden) & ~on_ground
index = -np.ones(z.shape, int)
index[free] = np.arange(int(free.sum()))
rows_, cols_ = z.shape
A = lil_matrix((int(free.sum()), int(free.sum())))
b = np.zeros(int(free.sum()))
fy, fx = np.nonzero(free)
for n, (r, c) in enumerate(zip(fy, fx)):
    count = 0
    for rr, cc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
        if 0 <= rr < rows_ and 0 <= cc < cols_:
            count += 1
            if free[rr, cc]:
                A[n, index[rr, cc]] = -1
            else:
                b[n] += z[rr, cc]
    A[n, n] = count
z[free] = spsolve(A.tocsr(), b)

# The lock's floor stays flat (Christian, 2026-10-25: the ground south of the western filler stood 2 m above the lock
# floor): within FLOOR_FLAT m of a zone's ground, reached around walls and solids, at that ground's level, blending back
# over FLOOR_BLEND m; lowering only (a bank above it keeps its height further out)
FLOOR_FLAT = 10.0
FLOOR_BLEND = 10.0
steps = int(round((FLOOR_FLAT + FLOOR_BLEND) / cell))
reached = on_ground.copy()
level = np.where(on_ground, floor - FLOOR_CLEAR, 0.0)
away = np.where(on_ground, 0.0, np.inf)
kernel = np.ones((3, 3))
for k in range(1, steps + 1):
    total = ndimage.convolve(np.where(reached, level, 0.0), kernel, mode="constant")
    count = ndimage.convolve(reached.astype(float), kernel, mode="constant")
    new = ~reached & ~hidden & (count > 0)
    level = np.where(new, total / np.maximum(count, 1), level)
    away = np.where(new, k * cell, away)
    reached |= new
# The floor's level: one smooth surface through the zones' ground (a Laplace equation, the ground fixed, the rest free),
# not each point's nearest ground (that made patches of different heights, with steps between them)
# The lock's floor only: the zones' ground within FLOOR_BAND m of its typical height (its lower quarter); stair steps,
# ledges and a deep scanned piece (« zone 8 - floor », 4 m down) left out (they raised the level by the stairs and dug a
# pit beside the filler)
FLOOR_BAND = 1.0
typical = np.percentile(floor[on_ground], 25)
floor_ground = on_ground & (np.abs(floor - typical) <= FLOOR_BAND)
level_free = ~floor_ground
lindex = -np.ones(z.shape, int)
lindex[level_free] = np.arange(int(level_free.sum()))
L = lil_matrix((int(level_free.sum()), int(level_free.sum())))
lb = np.zeros(int(level_free.sum()))
ly_, lx_ = np.nonzero(level_free)
ground_level = np.where(floor_ground, floor - FLOOR_CLEAR, 0.0)
for n, (r, c) in enumerate(zip(ly_, lx_)):
    count = 0
    for rr, cc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
        if 0 <= rr < rows_ and 0 <= cc < cols_:
            count += 1
            if level_free[rr, cc]:
                L[n, lindex[rr, cc]] = -1
            else:
                lb[n] += ground_level[rr, cc]
    L[n, n] = count
floor_level = ground_level.copy()
floor_level[level_free] = spsolve(L.tocsr(), lb)
t = np.clip((away - FLOOR_FLAT) / FLOOR_BLEND, 0, 1)
flat_weight = np.where(reached, 1 - t * t * (3 - 2 * t), 0.0)
# Only ground a little above the floor (the lock's floor raised by the chart): a bank (the north wall's outer side)
# keeps its height. Full up to RISE_FULL m above the floor's level, none from RISE_NONE m
RISE_FULL = 2.5
RISE_NONE = 4.0
v = np.clip((RISE_NONE - (z - floor_level)) / (RISE_NONE - RISE_FULL), 0, 1)
flat_weight = flat_weight * v * v * (3 - 2 * v)
flat = reached & ~on_ground & ~hidden
z = np.where(flat, np.minimum(z, flat_weight * floor_level + (1 - flat_weight) * z), z)
# Inside a solid's outline, near the floor: not below the floor's level (a pit showed where a filler does not cover its
# outline)
solid_only = hidden & ~walls & (distance <= FIT_REACH)
z = np.where(solid_only, np.maximum(z, floor_level), z)
# Under a filler (sediment): never below the floor's level near the model, and not capped by it (its dips stay under
# the terrain; its mound stands out where it is higher)
under_filler = np.isfinite(filler) & ~on_ground & ~hidden & reached
z = np.where(under_filler, np.maximum(z, floor_level), z)

# Against a wall's outer side, no gap (Christian, 2026-10-25): within WALL_REACH m outside a zone's wall, where the ground
# is no more than WALL_CLIMB m below the wall's top, it rises to meet the top (a smooth step); lower ground (the lock's
# floor) does not climb
WALL_REACH = 4.0
WALL_CLIMB = 3.0
wall_dist, (wy, wx) = ndimage.distance_transform_edt(~walls, return_indices=True)
wall_dist = wall_dist * cell
wall_top = low[wy, wx] - FLOOR_CLEAR
u = np.clip(wall_dist / WALL_REACH, 0, 1)
meet = 1 - u * u * (3 - 2 * u)
climb = band & (wall_dist <= WALL_REACH) & (z >= wall_top - WALL_CLIMB) & (z < wall_top)
z = np.where(climb, meet * wall_top + (1 - meet) * z, z)

top_at = np.where(np.isfinite(top), top, np.where(np.isfinite(low), low, np.nan))
far, (ty, tx) = ndimage.distance_transform_edt(~(zone_any & np.isfinite(top_at)), return_indices=True)
cap = top_at[ty, tx] - FLOOR_CLEAR + TOP_RISE * far * cell
z = np.where(band, soft_min(z, cap), z)
near = band
lift = band & (z > z0 + 0.01)

# Areas Christian asked to make flat, at the lock floor's level (rectangles x0, x1, y0, y1 in the .blend's frame, in
# metres; on one side of the walls, so as not to reach the ground behind them): the floor's level inside, the zones'
# ground kept, joined to the ground around over the last FLATTEN_EDGE m
FLATTEN_EDGE = 1.0
FLATTEN = [
    (-44.0, -24.0, 22.0, 36.0),  # 2026-10-25: a 9 m mound by the walkway's north end, over the fillers, south of the
                                 # north wall
]
for x0, x1, y0, y1 in FLATTEN:
    px, py = pos[..., 0], pos[..., 1]
    edge_in = np.minimum.reduce([px - x0, x1 - px, py - y0, y1 - py])
    inside = (edge_in >= 0) & ~on_ground
    e = np.clip(edge_in / FLATTEN_EDGE, 0, 1)
    weight = e * e * (3 - 2 * e)
    z = np.where(inside, weight * floor_level + (1 - weight) * z, z)
    print(f"[fit] flattened x {x0}..{x1}, y {y0}..{y1}: {int(inside.sum())} vertices at the floor's level "
          f"({np.median(floor_level[inside]):.2f} m)", flush=True)

# Inside walls and solids: never above their top
# (where a wall of a zone covers the point, its top: a low filler inside a wall pulled the terrain under the wall's top
# down to the filler's)
solid_cap = np.where(walls, low, np.where(np.isfinite(solid), solid, np.inf)) - FLOOR_CLEAR
z = np.where(hidden, np.minimum(z, solid_cap), z)

moved = np.abs(z - z0) > 0.01
np.savez_compressed(a.out, z=z.astype(np.float32), pos=pos)
print(f"[fit] lock floor level {typical:.2f} m (zones' ground within {FLOOR_BAND} m of it: {int(floor_ground.sum()):,} points)", flush=True)
print(f"[fit] {int(moved.sum()):,} of {z.size:,} vertices moved: under the zones' ground {int((on_ground & moved).sum()):,} "
      f"({int(holes.sum()):,} in holes), lowered near the zones {int((near & (z < z0 - 0.01)).sum()):,}, raised to their "
      f"edges {int((lift & (z > z0 + 0.01)).sum()):,}, under walls and solids {int((hidden & moved).sum()):,}; largest "
      f"change {np.abs(z - z0).max():.2f} m -> {a.out}", flush=True)
