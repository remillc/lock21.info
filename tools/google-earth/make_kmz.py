"""Builds the KMZ of the lock for Google Earth Pro (TODO #13) from the model of make_model.py.

Converts <name>.obj (+ .mtl and its .jpg textures, one material per zone and per piece of context) into a COLLADA
model (pycollada; Blender 5 no longer exports COLLADA) and wraps it in a KMZ with, at the lock's coordinates, a pin and
the model sitting on Google Earth's ground (relativeToGround, altitude 0): Google Earth has no negative depth, so the
lock is shown at depth 0 rather than 55 ft under the water. -H/--heading turns the model (degrees clockwise from
north): 0, the .blend's frame is aligned on north.

--network <url>: the network version, for a model that grows zone by zone. The downloaded lock-21.kmz only holds a
link to <url>/lock-21.kml, which lists one small KMZ per zone and per piece of context (<url>/parts/<part>-<hash>.kmz,
the hash changing with the part, so Google Earth never keeps a stale copy). Adding or updating a zone means uploading
its part and the new lock-21.kml: users see it the next time they open the file, without downloading it again.
Written in <dir>/network/ (lock-21.kmz, lock-21.kml, parts/), to serve or upload as is.

Runs with the tool's own Python (pycollada): tools/google-earth/.venv/Scripts/python.exe make_kmz.py -h
Setup once: python -m venv tools/google-earth/.venv; tools/google-earth/.venv/Scripts/python -m pip install pycollada==0.9.2 numpy
"""
import argparse
import hashlib
import os
import shutil
import zipfile

import numpy as np
from collada import Collada, asset, geometry, material, scene, source

p = argparse.ArgumentParser(prog="make_kmz.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-d", "--dir", required=True, help="folder of <name>.obj/.mtl/.jpg (make_model.py output)")
p.add_argument("-n", "--name", default="lock-21", help="base name of the files (default lock-21)")
p.add_argument("--lat", type=float, default=44.996817, help="latitude (default: Lock 21, 44°59.809' N)")
p.add_argument("--lon", type=float, default=-74.89995, help="longitude (default: Lock 21, 74°53.997' W)")
p.add_argument("-H", "--heading", type=float, default=0, help="model heading, degrees clockwise from north (default 0)")
p.add_argument("--network", metavar="URL", help="also write the network version, served from URL (e.g. https://tiles.lock21.info/downloads/google-earth)")
a = p.parse_args()


def read_mtl(path):
    """Material name -> {'texture': file} or {'color': (r, g, b)}"""
    materials, current = {}, None
    if not os.path.exists(path):
        return materials
    for line in open(path, encoding="utf-8"):
        parts = line.split()
        if not parts:
            continue
        if parts[0] == "newmtl":
            current = materials.setdefault(" ".join(parts[1:]), {"color": (0.8, 0.8, 0.8)})
        elif current is not None and parts[0] == "Kd":
            current["color"] = tuple(float(x) for x in parts[1:4])
        elif current is not None and parts[0] == "map_Kd":
            current["texture"] = os.path.basename(" ".join(parts[1:]))
    return materials


def read_obj(path):
    """Positions, UVs, and per material the corners (position index, UV index or -1)"""
    positions, uvs, groups, current = [], [], {}, "default"
    for line in open(path, encoding="utf-8"):
        parts = line.split()
        if not parts:
            continue
        if parts[0] == "v":
            positions.append([float(x) for x in parts[1:4]])
        elif parts[0] == "vt":
            uvs.append([float(x) for x in parts[1:3]])
        elif parts[0] == "usemtl":
            current = " ".join(parts[1:])
        elif parts[0] == "f":
            face = []
            for c in parts[1:]:
                ids = c.split("/")
                face.append((int(ids[0]) - 1, int(ids[1]) - 1 if len(ids) > 1 and ids[1] else -1))
            corners = groups.setdefault(current, [])
            for k in range(1, len(face) - 1):  # fan, in case of quads
                corners += [face[0], face[k], face[k + 1]]
    return np.array(positions), np.array(uvs) if uvs else np.zeros((1, 2)), groups


materials = read_mtl(os.path.join(a.dir, f"{a.name}.mtl"))
positions, uvs, groups = read_obj(os.path.join(a.dir, f"{a.name}.obj"))

# Google Earth Pro drops or crashes on large COLLADA meshes: a single mesh of 30,000 vertices / 50,000 triangles
# shows, meshes of 60,000 vertices / 90,000 triangles don't (2026-10-19 tests). Each material's triangles are split
# into meshes below the size that works (a vertex = a position + UV pair), each with its own, re-indexed positions and UVs.
MAX_VERTICES = 30_000
MAX_TRIANGLES = 45_000


def chunks(corners):
    start, seen = 0, set()
    for t in range(0, len(corners), 3):
        tri = set(corners[t:t + 3])
        if len(seen | tri) > MAX_VERTICES or (t - start) // 3 >= MAX_TRIANGLES:
            yield corners[start:t]
            start, seen = t, set()
        seen |= tri
    yield corners[start:]


def write_model(mat_name, corners, spec):
    """One COLLADA model (Z up, metres) per material: a zone, or a piece of context. Google Earth Pro crashed on the
    whole lock as one model (zones + context, 15 textures, 2026-10-20) but opens a zone alone or the context alone:
    one model per part, each in its own placemark, loaded separately (and shown or hidden one by one)."""
    dae = Collada()
    dae.assetInfo.upaxis = asset.UP_AXIS.Z_UP
    dae.assetInfo.unitmeter = 1.0
    dae.assetInfo.unitname = "meter"
    textured = "texture" in spec
    if textured:
        image = material.CImage("image", spec["texture"])
        surface = material.Surface("surface", image)
        sampler = material.Sampler2D("sampler", surface)
        effect = material.Effect("effect", [surface, sampler], "lambert", diffuse=material.Map(sampler, "UVSET0"))
        dae.images.append(image)
    else:
        effect = material.Effect("effect", [], "lambert", diffuse=(*spec["color"], 1.0))
    mat = material.Material("material", mat_name, effect)
    dae.effects.append(effect)
    dae.materials.append(mat)
    nodes, triangles = [], 0
    for n, part in enumerate(chunks(corners)):
        pairs, index = {}, []
        for corner in part:
            index.append(pairs.setdefault(corner, len(pairs)))
        order = np.array(list(pairs.keys()))
        sources = [source.FloatSource(f"positions-{n}", positions[order[:, 0]].ravel(), ("X", "Y", "Z"))]
        inputs = source.InputList()
        inputs.addInput(0, "VERTEX", f"#positions-{n}")
        if textured:
            sources.append(source.FloatSource(f"uvs-{n}", uvs[np.maximum(order[:, 1], 0)].ravel(), ("S", "T")))
            inputs.addInput(1, "TEXCOORD", f"#uvs-{n}", set="0")
        geom = geometry.Geometry(dae, f"geometry-{n}", f"{mat_name}-{n}", sources)
        # One index per corner: the same index for the position and the UV, both re-indexed per mesh
        indices = np.repeat(np.array(index), 2) if textured else np.array(index)
        geom.primitives.append(geom.createTriangleSet(indices, inputs, "material-ref"))
        dae.geometries.append(geom)
        bind = [("UVSET0", "TEXCOORD", "0")] if textured else []
        nodes.append(scene.GeometryNode(geom, [scene.MaterialNode("material-ref", mat, inputs=bind)]))
        triangles += len(index) // 3
    dae.scenes.append(scene.Scene("scene", [scene.Node("model", children=nodes)]))
    dae.scene = dae.scenes[0]
    dae.write(os.path.join(a.dir, f"{mat_name}.dae"))
    return triangles, len(nodes)


def label(mat_name):
    """zone-12 -> Zone 12; context-talus-nord-0 -> talus nord"""
    if mat_name.startswith("zone-"):
        return "Zone " + mat_name[5:]
    return mat_name.removeprefix("context-").rsplit("-", 1)[0].replace("-", " ")


def placemark(mat_name):
    return f"""    <Placemark>
      <name>{label(mat_name)}</name>
      <Model>
        <altitudeMode>relativeToGround</altitudeMode>
        <Location><longitude>{a.lon}</longitude><latitude>{a.lat}</latitude><altitude>0</altitude></Location>
        <Orientation><heading>{a.heading}</heading><tilt>0</tilt><roll>0</roll></Orientation>
        <Scale><x>1</x><y>1</y><z>1</z></Scale>
        <Link><href>models/{mat_name}.dae</href></Link>
      </Model>
    </Placemark>"""


textures, triangles, meshes, zones, context, part_texture = [], 0, 0, [], [], {}
for mat_name, corners in groups.items():
    spec = materials.get(mat_name, {"color": (0.8, 0.8, 0.8)})
    t, m = write_model(mat_name, corners, spec)
    triangles += t
    meshes += m
    part_texture[mat_name] = spec.get("texture")
    if "texture" in spec:
        textures.append(spec["texture"])
    (zones if mat_name.startswith("zone-") else context).append(mat_name)
    print(f"  {label(mat_name)}: {t:,} triangles, {m} meshes")
zones.sort(key=lambda z: int(z[5:]) if z[5:].isdigit() else 0)
print(f"  {len(zones) + len(context)} models, {meshes} meshes, {len(textures)} textures")
newline = "\n"

kml = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Écluse 21</name>
  <description>Modèle 3D de l'écluse 21 (Dickinson Landing), photogrammétrie sous-marine de Christian Rémillard, lock21.info, licence CC BY 4.0. {triangles:,} triangles. Posé au sol (profondeur 0): l'écluse est en réalité à 55 pi (16,8 m) sous l'eau.</description>
  <Placemark>
    <name>Écluse 21</name>
    <Point><coordinates>{a.lon},{a.lat},0</coordinates></Point>
  </Placemark>
  <Folder>
    <name>Zones</name>
{newline.join(placemark(z) for z in zones)}
  </Folder>
  <Folder>
    <name>Contexte (maquette)</name>
{newline.join(placemark(c) for c in context)}
  </Folder>
</Document>
</kml>
"""
kmz_path = os.path.join(a.dir, f"{a.name}.kmz")
with zipfile.ZipFile(kmz_path, "w", zipfile.ZIP_DEFLATED) as kmz:
    kmz.writestr("doc.kml", kml)
    for mat_name in zones + context:
        kmz.write(os.path.join(a.dir, f"{mat_name}.dae"), f"models/{mat_name}.dae")
    for texture in textures:
        kmz.write(os.path.join(a.dir, texture), f"models/{texture}")
print(f"{kmz_path}: {os.path.getsize(kmz_path) / 1e6:.1f} MB, {triangles:,} triangles")

# Network version: one small KMZ per part, a list of links, and the downloadable file that points to the list
if a.network:
    base = a.network.rstrip("/")
    net = os.path.join(a.dir, "network")
    shutil.rmtree(net, ignore_errors=True)
    os.makedirs(os.path.join(net, "parts"))
    links = {}
    for mat_name in zones + context:
        files = [(os.path.join(a.dir, f"{mat_name}.dae"), f"models/{mat_name}.dae")]
        if part_texture[mat_name]:
            files.append((os.path.join(a.dir, part_texture[mat_name]), f"models/{part_texture[mat_name]}"))
        digest = hashlib.sha256()
        for path, _ in files:
            digest.update(open(path, "rb").read())
        part = f"{mat_name}-{digest.hexdigest()[:8]}.kmz"
        doc = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
{placemark(mat_name)}
</Document>
</kml>
"""
        with zipfile.ZipFile(os.path.join(net, "parts", part), "w", zipfile.ZIP_DEFLATED) as kmz:
            kmz.writestr("doc.kml", doc)
            for path, arcname in files:
                kmz.write(path, arcname)
        links[mat_name] = f"{base}/parts/{part}"

    def network_link(mat_name):
        return f"""    <NetworkLink>
      <name>{label(mat_name)}</name>
      <Link><href>{links[mat_name]}</href></Link>
    </NetworkLink>"""

    listing = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Écluse 21</name>
  <LookAt><longitude>{a.lon}</longitude><latitude>{a.lat}</latitude><altitude>0</altitude><heading>0</heading><tilt>45</tilt><range>120</range></LookAt>
  <description>Modèle 3D de l'écluse 21 (Dickinson Landing), photogrammétrie sous-marine de Christian Rémillard, lock21.info, licence CC BY 4.0. {len(zones)} zones, {triangles:,} triangles; les zones s'ajoutent au fil des plongées. Posé au sol (profondeur 0): l'écluse est en réalité à 55 pi (16,8 m) sous l'eau.</description>
  <Placemark>
    <name>Écluse 21</name>
    <Point><coordinates>{a.lon},{a.lat},0</coordinates></Point>
  </Placemark>
  <Folder>
    <name>Zones</name>
{newline.join(network_link(z) for z in zones)}
  </Folder>
  <Folder>
    <name>Contexte (maquette)</name>
{newline.join(network_link(c) for c in context)}
  </Folder>
</Document>
</kml>
"""
    open(os.path.join(net, f"{a.name}.kml"), "w", encoding="utf-8").write(listing)
    # The downloaded file: a link to the list, fetched again each time Google Earth opens it
    entry = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<NetworkLink>
  <name>Écluse 21</name>
  <open>1</open>
  <flyToView>1</flyToView>
  <Link><href>{base}/{a.name}.kml</href></Link>
</NetworkLink>
</kml>
"""
    with zipfile.ZipFile(os.path.join(net, f"{a.name}.kmz"), "w", zipfile.ZIP_DEFLATED) as kmz:
        kmz.writestr("doc.kml", entry)
    size = sum(os.path.getsize(os.path.join(net, "parts", f)) for f in os.listdir(os.path.join(net, "parts")))
    print(f"{net}: {a.name}.kmz ({os.path.getsize(os.path.join(net, f'{a.name}.kmz'))} bytes) -> {base}/{a.name}.kml, "
          f"{len(links)} parts, {size / 1e6:.1f} MB")
