"""Recale un export .glb sur le mesh Blender d'une zone (ICP avec estimation d'échelle).

Calcule la transformation T qui amène les sommets de l'export (axes Blender,
unités de l'export) dans les coordonnées locales du mesh Blender. La même T
s'applique ensuite à tous les exports du même chunk Metashape (ex. la version
haute résolution).

Lecture seule: le .blend n'est jamais sauvegardé.

Usage:
    blender -b <fichier.blend> --factory-startup --python register_zone.py -- <zone> <export.glb> <sortie.json> [<autre export à vérifier.glb> ...]
"""
import bpy
import itertools
import json
import os
import sys

import numpy as np
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(__file__))
from verify_sources import glb_positions  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
zone, src_path, out_path, extra = args[0], args[1], args[2], args[3:]
rng = np.random.default_rng(0)

ob = bpy.data.objects[zone]
B = np.array([v.co for v in ob.data.vertices])
tree = KDTree(len(B))
for i, v in enumerate(B):
    tree.insert(v, i)
tree.balance()


def nearest(P):
    res = [tree.find(p) for p in P]
    return np.array([r[1] for r in res]), np.array([r[2] for r in res])


def umeyama(src, dst):
    ms, md = src.mean(0), dst.mean(0)
    xs, xd = src - ms, dst - md
    U, S, Vt = np.linalg.svd(xd.T @ xs / len(src))
    D = np.eye(3)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0:
        D[2, 2] = -1
    R = U @ D @ Vt
    s = (S * np.diag(D)).sum() / xs.var(0).sum()
    return s, R, md - s * R @ ms


def icp(P, s, R, t, iterations, keep=0.8):
    for _ in range(iterations):
        Q = s * P @ R.T + t
        idx, d = nearest(Q)
        m = d <= np.quantile(d, keep)  # ignore les zones sans recouvrement
        s, R, t = umeyama(P[m], B[idx[m]])
    idx, d = nearest(s * P @ R.T + t)
    return s, R, t, d


def rotations24():
    out = []
    for perm in itertools.permutations(range(3)):
        for signs in itertools.product((1, -1), repeat=3):
            M = np.zeros((3, 3))
            for i, (p, sg) in enumerate(zip(perm, signs)):
                M[i, p] = sg
            if np.linalg.det(M) > 0:
                out.append(M)
    return out


P_all = glb_positions(src_path)
P = P_all[rng.choice(len(P_all), 30000, replace=False)]
coarse = P[:3000]
cB, cP = np.median(B, 0), np.median(P, 0)

trials = []
for R0 in rotations24():
    t0 = cB - R0 @ cP
    s, R, t, d = icp(coarse, 1.0, R0, t0, 15)
    trials.append((float(np.median(d)), s, R, t))
trials.sort(key=lambda x: x[0])
print("meilleurs essais (médiane):", [round(x[0], 4) for x in trials[:3]], flush=True)

_, s, R, t = trials[0]
s, R, t, d = icp(P, s, R, t, 40)
T = np.eye(4)
T[:3, :3] = s * R
T[:3, 3] = t

report = dict(
    zone=zone, source=src_path, scale=float(s),
    rotation_deg_from_identity=float(np.degrees(np.arccos(np.clip((np.trace(R) - 1) / 2, -1, 1)))),
    translation=t.tolist(), matrix_source_to_blender_local=T.tolist(),
    matrix_source_to_world=(np.array(ob.matrix_world) @ T).tolist(),
    residual=dict(median=float(np.median(d)), p80=float(np.quantile(d, 0.8)), p95=float(np.quantile(d, 0.95))),
    checks=[],
)
for path in extra:
    Q = glb_positions(path)
    Q = Q[rng.choice(len(Q), 20000, replace=False)]
    _, dd = nearest(s * Q @ R.T + t)
    report["checks"].append(dict(file=path, median=float(np.median(dd)), p80=float(np.quantile(dd, 0.8)),
                                 p95=float(np.quantile(dd, 0.95))))

os.makedirs(os.path.dirname(out_path), exist_ok=True)
json.dump(report, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(json.dumps({k: report[k] for k in ("scale", "rotation_deg_from_identity", "translation", "residual", "checks")}, indent=1), flush=True)
