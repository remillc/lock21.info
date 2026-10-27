"""Met un export .glb de Metashape en pieds: ses positions multipliées par 3,28084 (TODO #75).

Les exports des zones qu'utilise le .blend sont en pieds, comme le mesh des zones; un export en mètres (Metashape
écrit dans l'unité du chunk) ne se recale pas (prepare_zone.py: échelle 0,31, recalage refusé). Les normales et la
texture ne changent pas. Le fichier est réécrit en place (par un fichier temporaire), ou dans --out.

Usage:
    python -I glb_to_feet.py <export.glb> [-o <sortie.glb>] [-f 3.28084]
Aussi un module: to_feet(path) (retexture_chunk.py l'appelle après l'export, dans Metashape: sans numpy).
"""
import argparse
import array
import json
import os
import struct
import sys

FEET_PER_METRE = 1 / 0.3048


def to_feet(path, out=None, factor=FEET_PER_METRE):
    """Les positions du .glb `path` multipliées par `factor`, écrit dans `out` (défaut: en place); le nombre
    d'accesseurs de positions convertis."""
    with open(path, "rb") as f:
        magic, _, _ = struct.unpack("<4sII", f.read(12))
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
            assert view.get("byteStride", 12) == 12, "positions entrelacées: non prévu"
            start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
            end = start + acc["count"] * 12
            values = array.array("f")
            values.frombytes(bytes(binary[start:end]))
            if sys.byteorder != "little":
                values.byteswap()
            values = array.array("f", (v * factor for v in values))
            if sys.byteorder != "little":
                values.byteswap()
            binary[start:end] = values.tobytes()
            acc["min"] = [v * factor for v in acc["min"]]
            acc["max"] = [v * factor for v in acc["max"]]
    text = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    text += b" " * (-len(text) % 4)
    out = out or path
    tmp = out + ".tmp"
    with open(tmp, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(text) + 8 + len(binary)))
        f.write(struct.pack("<I4s", len(text), b"JSON") + text)
        f.write(struct.pack("<I4s", len(binary), b"BIN" + bytes(1)) + bytes(binary))
    os.replace(tmp, out)
    return len(done)


if __name__ == "__main__":
    p = argparse.ArgumentParser(prog="glb_to_feet.py", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("glb", help="export .glb à convertir")
    p.add_argument("-o", "--out", help="fichier à écrire (défaut: le même)")
    p.add_argument("-f", "--factor", type=float, default=FEET_PER_METRE, help="facteur (défaut: pieds par mètre, 3,28084)")
    a = p.parse_args()
    n = to_feet(a.glb, a.out, a.factor)
    print("%s: %d accesseurs de positions x %.5f" % (a.out or a.glb, n, a.factor))
