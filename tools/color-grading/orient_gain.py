"""Éclaircit la texture d'un export .glb selon l'orientation de la surface (zone 4, Christian, 2026-11-02).

L'éclairage du visualiseur vient d'en haut: il laisse les surfaces verticales plus sombres que le plancher, et une
zone à la texture sombre le montre plus que les autres. Une correction sur les images ne peut pas en tenir compte (une
image ne sait pas ce qui est vertical): le gain est donc calculé ici, sur la texture finale, depuis le maillage préparé
de la zone (`O:/publishing/prepared/<zone>/<zone>.obj`, mêmes coordonnées de texture que l'export).

1. L'orientation de chaque sommet (|normale · haut|), lissée sur le maillage pour ne garder que la forme générale, sans
   le bruit des moules et des pierres, puis remplie dans une carte de la texture.
2. Le gain: `-V` sur ce qui est vertical, `-F` sur ce qui est horizontal, avec une transition progressive entre les deux.
   En lumière linéaire, la teinte gardée.
3. Un nouveau .glb: le même maillage, la nouvelle texture, les gains notés dans `asset.extras.orientGain`. Le .glb
   d'origine n'est pas touché, rien n'est écrasé, et un .glb déjà corrigé est refusé (les gains se multiplieraient).

Usage: python -I orient_gain.py -z zone-4 -s <export.glb> -o <nouvel export.glb> [-V 3] [-F 1.05] [-g <carte.png>]
"""
import argparse
import io
import json
import os
import struct
import time

p = argparse.ArgumentParser(prog="orient_gain.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("-z", "--zone", required=True, help="dossier préparé de la zone, ex. zone-4")
p.add_argument("-s", "--source", required=True, help="export .glb de la zone (celui de la propriété source du .blend)")
p.add_argument("-o", "--out", required=True, help="nouvel export .glb")
p.add_argument("-V", "--vertical", type=float, default=3.0, help="gain sur ce qui est vertical (défaut 3)")
p.add_argument("-F", "--floor", type=float, default=1.05, help="gain sur ce qui est horizontal (défaut 1,05)")
p.add_argument("-g", "--gain-map", help="écrit la carte du gain en PNG, pour la regarder")
p.add_argument("--prepared", default="O:/publishing/prepared", help="dossier des zones préparées")
a = p.parse_args()

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
from scipy.ndimage import gaussian_filter  # noqa: E402

Image.MAX_IMAGE_PIXELS = None
SMOOTH_PASSES, MAP_SIDE, MAP_SIGMA = 12, 3468, 1.5
started = time.time()


def log(text):
    print("[%4.0f s] %s" % (time.time() - started, text), flush=True)


def read_obj(path):
    vertices, uvs, faces = [], [], []
    with open(path) as f:
        for line in f:
            if line.startswith("v "):
                vertices.append(line[2:].split())
            elif line.startswith("vt "):
                uvs.append(line[3:].split()[:2])
            elif line.startswith("f "):
                parts = line[2:].split()
                if len(parts) != 3:
                    raise SystemExit("le maillage n'est pas en triangles: " + path)
                faces.append([int(x) - 1 for part in parts for x in part.split("/")[:2]])
    f = np.array(faces, dtype=np.int64)
    return np.array(vertices, dtype=np.float64), np.array(uvs, dtype=np.float64), f[:, [0, 2, 4]], f[:, [1, 3, 5]]


def orientation(v, fv):
    """Pour chaque sommet, |normale · haut| lissé sur le maillage. Haut: l'axe Y, celui des OBJ de Blender. La normale
    est prise en valeur absolue: l'enroulement des triangles de la photogrammétrie n'est pas cohérent."""
    n_face = np.cross(v[fv[:, 1]] - v[fv[:, 0]], v[fv[:, 2]] - v[fv[:, 0]])
    n = np.zeros_like(v)
    for i in range(3):
        np.add.at(n, fv[:, i], n_face)
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    up = np.abs(n[:, 1])
    count = np.zeros(len(v))
    for i in range(3):
        np.add.at(count, fv[:, i], 2)
    for _ in range(SMOOTH_PASSES):
        total = np.zeros(len(v))
        for i, j, k in ((0, 1, 2), (1, 2, 0), (2, 0, 1)):
            np.add.at(total, fv[:, i], up[fv[:, j]] + up[fv[:, k]])
        up = 0.5 * up + 0.5 * total / np.maximum(count, 1)
    return up


def fill_map(uv, values):
    """L'orientation remplie triangle par triangle dans une carte de la texture, un peu lissée; 0,5 hors des triangles."""
    total = np.zeros((MAP_SIDE, MAP_SIDE), dtype=np.float32)
    weight = np.zeros((MAP_SIDE, MAP_SIDE), dtype=np.float32)
    px = uv * MAP_SIDE
    px[:, :, 1] = (1 - uv[:, :, 1]) * MAP_SIDE
    for i in range(len(px)):
        (ax, ay), (bx, by), (cx, cy) = px[i]
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-9:
            continue
        x0, x1 = max(int(min(ax, bx, cx)), 0), min(int(max(ax, bx, cx)) + 1, MAP_SIDE - 1)
        y0, y1 = max(int(min(ay, by, cy)), 0), min(int(max(ay, by, cy)) + 1, MAP_SIDE - 1)
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        l0 = ((by - cy) * (gx + 0.5 - cx) + (cx - bx) * (gy + 0.5 - cy)) / d
        l1 = ((cy - ay) * (gx + 0.5 - cx) + (ax - cx) * (gy + 0.5 - cy)) / d
        l2 = 1 - l0 - l1
        m = (l0 >= -0.05) & (l1 >= -0.05) & (l2 >= -0.05)
        total[gy[m], gx[m]] += (l0[m] * values[i, 0] + l1[m] * values[i, 1] + l2[m] * values[i, 2]).astype(np.float32)
        weight[gy[m], gx[m]] += 1.0
    blur_total, blur_weight = gaussian_filter(total, MAP_SIGMA), gaussian_filter(weight, MAP_SIGMA)
    return np.where(blur_weight > 1e-4, blur_total / np.maximum(blur_weight, 1e-4), 0.5)


def read_glb(path):
    with open(path, "rb") as f:
        magic, _, _ = struct.unpack("<4sII", f.read(12))
        if magic != b"glTF":
            raise SystemExit("pas un .glb: " + path)
        json_length, _ = struct.unpack("<I4s", f.read(8))
        doc = json.loads(f.read(json_length))
        bin_length, _ = struct.unpack("<I4s", f.read(8))
        return doc, f.read(bin_length)


def write_glb(path, doc, chunks):
    """Les morceaux du binaire bout à bout, chacun aligné sur 4 octets. Dans un fichier temporaire, renommé à la fin."""
    total = sum((len(c) + 3) & ~3 for c in chunks)
    doc["buffers"][0]["byteLength"] = total
    doc_bytes = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    doc_bytes += b" " * (-len(doc_bytes) % 4)
    with open(path + ".tmp", "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(doc_bytes) + 8 + total))
        f.write(struct.pack("<I4s", len(doc_bytes), b"JSON"))
        f.write(doc_bytes)
        f.write(struct.pack("<I4s", total, b"BIN\0"))
        for c in chunks:
            f.write(c)
            f.write(b"\0" * (-len(c) % 4))
    os.rename(path + ".tmp", path)


if os.path.exists(a.out):
    raise SystemExit("existe déjà, rien n'est écrasé: " + a.out)
doc, binary = read_glb(a.source)
if "orientGain" in doc["asset"].get("extras", {}):
    raise SystemExit("ce .glb est déjà corrigé: " + a.source)
if len(doc.get("images", [])) != 1:
    raise SystemExit("le .glb doit avoir une seule image: %d" % len(doc.get("images", [])))

v, vt, fv, ft = read_obj(os.path.join(a.prepared, a.zone, a.zone + ".obj"))
log("maillage: %d sommets, %d faces" % (len(v), len(fv)))
up = orientation(v, fv)
up_map = fill_map(vt[ft], up[fv])
t = np.clip((up_map - 0.3) / 0.6, 0, 1)
gain_map = a.vertical + (a.floor - a.vertical) * (t * t * (3 - 2 * t))
log("gain: de %.2f à %.2f" % (gain_map.min(), gain_map.max()))
if a.gain_map:
    Image.fromarray(np.clip(gain_map / max(a.vertical, a.floor) * 255, 0, 255).astype(np.uint8)).resize((1024, 1024), Image.BOX).save(a.gain_map)

image_view = doc["images"][0]["bufferView"]
view = doc["bufferViews"][image_view]
start = view.get("byteOffset", 0)
image = Image.open(io.BytesIO(binary[start:start + view["byteLength"]])).convert("RGB")
side = image.size[0]
if image.size[0] != image.size[1]:
    raise SystemExit("texture non carrée: %s" % (image.size,))
pixels = np.asarray(image, dtype=np.uint8)
gain = np.asarray(Image.fromarray(gain_map.astype(np.float32), mode="F").resize((side, side), Image.BILINEAR), dtype=np.float32)
x = np.arange(256) / 255.0
to_linear = np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4).astype(np.float32)
out = np.empty_like(pixels)
clipped = 0
for row in range(0, side, 512):
    linear = to_linear[pixels[row:row + 512]] * gain[row:row + 512, :, None]
    clipped += int((linear.max(2) > 1).sum())
    c = np.clip(linear, 0, 1)
    out[row:row + 512] = (np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055) * 255 + 0.5).astype(np.uint8)
log("texture %d px, saturés: %.2f %%" % (side, clipped / side ** 2 * 100))
buffer = io.BytesIO()
Image.fromarray(out).save(buffer, "JPEG", quality=95, subsampling=0)
jpeg = buffer.getvalue()
doc["images"][0]["mimeType"] = "image/jpeg"
doc["asset"].setdefault("extras", {})["orientGain"] = {"vertical": a.vertical, "floor": a.floor}
log("jpeg: %.1f Mo (avant: %.1f Mo)" % (len(jpeg) / 1e6, view["byteLength"] / 1e6))

# Les octets de l'image remplacés: les autres vues gardent leur ordre, décalées de la différence
views = sorted(range(len(doc["bufferViews"])), key=lambda i: doc["bufferViews"][i].get("byteOffset", 0))
chunks, offset = [], 0
for i in views:
    entry = doc["bufferViews"][i]
    begin = entry.get("byteOffset", 0)
    content = jpeg if i == image_view else binary[begin:begin + entry["byteLength"]]
    entry["byteOffset"] = offset
    entry["byteLength"] = len(content)
    chunks.append(content)
    offset += (len(content) + 3) & ~3
write_glb(a.out, doc, chunks)
log("écrit: %s (%.0f Mo)" % (a.out, os.path.getsize(a.out) / 1e6))
