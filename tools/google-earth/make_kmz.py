"""Builds a test KMZ for Google Earth Pro (TODO #13) from the model of make_test_model.py.

Converts <slug>-test.obj (+ .jpg) into a COLLADA model (pycollada; Blender 5 no longer exports COLLADA) and wraps it
in a KMZ with, at the lock's coordinates, a pin and the model sitting on Google Earth's ground (relativeToGround,
altitude 0): Google Earth has no negative depth, so the lock is shown at depth 0 rather than 55 ft under the water.
-H/--heading turns the model (degrees clockwise from north): its orientation is not known yet (one point only).

Runs with the tool's own Python (pycollada): tools/google-earth/.venv/Scripts/python.exe make_kmz.py -h
Setup once: python -m venv tools/google-earth/.venv; tools/google-earth/.venv/Scripts/python -m pip install pycollada==0.9.2 numpy
"""
import argparse
import os
import sys
import zipfile

import numpy as np
from collada import Collada, asset, geometry, material, scene, source

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "src", "data"))

p = argparse.ArgumentParser(prog="make_kmz.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-z", "--zone", required=True, help='zone name, e.g. "zone 12"')
p.add_argument("-d", "--dir", required=True, help="folder of <slug>-test.obj/.jpg (make_test_model.py output)")
p.add_argument("--lat", type=float, default=44.996817, help="latitude (default: Lock 21, 44°59.809' N)")
p.add_argument("--lon", type=float, default=-74.89995, help="longitude (default: Lock 21, 74°53.997' W)")
p.add_argument("-H", "--heading", type=float, default=0, help="model heading, degrees clockwise from north (default 0)")
a = p.parse_args()
slug = a.zone.replace(" ", "-")
base = f"{slug}-test"


def read_obj(path):
    positions, uvs, corners = [], [], []
    for line in open(path, encoding="utf-8"):
        parts = line.split()
        if not parts:
            continue
        if parts[0] == "v":
            positions.append([float(x) for x in parts[1:4]])
        elif parts[0] == "vt":
            uvs.append([float(x) for x in parts[1:3]])
        elif parts[0] == "f":
            face = [tuple(int(i) - 1 for i in c.split("/")[:2]) for c in parts[1:]]
            for k in range(1, len(face) - 1):  # fan, in case of quads
                corners += [face[0], face[k], face[k + 1]]
    return np.array(positions), np.array(uvs), np.array(corners)


positions, uvs, corners = read_obj(os.path.join(a.dir, f"{base}.obj"))

# COLLADA: Z up, metres, one textured triangle set
dae = Collada()
dae.assetInfo.upaxis = asset.UP_AXIS.Z_UP
dae.assetInfo.unitmeter = 1.0
dae.assetInfo.unitname = "meter"
image = material.CImage("texture", f"{base}.jpg")
surface = material.Surface("texture-surface", image)
sampler = material.Sampler2D("texture-sampler", surface)
effect = material.Effect("effect", [surface, sampler], "lambert", diffuse=material.Map(sampler, "UVSET0"))
mat = material.Material("material", "material", effect)
dae.images.append(image)
dae.effects.append(effect)
dae.materials.append(mat)
# Google Earth crashes on a COLLADA mesh with more than 65,535 vertices (a vertex = a position + UV pair): the model
# is split into meshes below that, each with its own, re-indexed positions and UVs.
MAX_VERTICES = 60_000


def chunks(corners):
    start, seen = 0, set()
    for t in range(0, len(corners), 3):
        tri = {tuple(c) for c in corners[t:t + 3]}
        if len(seen | tri) > MAX_VERTICES:
            yield corners[start:t]
            start, seen = t, set()
        seen |= tri
    yield corners[start:]


geometry_nodes = []
for n, part in enumerate(chunks(corners)):
    pairs, index = {}, []
    for pos, uv in part:
        index.append(pairs.setdefault((pos, uv), len(pairs)))
    order = np.array(list(pairs.keys()))
    geom = geometry.Geometry(dae, f"geometry-{n}", f"{base}-{n}", [
        source.FloatSource(f"positions-{n}", positions[order[:, 0]].ravel(), ("X", "Y", "Z")),
        source.FloatSource(f"uvs-{n}", uvs[order[:, 1]].ravel(), ("S", "T")),
    ])
    inputs = source.InputList()
    inputs.addInput(0, "VERTEX", f"#positions-{n}")
    inputs.addInput(1, "TEXCOORD", f"#uvs-{n}", set="0")
    # One index per corner: the same index for the position and the UV, both re-indexed per mesh
    geom.primitives.append(geom.createTriangleSet(np.repeat(np.array(index), 2), inputs, "material-ref"))
    dae.geometries.append(geom)
    geometry_nodes.append(scene.GeometryNode(geom, [scene.MaterialNode("material-ref", mat, inputs=[("UVSET0", "TEXCOORD", "0")])]))
    print(f"  mesh {n}: {len(index) // 3} triangles, {len(pairs)} vertices")
node = scene.Node("model", children=geometry_nodes)
dae.scenes.append(scene.Scene("scene", [node]))
dae.scene = dae.scenes[0]
dae_path = os.path.join(a.dir, f"{base}.dae")
dae.write(dae_path)

def model(name, mode, altitude):
    return f"""  <Placemark>
    <name>{name}</name>
    <Model>
      <altitudeMode>{mode}</altitudeMode>
      <Location><longitude>{a.lon}</longitude><latitude>{a.lat}</latitude><altitude>{altitude:.2f}</altitude></Location>
      <Orientation><heading>{a.heading}</heading><tilt>0</tilt><roll>0</roll></Orientation>
      <Scale><x>1</x><y>1</y><z>1</z></Scale>
      <Link><href>models/{base}.dae</href></Link>
    </Model>
  </Placemark>"""


kml = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Écluse 21 · essai {a.zone}</name>
  <description>Essai Google Earth: {len(corners) // 3} triangles. Posé au sol (profondeur 0): l'écluse est en réalité à 55 pi (16,8 m) sous l'eau.</description>
  <Placemark>
    <name>Écluse 21</name>
    <Point><coordinates>{a.lon},{a.lat},0</coordinates></Point>
  </Placemark>
{model(a.zone, "relativeToGround", 0)}
</Document>
</kml>
"""
kmz_path = os.path.join(a.dir, f"{base}.kmz")
with zipfile.ZipFile(kmz_path, "w", zipfile.ZIP_DEFLATED) as kmz:
    kmz.writestr("doc.kml", kml)
    kmz.write(dae_path, f"models/{base}.dae")
    kmz.write(os.path.join(a.dir, f"{base}.jpg"), f"models/{base}.jpg")
print(f"{kmz_path}: {os.path.getsize(kmz_path) / 1e6:.1f} MB, {len(corners) // 3} triangles")
