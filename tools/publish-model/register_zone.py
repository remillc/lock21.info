"""Recale un export .glb sur le mesh Blender d'une zone (ICP avec estimation d'échelle).

Calcule la transformation T qui amène les sommets de l'export (axes Blender,
unités de l'export) dans les coordonnées locales du mesh Blender, AVANT ses
modificateurs. Si l'export est dans le même repère, T est l'identité (à la
précision du recalage près).

Utilisable comme module (fonction `transform_for`, avec cache dans
transforms/<zone>.json) ou en ligne de commande.

Lecture seule: le .blend n'est jamais sauvegardé.

Usage:
    blender -b <fichier.blend> --factory-startup --python register_zone.py -- <zone> <export.glb> <sortie.json> [<autre export à vérifier.glb> ...]
"""
import itertools
import json
import os
import sys

import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(__file__))
from verify_sources import glb_positions  # noqa: E402

TRANSFORMS_DIR = os.path.join(os.path.dirname(__file__), "transforms")


def _tree(B):
    tree = KDTree(len(B))
    for i, v in enumerate(B):
        tree.insert(v, i)
    tree.balance()
    return tree


def _nearest(tree, P):
    res = [tree.find(p) for p in P]
    return np.array([r[1] for r in res]), np.array([r[2] for r in res])


def _umeyama(src, dst):
    ms, md = src.mean(0), dst.mean(0)
    xs, xd = src - ms, dst - md
    U, S, Vt = np.linalg.svd(xd.T @ xs / len(src))
    D = np.eye(3)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0:
        D[2, 2] = -1
    R = U @ D @ Vt
    s = (S * np.diag(D)).sum() / xs.var(0).sum()
    return s, R, md - s * R @ ms


def _icp(tree, B, P, s, R, t, iterations, keep=0.8):
    for _ in range(iterations):
        idx, d = _nearest(tree, s * P @ R.T + t)
        m = d <= np.quantile(d, keep)  # ignore les zones sans recouvrement
        s, R, t = _umeyama(P[m], B[idx[m]])
    _, d = _nearest(tree, s * P @ R.T + t)
    return s, R, t, d


def _rotations24():
    out = []
    for perm in itertools.permutations(range(3)):
        for signs in itertools.product((1, -1), repeat=3):
            M = np.zeros((3, 3))
            for i, (p, sg) in enumerate(zip(perm, signs)):
                M[i, p] = sg
            if np.linalg.det(M) > 0:
                out.append(M)
    return out


def _surface_residual(ob, points):
    me = ob.data
    me.calc_loop_triangles()
    tri = np.empty(len(me.loop_triangles) * 3, np.int64)
    me.loop_triangles.foreach_get("vertices", tri)
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    bvh = BVHTree.FromPolygons(co.reshape(-1, 3).tolist(), tri.reshape(-1, 3).tolist())
    d = np.array([bvh.find_nearest(Vector(p))[3] for p in points], dtype=float)
    return dict(median=float(np.median(d)), p80=float(np.quantile(d, 0.8)), p95=float(np.quantile(d, 0.95)))


def register(ob, src_path, extra=(), log=print):
    """Recale src_path sur le mesh (non modifié) de ob. Retourne un rapport avec la matrice."""
    rng = np.random.default_rng(0)
    B = np.array([v.co for v in ob.data.vertices])
    tree = _tree(B)
    P_all = glb_positions(src_path)
    P = P_all[rng.choice(len(P_all), min(30000, len(P_all)), replace=False)]
    coarse = P[:3000]
    cB, cP = np.median(B, 0), np.median(P, 0)

    # Starting points: the identity (an export of the same chunk is already in place: the usual case, and the 24
    # centred rotations can settle beside it, 0.8° off for zone 18 on 2026-10-21, cutting its walls), then the 24
    # axis rotations centred on the medians (an export in another frame)
    starts = [(np.eye(3), np.zeros(3))] + [(R0, cB - R0 @ cP) for R0 in _rotations24()]
    trials = []
    for R0, t0 in starts:
        s, R, t, d = _icp(tree, B, coarse, 1.0, R0, t0, 15)
        trials.append((float(np.median(d)), s, R, t))
    trials.sort(key=lambda x: x[0])
    log(f"recalage {ob.name}: meilleurs essais (médiane) {[round(x[0], 4) for x in trials[:3]]}")

    _, s, R, t = trials[0]
    s, R, t, d = _icp(tree, B, P, s, R, t, 40)
    T = np.eye(4)
    T[:3, :3] = s * R
    T[:3, 3] = t
    report = dict(
        zone=ob.name, source=src_path, source_mtime=os.path.getmtime(src_path), blender_vertices=len(B),
        scale=float(s),
        rotation_deg_from_identity=float(np.degrees(np.arccos(np.clip((np.trace(R) - 1) / 2, -1, 1)))),
        translation=t.tolist(), matrix_source_to_blender_local=T.tolist(),
        matrix_source_to_world=(np.array(ob.matrix_world) @ T).tolist(),
        residual=dict(median=float(np.median(d)), p80=float(np.quantile(d, 0.8)), p95=float(np.quantile(d, 0.95))),
        # Distance au point le plus proche de la SURFACE (et non du sommet le plus proche): ne dépend pas de la
        # densité du mesh Blender (zone 8: arêtes de 59 mm, 0,129 au sommet le plus proche)
        residual_surface=_surface_residual(ob, s * P @ R.T + t),
        checks=[],
    )
    for path in extra:
        Q = glb_positions(path)
        Q = Q[rng.choice(len(Q), min(20000, len(Q)), replace=False)]
        _, dd = _nearest(tree, s * Q @ R.T + t)
        report["checks"].append(dict(file=path, median=float(np.median(dd)), p80=float(np.quantile(dd, 0.8)),
                                     p95=float(np.quantile(dd, 0.95))))
    return report


def transform_for(ob, src_path, log=print):
    """Matrice export -> local Blender, depuis le cache si la source et le mesh n'ont pas changé."""
    path = os.path.join(TRANSFORMS_DIR, ob.name.replace(" ", "-") + ".json")
    if os.path.exists(path):
        cached = json.load(open(path, encoding="utf-8"))
        if (cached.get("source") == src_path and cached.get("source_mtime") == os.path.getmtime(src_path)
                and cached.get("blender_vertices") == len(ob.data.vertices) and "residual_surface" in cached):
            log(f"recalage {ob.name}: cache {path}")
            return cached
    report = register(ob, src_path, log=log)
    os.makedirs(TRANSFORMS_DIR, exist_ok=True)
    json.dump(report, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    log(f"recalage {ob.name}: échelle {report['scale']:.4f}, rotation {report['rotation_deg_from_identity']:.2f}°, "
        f"résidu médian {report['residual']['median']:.4f} (surface {report['residual_surface']['median']:.4f})")
    return report


if __name__ == "__main__":
    import bpy

    from cli import parser, script_args

    p = parser("register_zone.py", __doc__)
    p.add_argument("zone", help='objet de zone dans le .blend, ex. "zone 12"')
    p.add_argument("src", help="export .glb à recaler")
    p.add_argument("out", help="rapport JSON (matrices, échelle, résidus)")
    p.add_argument("extra", nargs="*", help="autres exports du même chunk à vérifier avec la même matrice")
    a = p.parse_args(script_args())
    zone, src_path, out_path, extra = a.zone, a.src, a.out, a.extra
    rep = register(bpy.data.objects[zone], src_path, extra)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    json.dump(rep, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(json.dumps({k: rep[k] for k in ("scale", "rotation_deg_from_identity", "translation", "residual", "checks")}, indent=1), flush=True)
