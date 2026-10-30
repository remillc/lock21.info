"""Evens out the colour across the frame (TODO #75, zone 4, Christian 2026-10-30): the rig's lamps light the middle of
the frame warm and the water lights its edges green, the same in every frame (the lamps move with the camera). A gain
for the whole frame (timeline_lut.py) brings the frame's mean to neutral, but leaves the middle yellow and turns the
edges magenta. This measures, per group of clips, the mean colour at each place of the frame over many frames (linear
light, Rec.709 gamma 2.4 as in timeline_lut.py), smoothed, and corrects each place's red/green and blue/green ratios
to the frame's mean, the luminance kept: the hue evened out, not the brightness (the vignetting stays).

The ratios are the same before and after a gain for the whole frame: measure on the original frames or the graded
ones, the map is the same.

Examples:
    python tools/color-grading/flat_color.py -d O:/data/2024-08-18/zone-4/frames-lens-corrected-n18 \\
        -g green=GX0521:GX0531 -g lamps=GX0531:GX0542 -m O:/temp/color-grading/zone-4/flat.npz
    python tools/color-grading/flat_color.py -m O:/temp/color-grading/zone-4/flat.npz \\
        --preview O:/temp/flat-preview.jpg O:/data/2024-08-18/zone-4/frames-lens-corrected-graded-n18/GX053601.0200.tif
    python tools/color-grading/flat_color.py -m O:/temp/color-grading/zone-4/flat.npz \\
        -d O:/data/2024-08-18/zone-4/frames-lens-corrected-graded-n18 -o O:/data/2024-08-18/zone-4/frames-flat
"""
import argparse
import os
import random
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

GAMMA = 2.4
GRID = (48, 64)  # rows, columns of the map
LUMA = np.array([0.2126, 0.7152, 0.0722])
TO_LINEAR = (np.arange(256) / 255.0) ** GAMMA
TO_CODE = np.round(255 * np.linspace(0, 1, 4096) ** (1 / GAMMA)).astype(np.uint8)

p = argparse.ArgumentParser(prog="flat_color.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-d", "--dir", help="frames folder (TIFF): measured with --group, corrected with --out")
p.add_argument("-g", "--group", action="append", metavar="NAME=FIRST:END",
               help="a group of clips: names from FIRST (included) to END (excluded), e.g. lamps=GX0531:GX0542")
p.add_argument("-m", "--map", required=True, help="the maps (.npz): written with --group, read otherwise")
p.add_argument("-n", "--sample", type=int, default=400, help="frames measured per group (default 400)")
p.add_argument("-s", "--smooth", type=float, default=3.0, help="smoothing of the map, in cells of the 64 x 48 grid (default 3)")
p.add_argument("--limit", type=float, default=2.0, help="largest gain on a channel, and 1/limit the smallest (default 2)")
p.add_argument("--strength", type=float, default=1.0, help="share of the correction applied (default 1)")
p.add_argument("-o", "--out", help="write the corrected frames there, same names")
p.add_argument("--preview", nargs="+", metavar=("OUT.jpg", "FRAME"), help="before and after, side by side: the output, then frames")
p.add_argument("-j", "--jobs", type=int, default=max(1, (os.cpu_count() or 2) - 2), help="processes (default: cores - 2)")


def linear(path, size=None):
    image = Image.open(path).convert("RGB")
    if size:
        image = image.resize(size, Image.BILINEAR)
    return TO_LINEAR[np.asarray(image)]


def measure(folder, first, end, sample, smooth):
    names = sorted(f for f in os.listdir(folder) if f.lower().endswith(".tif") and first <= f < end)
    random.seed(1)
    picked = random.sample(names, min(sample, len(names)))
    acc = np.zeros(GRID + (3,))
    for name in picked:
        a = linear(os.path.join(folder, name), (GRID[1] * 8, GRID[0] * 8))
        acc += a.reshape(GRID[0], 8, GRID[1], 8, 3).mean((1, 3))
    acc /= len(picked)
    acc = np.stack([gaussian_filter(acc[..., c], smooth, mode="nearest") for c in range(3)], -1)
    return acc, len(picked), len(names)


def gains(mean, limit, strength):
    """Per place, the gains that bring its R/G and B/G to the frame's, its luminance kept"""
    target = mean.reshape(-1, 3).mean(0)
    want_r, want_b = target[0] / target[1], target[2] / target[1]
    g = np.ones_like(mean)
    g[..., 0] = want_r / (mean[..., 0] / mean[..., 1])
    g[..., 2] = want_b / (mean[..., 2] / mean[..., 1])
    g = np.clip(g, 1 / limit, limit) ** strength
    g *= ((mean * LUMA).sum(-1) / ((mean * g) * LUMA).sum(-1))[..., None]
    return g


def full_size(g, shape):
    return np.stack([zoom(g[..., c], (shape[0] / g.shape[0], shape[1] / g.shape[1]), order=1) for c in range(3)], -1)


def group_of(name, groups):
    return next((k for k, (first, end) in groups.items() if first <= name < end), None)


def correct(path, g):
    a = linear(path)
    if g.shape[:2] != a.shape[:2]:
        g = full_size(g, a.shape)
    out = np.clip(a * g, 0, 1)
    return Image.fromarray(TO_CODE[np.round(out * 4095).astype(np.int32)])


_maps, _full = {}, {}


def work(args):
    """One frame corrected; each process sizes a group's map to the frames once"""
    path, out, key = args
    if key not in _full:
        with Image.open(path) as image:
            _full[key] = full_size(_maps[key], (image.height, image.width))
    correct(path, _full[key]).save(out, compression=None)
    return os.path.basename(path)


def init(maps):
    _maps.update(maps)


if __name__ == "__main__":
    a = p.parse_args()
    if a.group:
        groups, maps = {}, {}
        for spec in a.group:
            name, _, span = spec.partition("=")
            first, _, end = span.partition(":")
            mean, used, total = measure(a.dir, first, end, a.sample, a.smooth)
            g = gains(mean, a.limit, a.strength)
            groups[name] = (first, end)
            maps[name] = g
            rg, bg = mean[..., 0] / mean[..., 1], mean[..., 2] / mean[..., 1]
            print(f"{name}: {used} of {total} frames; R/G {rg.min():.2f}..{rg.max():.2f}, B/G {bg.min():.2f}..{bg.max():.2f}; "
                  f"gains R {g[..., 0].min():.2f}..{g[..., 0].max():.2f}, G {g[..., 1].min():.2f}..{g[..., 1].max():.2f}, "
                  f"B {g[..., 2].min():.2f}..{g[..., 2].max():.2f}", flush=True)
        np.savez(a.map, groups=np.array([[k, *v] for k, v in groups.items()]), **{f"map_{k}": v for k, v in maps.items()})
        print("maps:", a.map)
    data = np.load(a.map)
    groups = {k: (f, e) for k, f, e in data["groups"]}
    maps = {k: data[f"map_{k}"] for k in groups}
    if a.preview:
        out, frames = a.preview[0], a.preview[1:]
        rows = []
        for f in frames:
            key = group_of(os.path.basename(f), groups)
            before = Image.open(f).convert("RGB")
            after = correct(f, maps[key]) if key else before
            w = 700
            h = round(before.height * w / before.width)
            row = Image.new("RGB", (2 * w + 8, h))
            row.paste(before.resize((w, h)), (0, 0))
            row.paste(after.resize((w, h)), (w + 8, 0))
            rows.append(row)
            print(os.path.basename(f), key or "no group: unchanged")
        sheet = Image.new("RGB", (rows[0].width, sum(r.height + 8 for r in rows)))
        y = 0
        for r in rows:
            sheet.paste(r, (0, y))
            y += r.height + 8
        sheet.save(out, quality=88)
        print("preview:", out)
    if a.out:
        os.makedirs(a.out, exist_ok=True)
        jobs = []
        for f in sorted(os.listdir(a.dir)):
            if not f.lower().endswith(".tif"):
                continue
            key = group_of(f, groups)
            if key is None:
                print(f, "no group: skipped")
                continue
            jobs.append((os.path.join(a.dir, f), os.path.join(a.out, f), key))
        with ProcessPoolExecutor(a.jobs, initializer=init, initargs=(maps,)) as pool:
            for i, name in enumerate(pool.map(work, jobs, chunksize=8), 1):
                if i % 500 == 0 or i == len(jobs):
                    print(f"{i}/{len(jobs)} {name}", flush=True)
