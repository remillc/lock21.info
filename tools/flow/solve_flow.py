"""The river's flow around the lock (Christian, 2026-10-25: particles that flow around the walls), from the grid of
voxelize_flow.py: an ideal (potential) flow, the current coming from the west. Writes the field the viewer's particles
follow, and pictures to check it.

The flow: the velocity potential solves Laplace's equation in the water cells (sparse conjugate gradients), set to the
free stream on the west and east faces of the grid (the current, west to east), no flow through the solids, the ground
and the water surface (their faces left out of the equation). Water cells cut off from the west face (inside a wall's
two skins, under an overhang) count as solid. The velocity is the potential's gradient, in units of the free stream
(1: the river's current; the viewer scales it by the season's).

The wake: ideal flow has no eddies, so the water downstream of an obstacle gets a turbulence index, 0 to 1 (the
obstacles' shadow swept downstream, fading over WAKE m), which the viewer turns into the particles' swirling.

Output (-o folder): flow.bin.gz, the cells as RGBA bytes (x fastest, then y up, then z south: a 3D texture), RGB the
velocity mapped from [-SCALE, SCALE] to 0..255, A the turbulence; flow.json, the grid (corner, cell, size, scale);
flow-top-*.png, the speed and streamlines seen from above at a few heights.

Usage:
    python tools/flow/solve_flow.py -i O:/temp/flow/solid.npz -o viewer/public/flow --pictures O:/temp/flow
"""
import argparse
import gzip
import json
import os

import numpy as np
from scipy import ndimage, sparse
from scipy.sparse.linalg import cg

p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-i", "--input", required=True, help="the grid of voxelize_flow.py (.npz)")
p.add_argument("-o", "--out", required=True, help="folder of flow.bin.gz and flow.json")
p.add_argument("--pictures", help="folder of the pictures (flow-top-*.png); none without it")
p.add_argument("-w", "--wake", type=float, default=6.0, help="how far the turbulence lasts downstream, m (default 6)")
a = p.parse_args()

SCALE = 2.0  # velocities kept up to twice the current (it speeds up through gaps)
data = np.load(a.input)
solid = data["solid"].astype(bool)  # z, y, x
lo, cell = data["min"], float(data["cell"])
nz, ny, nx = solid.shape

# Water connected to the west face; the rest (sealed pockets) solid
water = ~solid
labels, _ = ndimage.label(water)
inflow = np.unique(labels[:, :, 0][water[:, :, 0]])
water &= np.isin(labels, inflow[inflow > 0])
print(f"[flow] {water.mean() * 100:.0f} % water, {nx} x {ny} x {nz}", flush=True)

# Laplace: the unknowns are the water cells except the west and east faces (the free stream there: phi = x)
index = -np.ones(water.shape, np.int64)
fixed = np.zeros(water.shape, bool)
fixed[:, :, 0] = fixed[:, :, -1] = True
unknown = water & ~fixed
index[unknown] = np.arange(unknown.sum())
n = int(unknown.sum())
x_of = (np.arange(nx) + 0.5) * cell
phi_fixed = np.broadcast_to(x_of, water.shape)
rows, cols, vals = [], [], []
rhs = np.zeros(n)
diag = np.zeros(n)
for axis in range(3):
    for step in (1, -1):
        neighbour = np.roll(water, -step, axis=axis)
        # No wrap-around: the grid's own faces have no neighbour beyond them
        edge = [slice(None)] * 3
        edge[axis] = -1 if step == 1 else 0
        neighbour[tuple(edge)] = False
        link = unknown & neighbour
        here = index[link]
        diag += np.bincount(here, minlength=n)
        n_index = np.roll(index, -step, axis=axis)[link]
        n_fixed = np.roll(fixed, -step, axis=axis)[link]
        n_phi = np.roll(phi_fixed, -step, axis=axis)[link]
        rows.append(here[~n_fixed])
        cols.append(n_index[~n_fixed])
        vals.append(-np.ones((~n_fixed).sum()))
        np.add.at(rhs, here[n_fixed], n_phi[n_fixed])
A = sparse.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(n, n))
A = A + sparse.diags(diag)
# A cell with no water neighbour at all: its own value (kept out of the system's null space)
isolated = diag == 0
A = A + sparse.diags(isolated.astype(float))
M = sparse.diags(1 / np.maximum(diag, 1))
x0 = np.broadcast_to(x_of, water.shape)[unknown]
phi_u, info = cg(A, rhs, x0=x0, M=M, rtol=1e-7, maxiter=8000)
print(f"[flow] solved ({'converged' if info == 0 else f'cg info {info}'})", flush=True)
phi = np.where(fixed, phi_fixed, 0.0)
phi[unknown] = phi_u

# The velocity: the potential's gradient, centred where both neighbours are water, one-sided at a wall, 0 in solids
velocity = np.zeros((3, nz, ny, nx))
for comp, axis in enumerate((2, 1, 0)):  # x, y, z components; the arrays are z, y, x
    plus = np.roll(water, -1, axis=axis)
    minus = np.roll(water, 1, axis=axis)
    edge_p = [slice(None)] * 3
    edge_p[axis] = -1
    plus[tuple(edge_p)] = False
    edge_m = [slice(None)] * 3
    edge_m[axis] = 0
    minus[tuple(edge_m)] = False
    phi_p = np.roll(phi, -1, axis=axis)
    phi_m = np.roll(phi, 1, axis=axis)
    g = np.where(plus & minus, (phi_p - phi_m) / (2 * cell),
                 np.where(plus, (phi_p - phi) / cell, np.where(minus, (phi - phi_m) / cell, 0.0)))
    velocity[comp] = np.where(water, g, 0.0)
speed = np.linalg.norm(velocity, axis=0)
print(f"[flow] speed in the water: median {np.median(speed[water]):.2f}, 95 % {np.percentile(speed[water], 95):.2f}, "
      f"max {speed[water].max():.2f} (the current: 1)", flush=True)

# The wake: the obstacles' shadow swept downstream (+x), fading over WAKE m, softened
shadow = (~water).astype(float)
wake = np.zeros_like(shadow)
steps = int(a.wake * 2 / cell)
for d in range(1, steps + 1):
    wake = np.maximum(wake, np.roll(shadow, d, axis=2) * np.exp(-d * cell / a.wake))
wake[:, :, :steps] *= 0  # no wrap-around from the east face
wake = ndimage.gaussian_filter(wake, 1.0) * water

os.makedirs(a.out, exist_ok=True)
rgba = np.empty((nz, ny, nx, 4), np.uint8)
for comp in range(3):
    rgba[..., comp] = np.round((np.clip(velocity[comp] / SCALE, -1, 1) * 0.5 + 0.5) * 255)
rgba[..., 3] = np.round(np.clip(wake, 0, 1) * 255)
with gzip.open(os.path.join(a.out, "flow.bin.gz"), "wb", compresslevel=9) as f:
    f.write(rgba.tobytes())
meta = {"min": [round(float(v), 3) for v in lo], "cell": cell, "size": [int(nx), int(ny), int(nz)], "scale": SCALE,
        "layout": "RGBA bytes, x fastest, then y (up), then z (south); RGB velocity / scale mapped to 0..255 (128 = 0), "
                  "in units of the current; A turbulence 0..1"}
json.dump(meta, open(os.path.join(a.out, "flow.json"), "w"), indent=1)
print(f"[flow] -> {a.out}: flow.bin.gz {os.path.getsize(os.path.join(a.out, 'flow.bin.gz')) / 1e3:.0f} kB", flush=True)

if a.pictures:
    from PIL import Image, ImageDraw
    os.makedirs(a.pictures, exist_ok=True)
    zoom = 6
    for height in (1.5, 4.0, 8.0):
        j = int((height - lo[1]) / cell)
        sp = speed[:, j, :]
        img = np.zeros((nz, nx, 3), np.uint8)
        t = np.clip(sp / 1.6, 0, 1)
        img[..., 0] = (40 + 215 * t).astype(np.uint8)
        img[..., 1] = (60 + 120 * (1 - abs(t - 0.5) * 2)).astype(np.uint8)
        img[..., 2] = (200 * (1 - t)).astype(np.uint8)
        img[~water[:, j, :]] = (70, 60, 50)
        img[..., :] = np.where((wake[:, j, :, None] > 0.3) & water[:, j, :, None], img // 2 + 60, img)
        picture = Image.fromarray(img).resize((nx * zoom, nz * zoom), Image.NEAREST)
        draw = ImageDraw.Draw(picture)
        # Streamlines from the west edge, every 3 m
        for k0 in range(0, nz, max(1, int(3 / cell))):
            x, z = 0.5, k0 + 0.5
            line = [(x * zoom, z * zoom)]
            for _ in range(3000):
                i, k = int(x), int(z)
                if not (0 <= i < nx and 0 <= k < nz) or not water[k, j, i]:
                    break
                vx, vz = velocity[0, k, j, i], velocity[2, k, j, i]
                norm = max(np.hypot(vx, vz), 1e-6)
                x += 0.4 * vx / norm
                z += 0.4 * vz / norm
                line.append((x * zoom, z * zoom))
            if len(line) > 2:
                draw.line(line, fill=(255, 255, 255), width=1)
        picture.save(os.path.join(a.pictures, f"flow-top-{height:g}m.png"))
    print(f"[flow] pictures -> {a.pictures}", flush=True)
