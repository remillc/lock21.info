"""Local colour correction of a zone's texture (TODO #5): one part of the zone brought to the colour of another.

color_correct.py balances the whole texture at once; a part can stay off (zone 3, Christian, 2026-10-25: the face of
the wall with the three sluice gates, more olive than the side walls). The part is chosen in 3D, as the texture is an
atlas of scattered islands: the zone's triangles whose centre is inside a box (-b, the OBJ's axes: x, y up, z; the
viewer's scene metres) and that face a direction (-f, mostly: the faces turned toward the camera, not the
openings' sides nor the ledges' tops). The correction fades over -F m inside the box's sides (no edge to see), and is
drawn into the texture through the triangles' UVs (a few pixels wider, so the islands' borders follow).

The colour: the part's mean (weighted by area) is brought to the ratios -r (G/R and B/R), at its brightness (the
luminance kept). Measure them with -m on a reference box (the same options), for example the side walls.

Usage:
    python tools/publish-model/color_patch.py -o O:/publishing/prepared/zone-3/zone-3.obj \\
        -i O:/temp/color-test/zone-3/zone-3.jpg -O O:/temp/color-test/zone-3-patch/zone-3.jpg \\
        -b -34.2,-31.3,0.7,5.2,-19.7,-13.6 -f 1,0,0 -r 0.86,0.75
"""
import argparse
import os

import cv2
import numpy as np

p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                            epilog="See the module's docstring for the method.")
p.add_argument("-o", "--obj", required=True, help="the zone's mesh (OBJ, with UVs: the prepared zone)")
p.add_argument("-i", "--input", required=True, help="the zone's texture (JPEG)")
p.add_argument("-O", "--output", help="the corrected texture (JPEG); without it, only the measure")
p.add_argument("-b", "--box", required=True, help="xmin,xmax,ymin,ymax,zmin,zmax: the part (OBJ axes, y up)")
p.add_argument("-f", "--facing", default=None, help="x,y,z: the direction its faces turn to (default any)")
p.add_argument("-F", "--feather", type=float, default=0.4, help="the fade inside the box's sides, m (default 0.4)")
p.add_argument("-r", "--ratios", help="G/R,B/R the part's mean is brought to")
p.add_argument("-m", "--measure", action="store_true", help="only print the part's mean colour and ratios")
p.add_argument("-q", "--quality", type=int, default=95, help="JPEG quality (default 95)")
a = p.parse_args()


def load_obj(path):
    vs, ts, fs = [], [], []
    with open(path) as f:
        for line in f:
            if line.startswith("v "):
                vs.append(line[2:])
            elif line.startswith("vt "):
                ts.append(line[3:])
            elif line.startswith("f "):
                fs.append(line[2:].replace("/", " "))
    faces = np.loadtxt(fs, dtype=np.int64)
    step = faces.shape[1] // 3  # v/vt (2) or v/vt/vn (3)
    return np.loadtxt(vs, dtype=np.float32), np.loadtxt(ts, dtype=np.float32), faces[:, 0::step] - 1, faces[:, 1::step] - 1


# Facing: none below FACING[0] of the direction (the openings' sides, about 0), in full from FACING[1] (rough stone
# leans every way: a stricter test left it speckled)
FACING = (0.15, 0.4)

print(f"[patch] reading {a.obj}", flush=True)
V, T, fv, ft = load_obj(a.obj)
p0, p1, p2 = V[fv[:, 0]], V[fv[:, 1]], V[fv[:, 2]]
normal = np.cross(p1 - p0, p2 - p0)
area = np.linalg.norm(normal, axis=1) / 2
normal /= np.maximum(np.linalg.norm(normal, axis=1, keepdims=True), 1e-12)
centre = (p0 + p1 + p2) / 3

box = np.array([float(v) for v in a.box.split(",")], np.float32).reshape(3, 2)
inside = np.min(np.minimum(centre - box[:, 0], box[:, 1] - centre), axis=1)  # m inside the box's nearest side
weight = np.clip(inside / a.feather, 0, 1) if a.feather > 0 else (inside > 0).astype(np.float32)
weight = weight * weight * (3 - 2 * weight)
if a.facing:
    facing = np.array([float(v) for v in a.facing.split(",")], np.float32)
    facing /= np.linalg.norm(facing)
    dot = normal @ facing
    t = np.clip((dot - FACING[0]) / (FACING[1] - FACING[0]), 0, 1)
    weight *= t * t * (3 - 2 * t)
picked = weight > 0
print(f"[patch] {picked.sum()} triangles in the part ({area[picked].sum():.1f} m², {area[weight >= 1].sum():.1f} m² in full)",
      flush=True)

image = cv2.imread(a.input, cv2.IMREAD_COLOR)  # BGR
if image is None:
    raise SystemExit(f"color_patch.py: cannot read {a.input}")
H, W = image.shape[:2]
uv = T[ft[picked]]  # (n, 3, 2)
px = np.stack([uv[..., 0] * W, (1 - uv[..., 1]) * H], -1)

# The part's mean colour: its triangles' centres in the texture, weighted by area and weight
cx = np.clip(px[:, :, 0].mean(1).astype(int), 0, W - 1)
cy = np.clip(px[:, :, 1].mean(1).astype(int), 0, H - 1)
colour = image[cy, cx][:, ::-1].astype(np.float32) / 255
w = area[picked] * weight[picked]
mean = (colour * w[:, None]).sum(0) / w.sum()
print(f"[patch] mean R G B {mean.round(3)}; G/R {mean[1] / mean[0]:.3f}, B/R {mean[2] / mean[0]:.3f}", flush=True)
if a.measure or not a.output:
    raise SystemExit(0)
if not a.ratios:
    raise SystemExit("color_patch.py: -r/--ratios is needed to correct")

g_r, b_r = (float(v) for v in a.ratios.split(","))
target = np.array([1, g_r, b_r], np.float32)
luma = np.array([0.2126, 0.7152, 0.0722], np.float32)
target *= (mean @ luma) / (target @ luma)
gains = target / mean
print(f"[patch] gains R G B {gains.round(3)}", flush=True)

# The weight drawn into the texture: triangles grouped by weight (64 steps), a few pixels wider
mask = np.zeros((H, W), np.uint8)
levels = np.clip(np.round(weight[picked] * 64), 1, 64).astype(int)
for level in range(1, 65):
    sel = levels == level
    if sel.any():
        cv2.fillPoly(mask, list(np.round(px[sel] * 4).astype(np.int32)), int(level * 255 // 64), lineType=cv2.LINE_8, shift=2)
mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))

out = image.copy()
band = 1024
gains_bgr = gains[::-1]
for y0 in range(0, H, band):
    m = mask[y0:y0 + band].astype(np.float32)[..., None] / 255
    if not m.any():
        continue
    rows = image[y0:y0 + band].astype(np.float32)
    out[y0:y0 + band] = np.clip(rows * (1 + m * (gains_bgr - 1)) + 0.5, 0, 255).astype(np.uint8)
os.makedirs(os.path.dirname(os.path.abspath(a.output)), exist_ok=True)
cv2.imwrite(a.output, out, [cv2.IMWRITE_JPEG_QUALITY, a.quality])
after = out[cy, cx][:, ::-1].astype(np.float32) / 255
mean = (after * w[:, None]).sum(0) / w.sum()
print(f"[patch] -> {a.output}: mean R G B {mean.round(3)}; G/R {mean[1] / mean[0]:.3f}, B/R {mean[2] / mean[0]:.3f}",
      flush=True)
