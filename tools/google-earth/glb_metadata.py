"""Writes the lock's metadata into a GLB: copyright, author, licence, source, and where its origin is on Earth.

glTF has no georeferencing: the model is in metres, around its origin, and tools open it there. The origin of the
lock's model is the site anchor, pinned to the lock's coordinates (the same point as in the KMZ); this module writes
those coordinates and the orientation into the file (asset.extras), with the copyright in glTF's own field
(asset.copyright), so that the credit and the placement travel with the file. Every public file carries the
copyright (Christian Rémillard, CC BY 4.0).

Used by make_model.py after each export; also on its own, to tag an existing GLB in place:
    python glb_metadata.py O:\\publishing\\downloads\\online\\lock-21.glb
"""
import argparse
import datetime
import json
import struct

FIRST_YEAR = 2024  # first dive
LATITUDE = 44.996817  # the site anchor: Lock 21, 44°59.809' N
LONGITUDE = -74.89995  # 74°53.997' W


def copyright_line(year=None):
    return f"© {FIRST_YEAR}–{year or datetime.date.today().year} Christian Rémillard · CC BY 4.0 · lock21.info"


def metadata(year=None):
    return {
        "title": "Écluse 21 (Dickinson Landing), modèle 3D / Lock 21, 3D model",
        "author": "Christian Rémillard",
        "copyright": copyright_line(year),
        "license": "CC BY 4.0, https://creativecommons.org/licenses/by/4.0/",
        "credit": "Écluse 21, modèle 3D par Christian Rémillard (lock21.info), CC BY 4.0",
        "source": "https://lock21.info/modele/",
        "origin": {
            "latitude": LATITUDE,
            "longitude": LONGITUDE,
            "note": "the model's origin (0, 0, 0) is at these coordinates (WGS 84): the site anchor, centre of the zones",
        },
        "orientation": "glTF axes: +Y up, -Z north, +X east",
        "units": "metres",
        "vertical": "y = 0 is the lock's reference level; the lock lies about 55 ft (16.8 m) under water",
    }


def tag(path, year=None):
    """Rewrites the GLB's JSON chunk with asset.copyright and asset.extras (the binary chunk is untouched)"""
    data = open(path, "rb").read()
    magic, version, _ = struct.unpack_from("<4sII", data, 0)
    assert magic == b"glTF" and version == 2, f"{path}: not a glTF 2 binary"
    json_length, json_type = struct.unpack_from("<I4s", data, 12)
    assert json_type == b"JSON"
    gltf = json.loads(data[20:20 + json_length])
    rest = data[20 + json_length:]  # the BIN chunk, unchanged
    gltf["asset"]["copyright"] = copyright_line(year)
    gltf["asset"].setdefault("extras", {})["lock21"] = metadata(year)
    chunk = json.dumps(gltf, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    chunk += b" " * (-len(chunk) % 4)  # JSON chunk padded with spaces to 4 bytes
    out = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(chunk) + len(rest)) + struct.pack("<I4s", len(chunk), b"JSON")
    open(path, "wb").write(out + chunk + rest)


if __name__ == "__main__":
    p = argparse.ArgumentParser(prog="glb_metadata.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("glb", nargs="+", help="GLB files to tag in place")
    for path in p.parse_args().glb:
        tag(path)
        print(f"{path}: {copyright_line()}")
