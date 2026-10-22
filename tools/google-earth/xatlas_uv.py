"""New texture layout (UVs) for a simplified zone, with xatlas, for make_model.py --rebake.

Blender's Smart UV Project cuts a simplified photogrammetry zone into almost one piece per triangle and fills about
40 % of the image (zone 3, 2026-10-22); xatlas, the library game engines and photogrammetry tools use, packs its pieces
into about 80 % of it, with gutters that the bake fills with the neighbouring colour. Runs in this folder's .venv
(pip install xatlas), outside Blender: make_model.py writes the mesh (points, triangles) to an .npz and reads back one
UV per triangle corner.

Usage:
    .venv\\Scripts\\python.exe xatlas_uv.py <mesh.npz> <uvs.npz> [-s 2048] [-p 4]
"""
import argparse
import time

import numpy as np
import xatlas

p = argparse.ArgumentParser(prog="xatlas_uv.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("mesh", help=".npz with v (points, float32 N x 3) and f (triangles, uint32 M x 3)")
p.add_argument("out", help=".npz to write: uv (float32 M x 3 x 2, one UV per triangle corner, origin bottom left)")
p.add_argument("-s", "--size", type=int, default=2048, help="texture size the layout is packed for, px (default 2048)")
p.add_argument("-p", "--padding", type=int, default=4, help="gutter between pieces, px (default 4)")
a = p.parse_args()

mesh = np.load(a.mesh)
started = time.time()
atlas = xatlas.Atlas()
atlas.add_mesh(mesh["v"], mesh["f"])
pack = xatlas.PackOptions()
pack.resolution = a.size
pack.padding = a.padding
pack.bilinear = True
atlas.generate(xatlas.ChartOptions(), pack)
_, indices, uvs = atlas[0]
# xatlas keeps the triangles in their order; its UVs have their origin top left, Blender's bottom left
corner_uv = uvs[indices].astype(np.float32)
corner_uv[..., 1] = 1 - corner_uv[..., 1]
np.savez(a.out, uv=corner_uv)
used = atlas.utilization[0] if hasattr(atlas.utilization, "__len__") else atlas.utilization
print(f"[xatlas] {len(mesh['f']):,} triangles: {atlas.chart_count:,} pieces, {used * 100:.0f} % of the image, "
      f"{time.time() - started:.0f} s", flush=True)
