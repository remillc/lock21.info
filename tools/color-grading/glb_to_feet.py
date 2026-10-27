"""Met un export .glb de Metashape en pieds: ses positions multipliées par 3,28084 (TODO #75).

Les exports des zones qu'utilise le .blend sont en pieds, comme le mesh des zones; un export en mètres (Metashape
écrit dans l'unité du chunk) ne se recale pas (prepare_zone.py: échelle 0,31, recalage refusé). Les normales et la
texture ne changent pas. Le fichier est réécrit en place (par un fichier temporaire), ou dans --out.

Usage:
    python -I glb_to_feet.py <export.glb> [-o <sortie.glb>] [-f 3.28084]
"""
import argparse
import json
import os
import struct

import numpy as np

p = argparse.ArgumentParser(prog="glb_to_feet.py", description=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("glb", help="export .glb à convertir")
p.add_argument("-o", "--out", help="fichier à écrire (défaut: le même)")
p.add_argument("-f", "--factor", type=float, default=1 / 0.3048, help="facteur (défaut: pieds par mètre, 3,28084)")
a = p.parse_args()

with open(a.glb, "rb") as f:
    magic, version, _ = struct.unpack("<4sII", f.read(12))
    assert magic == b"glTF", "pas un .glb"
    json_len, _ = struct.unpack("<I4s", f.read(8))
    gltf = json.loads(f.read(json_len))
    bin_len, _ = struct.unpack("<I4s", f.read(8))
    binary = bytearray(f.read(bin_len))

done = set()
for mesh in gltf["meshes"]:
    for prim in mesh["primitives"]:
        index = prim["attributes"]["POSITION"]
        if index in done:
            continue
        done.add(index)
        acc = gltf["accessors"][index]
        assert acc["componentType"] == 5126 and acc["type"] == "VEC3", "positions: float32 VEC3 attendues"
        view = gltf["bufferViews"][acc["bufferView"]]
        stride = view.get("byteStride", 12)
        start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
        rows = np.ndarray((acc["count"], 3), dtype="<f4", buffer=binary, offset=start, strides=(stride, 4))
        rows *= np.float32(a.factor)
        acc["min"] = [v * a.factor for v in acc["min"]]
        acc["max"] = [v * a.factor for v in acc["max"]]

text = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
text += b" " * (-len(text) % 4)
out = a.out or a.glb
tmp = out + ".tmp"
with open(tmp, "wb") as f:
    f.write(struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(text) + 8 + len(binary)))
    f.write(struct.pack("<I4s", len(text), b"JSON") + text)
    f.write(struct.pack("<I4s", len(binary), b"BIN\0") + bytes(binary))
os.replace(tmp, out)
print("%s: %d accesseurs de positions x %.5f" % (out, len(done), a.factor))
