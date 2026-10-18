"""Vérifie qu'un export .glb (O:\\modeles) est dans le même repère que le mesh Blender d'une zone.

Pour chaque .glb, échantillonne des sommets et mesure la distance au sommet le
plus proche du mesh Blender (coordonnées locales de l'objet, avant sa
transformation). Même maillage: distances ~0. Même repère mais autre
résolution: distances de l'ordre de la taille des arêtes. Autre repère: grandes
distances.

Lecture seule: le .blend n'est jamais sauvegardé.

Usage:
    blender -b <fichier.blend> --factory-startup --python verify_sources.py -- <dossier des modèles> <sortie.json>
"""
import bpy
import glob
import json
import os
import re
import struct
import sys

import numpy as np
from mathutils.kdtree import KDTree

SAMPLES = 20000
rng = np.random.default_rng(0)


def glb_positions(path):
    with open(path, "rb") as f:
        f.read(12)
        clen, _ = struct.unpack("<I4s", f.read(8))
        g = json.loads(f.read(clen))
        blen, _ = struct.unpack("<I4s", f.read(8))
        bin_start = f.tell()
        chunks = []
        for m in g["meshes"]:
            for pr in m["primitives"]:
                a = g["accessors"][pr["attributes"]["POSITION"]]
                bv = g["bufferViews"][a["bufferView"]]
                stride = bv.get("byteStride", 12)
                f.seek(bin_start + bv.get("byteOffset", 0) + a.get("byteOffset", 0))
                raw = np.frombuffer(f.read(stride * a["count"]), np.uint8).reshape(a["count"], stride)
                chunks.append(raw[:, :12].copy().view(np.float32).reshape(-1, 3))
    p = np.concatenate(chunks).astype(np.float64)
    return np.column_stack([p[:, 0], -p[:, 2], p[:, 1]])  # glTF Y-up -> Blender Z-up


trees = {}


def tree_for(zone):
    if zone not in trees:
        ob = bpy.data.objects.get(zone)
        if ob is None or ob.type != 'MESH':
            trees[zone] = None
        else:
            me = ob.data
            t = KDTree(len(me.vertices))
            for v in me.vertices:
                t.insert(v.co, v.index)
            t.balance()
            trees[zone] = t
    return trees[zone]



def main(models_dir, out_path):
    results = []
    for path in sorted(glob.glob(os.path.join(models_dir, "zone-*", "*.glb"))):
        zone = "zone " + re.match(r"zone-(\d+)", os.path.basename(os.path.dirname(path))).group(1)
        t = tree_for(zone)
        r = dict(file=os.path.relpath(path, models_dir), zone=zone)
        if t is None:
            r["verdict"] = "zone absente de Blender"
        else:
            pts = glb_positions(path)
            sample = pts[rng.choice(len(pts), min(SAMPLES, len(pts)), replace=False)]
            d = np.array([t.find(p)[2] for p in sample])
            r.update(vertices=len(pts), median=float(np.median(d)), p90=float(np.percentile(d, 90)),
                     identical_pct=float((d < 1e-4).mean() * 100))
            if r["identical_pct"] > 90:
                r["verdict"] = "même maillage"
            elif r["median"] < 0.5:
                r["verdict"] = "même repère"
            else:
                r["verdict"] = "repère différent"
        results.append(r)
        print(f"{zone:8} {r['verdict']:24} median={r.get('median', 0):9.4f} p90={r.get('p90', 0):9.4f} "
              f"identiques={r.get('identical_pct', 0):5.1f}%  {r['file']}", flush=True)

    json.dump(results, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:]
    main(args[0], args[1])
