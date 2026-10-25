"""Heights of the lock's surroundings from a chart screenshot (TODO #73).

Reads a screenshot of the Boating app's chart (contour lines, soundings in feet, land in yellow, shoal in green) and
writes a height grid in metres, ready for make_chart_terrain.py (Blender):

1. classes by colour: water (white, with its black contour lines), shoal (green: depth 0), land (yellow: a little
   above the water); the app's buttons, bars, labels and symbols (the data file's boxes) are filled from around them;
2. a first surface S0 through the soundings (typed in the data file, read off the chart) and the shoal's edge (0 ft),
   a thin plate spline;
3. the bands between the contour lines (the water once the lines are taken out): two bands facing each other across a
   line differ by one contour interval, deeper on the side where S0 is deeper; the soundings and the shoal fix the
   depths; least squares, the interval one of the unknowns;
4. each band at its depth, smoothed: the terraces become slopes that follow the lines.

Heights in metres from the water surface (up positive: the land above it, the bottom below). The grid is north-up,
east to the right, in metres from the data file's origin (the green cross by the dive flag: the lock).

Usage:
    python tools/chart-terrain/chart_terrain.py [-d soundings-2026-10-25.json] [-o O:/temp/chart-terrain/heights.npz]
"""
import argparse
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.interpolate import RBFInterpolator, griddata
from skimage import measure

FOOT = 0.3048
HERE = os.path.dirname(os.path.abspath(__file__))

p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                            epilog="See the module's docstring for the steps.")
p.add_argument("-d", "--data", default=os.path.join(HERE, "soundings-2026-10-25.json"),
               help="the chart's data: source image, scale, origin, soundings, masks (default soundings-2026-10-25.json)")
p.add_argument("-i", "--image", help="the screenshot (default: the data file's source)")
p.add_argument("-o", "--out", default="O:/temp/chart-terrain/heights.npz", help="the height grid (.npz), and a preview .png beside it")
p.add_argument("-c", "--cell", type=float, default=1.0, help="grid spacing in metres (default 1)")
p.add_argument("-k", "--dark", type=int, default=620,
               help="a pixel darker than this (R + G + B) is a contour line (default 620: 1,156 bands on the 2026-10-25 chart)")
p.add_argument("-b", "--band-limit", type=float, default=8.0,
               help="a band's depth stays within this many feet of the first surface (default 8: 90 %% of the bands "
                    "are within it on the 2026-10-25 chart; beyond, narrow slits)")
p.add_argument("-l", "--land", type=float, default=5.0, help="height of the land above the water, in feet (default 5)")
a = p.parse_args()

data = json.load(open(a.data, encoding="utf-8"))
image = np.asarray(Image.open(a.image or data["source"]).convert("RGB")).astype(np.int32)
H, W, _ = image.shape
mpp = data["scale"]["feet"] * FOOT / data["scale"]["pixels"]  # metres per pixel
ox, oy = data["origin"]["x"], data["origin"]["y"]
print(f"[chart] {W}x{H} px, {mpp:.4f} m/px: {W * mpp:.0f} x {H * mpp:.0f} m", flush=True)

# Masks: the app's buttons and bars, labels, symbols
masked = np.zeros((H, W), bool)
for x0, y0, x1, y1 in data["masks"]["boxes"]:
    masked[y0:y1, x0:x1] = True
hx, hy = data["masks"]["label_half_size"]
for x, y, _ in data["soundings"]:
    masked[max(0, y - hy):y + hy, max(0, x - hx):x + hx] = True

# Classes: 0 water, 1 shoal (green), 2 land (yellow); masked pixels take their nearest unmasked neighbour's
r, g, b = image[..., 0], image[..., 1], image[..., 2]
cls = np.zeros((H, W), np.int8)
cls[(abs(r - 157) < 40) & (abs(g - 206) < 40) & (b < 80)] = 1
cls[(r > 215) & (g > 205) & (b > 60) & (b < 170)] = 2
_, (iy, ix) = ndimage.distance_transform_edt(masked, return_indices=True)
cls = cls[iy, ix]
water = cls == 0

# Contour lines: dark pixels in the water (--dark), thickened by a pixel so that their small gaps close; the masks are
# barriers too (the labels sit on the lines)
dark = ndimage.binary_dilation(image.sum(2) < a.dark, iterations=1) & water & ~masked

# Points on the shoal's and the land's edges (depth 0 at the shoal, the land's height on the land)
edge = water & ndimage.binary_dilation(~water, iterations=1)
ey, ex = np.nonzero(edge)
land_ft = -a.land
inland = (cls == 2) & ~ndimage.binary_dilation(cls != 2, iterations=6)
ly, lx = np.nonzero(inland)

sx, sy, sd = (np.array(c, float) for c in zip(*data["soundings"]))

# 2. First surface S0: soundings and a thinned edge, thin plate spline
step = 10
s0_pts = np.column_stack([np.concatenate([sx, ex[::step], lx[::step * 20]]), np.concatenate([sy, ey[::step], ly[::step * 20]])])
s0_val = np.concatenate([sd, np.zeros(len(ex[::step])), np.full(len(lx[::step * 20]), land_ft)])
rbf = RBFInterpolator(s0_pts, s0_val, kernel="thin_plate_spline", smoothing=1.0, neighbors=200)

# The grid: cells of --cell metres, in pixels
cell = a.cell / mpp
gx = np.arange(0, W, cell)
# Rows of the chart only (the app's status and navigation bars above and below)
TOP, BOTTOM = 34, 1132
gy = np.arange(TOP, BOTTOM, cell)
GX, GY = np.meshgrid(gx, gy)
# Evaluated every 4 cells, then resampled (the thin plate spline is smooth)
coarse = rbf(np.column_stack([GX[::4, ::4].ravel(), GY[::4, ::4].ravel()])).reshape(GX[::4, ::4].shape)
S0 = ndimage.zoom(coarse, (GX.shape[0] / coarse.shape[0], GX.shape[1] / coarse.shape[1]), order=3)
print(f"[chart] grid {len(gx)} x {len(gy)} cells of {a.cell} m; first surface {S0.min():.0f} to {S0.max():.0f} ft", flush=True)


def s0_at(xs, ys):
    return ndimage.map_coordinates(S0, [ys / cell, xs / cell], order=1, mode="nearest")


# 3. The bands between the contour lines: the water left once the lines are taken out, each connected stretch one band.
# Two bands that face each other across a line differ by one contour interval, deeper toward the side where the first
# surface is deeper (same depth where it hardly changes); a band holding a sounding has its depth; a band touching the
# shoal is 0 to 1 ft deep. Least squares, the interval itself one of the unknowns (lines run together on the steep
# banks: counting them alone would give it wrong)
chart = np.zeros((H, W), bool)
chart[TOP:BOTTOM, :] = True
bands_mask = water & ~dark & ~masked & chart
labels = measure.label(bands_mask, connectivity=1)
n = labels.max() + 1
area = np.bincount(labels.ravel(), minlength=n)
small = area < 20
labels[small[labels]] = 0
full_s0 = ndimage.map_coordinates(S0, np.mgrid[0:H, 0:W] / cell, order=1, mode="nearest")
mean_s0 = np.bincount(labels.ravel(), weights=full_s0.ravel(), minlength=n) / np.maximum(area, 1)

# Neighbours across a line: labels a few pixels apart
pairs = {}
for dx, dy in [(3, 0), (0, 3), (3, 3), (3, -3), (2, 0), (0, 2)]:
    B = labels[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)]
    A = labels[max(0, -dy):H - max(0, dy), max(0, -dx):W - max(0, dx)]
    m = (A > 0) & (B > 0) & (A != B)
    lo = np.minimum(A[m], B[m]).astype(np.int64)
    hi = np.maximum(A[m], B[m]).astype(np.int64)
    for code, count in zip(*np.unique(lo * n + hi, return_counts=True)):
        pairs[code] = pairs.get(code, 0) + count
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import lsqr
rows, cols, vals, rhs, wts = [], [], [], [], []
eq = 0
iv = n  # the interval's column
for code, count in pairs.items():
    if count < 6:
        continue
    i_, j_ = divmod(int(code), n)
    diff = mean_s0[j_] - mean_s0[i_]
    sign = 0 if abs(diff) < 0.75 else np.sign(diff)
    w = 1.0 if sign else 0.3
    rows += [eq, eq, eq]; cols += [j_, i_, iv]; vals += [w, -w, -w * sign]; rhs.append(0.0); eq += 1
for x, y, v in data["soundings"]:
    k = labels[int(y), int(x)]
    if k == 0:
        yy, xx = np.nonzero(labels[max(0, y - 30):y + 30, max(0, x - 30):x + 30])
        if not len(yy):
            continue
        t = np.argmin((yy - 30) ** 2 + (xx - 30) ** 2)
        k = labels[max(0, y - 30) + yy[t], max(0, x - 30) + xx[t]]
    rows.append(eq); cols.append(k); vals.append(20.0); rhs.append(20.0 * v); eq += 1
shore_bands = np.unique(labels[ndimage.binary_dilation(cls == 1, iterations=3) & (labels > 0)])
for k in shore_bands:
    rows.append(eq); cols.append(k); vals.append(3.0); rhs.append(3.0 * 0.5); eq += 1
# Every band also leans weakly on the first surface (bands not linked to any other)
for k in np.nonzero(area >= 20)[0]:
    if k == 0:
        continue
    rows.append(eq); cols.append(k); vals.append(0.05); rhs.append(0.05 * mean_s0[k]); eq += 1
M = coo_matrix((vals, (rows, cols)), shape=(eq, n + 1)).tocsr()
solution = lsqr(M, np.array(rhs), atol=1e-8, btol=1e-8, iter_lim=20000)[0]
band_depth = solution[:n]
# A band only weakly tied to the others can stray: held within --band-limit ft of the first surface (the slits)
gap = band_depth - mean_s0
band_depth = mean_s0 + np.clip(gap, -a.band_limit, a.band_limit)
big = (area >= 20) & (np.arange(n) > 0)
print(f"[chart] band depth minus first surface: p5 {np.percentile(gap[big], 5):.1f}, p50 {np.median(gap[big]):.1f}, "
      f"p95 {np.percentile(gap[big], 95):.1f}, extremes {gap[big].min():.1f} / {gap[big].max():.1f} ft", flush=True)
print(f"[chart] {int((area >= 20).sum())} bands, {len(pairs)} neighbour pairs; contour interval {solution[iv]:.2f} ft", flush=True)

# 4. The final surface: each band at its depth, the lines and small bits from the nearest band, smoothed (the terraces
# become slopes); the shoal at 0 to 0.5 ft, the land above the water
known = labels > 0
_, (iy2, ix2) = ndimage.distance_transform_edt(~known, return_indices=True)
full = band_depth[labels[iy2, ix2]]
full = ndimage.gaussian_filter(full, 4.0)
D = ndimage.map_coordinates(full, [GY, GX], order=1, mode="nearest")
D = ndimage.gaussian_filter(D, 0.8)
gcls = cls[np.clip(GY.astype(int), 0, H - 1), np.clip(GX.astype(int), 0, W - 1)]
D[gcls == 1] = np.minimum(D[gcls == 1], 0.5)
D[gcls == 2] = land_ft
D = np.maximum(D, land_ft)
# The soundings' fit
fit = D[np.clip(((sy - TOP) / cell).round().astype(int), 0, D.shape[0] - 1), np.clip((sx / cell).round().astype(int), 0, D.shape[1] - 1)] - sd
print(f"[chart] soundings: surface minus sounding, median {np.median(np.abs(fit)):.1f} ft, worst {np.abs(fit).max():.1f} ft", flush=True)

height = -D * FOOT
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
np.savez_compressed(a.out, height=height.astype(np.float32), cls=gcls.astype(np.int8), cell=a.cell,
                    origin=np.array([ox / cell, (oy - TOP) / cell]), mpp=mpp)
print(f"[chart] heights {height.min():.1f} to {height.max():.1f} m -> {a.out}", flush=True)

# Preview: depth in colour, the soundings over it
depth = np.clip(D, 0, 85) / 85
rgb = np.stack([0.85 - 0.75 * depth, 0.9 - 0.6 * depth, 0.95 - 0.35 * depth], -1)
rgb[gcls == 1] = (0.62, 0.81, 0.0)
rgb[gcls == 2] = (1.0, 0.94, 0.45)
shade = ndimage.sobel(D, 1) * 0.04 + 1
rgb = np.clip(rgb * shade[..., None], 0, 1)
Image.fromarray((rgb * 255).astype(np.uint8)).save(os.path.splitext(a.out)[0] + "-preview.png")
print(f"[chart] preview -> {os.path.splitext(a.out)[0]}-preview.png", flush=True)
